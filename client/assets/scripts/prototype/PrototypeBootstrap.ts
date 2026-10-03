import { GameAction, InputState } from '../core/input/InputState';
import KeyboardInput from '../core/input/KeyboardInput';
import CameraFollow from '../gameplay/camera/CameraFollow';
import LevelBuilder from '../gameplay/level/LevelBuilder';
import { PlateEvent } from '../gameplay/mechanisms/PressurePlate';
import { FORM_CONFIGS, PlayerForm } from '../gameplay/player/FormConfig';
import PlayerController from '../gameplay/player/PlayerController';
import { PlayerEvent } from '../gameplay/player/PlayerTypes';
import { PROTOTYPE_LEVEL } from './PrototypeLevel';

const { ccclass } = cc._decorator;

const WORLD_GRAVITY = -1800;
const BACKGROUND_COLOR = cc.color(28, 30, 40);
const RESTART_DELAY_ON_DEATH = 0.8;
const RESTART_DELAY_ON_WIN = 2;

/**
 * 灰盒原型入口：挂在 Prototype 场景的 Canvas 上即可，
 * 关卡、玩家、镜头和 HUD 全部由代码生成。
 */
@ccclass
export default class PrototypeBootstrap extends cc.Component {
    private player: PlayerController = null;
    private hudLabel: cc.Label = null;
    private messageLabel: cc.Label = null;
    private restarting = false;

    onLoad(): void {
        InputState.reset();
        KeyboardInput.attach();

        const physics = cc.director.getPhysicsManager();
        physics.enabled = true;
        physics.gravity = cc.v2(0, WORLD_GRAVITY);
        physics.debugDrawFlags = 0;

        const camera = this.getOrCreateCamera();
        camera.backgroundColor = BACKGROUND_COLOR;

        // 世界层放在 Canvas 原点，关卡左下角即世界层原点
        const world = new cc.Node('World');
        this.node.addChild(world);

        const level = LevelBuilder.build(PROTOTYPE_LEVEL, world);

        // 原型阶段规则：任意压力板压下时打开所有门，全部弹起时关上
        const refreshDoors = () => {
            const anyPressed = level.plates.some((plate) => plate.pressed);
            level.doors.forEach((door) => (anyPressed ? door.open() : door.close()));
        };
        level.plates.forEach((plate) => {
            plate.node.on(PlateEvent.Pressed, refreshDoors);
            plate.node.on(PlateEvent.Released, refreshDoors);
        });

        this.player = PlayerController.create(world, level.spawnPosition);
        this.player.node.zIndex = 10;
        this.player.node.on(PlayerEvent.Died, () => this.showMessageAndRestart('蒸发了…', RESTART_DELAY_ON_DEATH));
        this.player.node.on(PlayerEvent.Won, () => this.showMessageAndRestart('通关！', RESTART_DELAY_ON_WIN));

        const follow = camera.node.addComponent(CameraFollow);
        follow.target = this.player.node;
        follow.bounds = cc.rect(0, 0, level.widthPx, level.heightPx);
        follow.snap();

        this.createHud(camera.node);
    }

    onDestroy(): void {
        KeyboardInput.detach();
    }

    update(): void {
        if (InputState.consumePressed(GameAction.Restart)) {
            this.restart();
            return;
        }
        if (InputState.consumePressed(GameAction.ToggleDebug)) {
            const physics = cc.director.getPhysicsManager();
            physics.debugDrawFlags = physics.debugDrawFlags ? 0 : cc.PhysicsManager.DrawBits.e_shapeBit;
        }
        this.refreshHud();
    }

    private getOrCreateCamera(): cc.Camera {
        const existing = this.node.getComponentInChildren(cc.Camera);
        if (existing) {
            return existing;
        }
        const node = new cc.Node('Main Camera');
        this.node.addChild(node);
        return node.addComponent(cc.Camera);
    }

    /** HUD 挂在相机节点下，随镜头移动，始终停留在屏幕固定位置。 */
    private createHud(cameraNode: cc.Node): void {
        const view = cc.view.getVisibleSize();
        const hud = new cc.Node('HUD');
        hud.zIndex = 100;
        cameraNode.addChild(hud);

        const hudNode = new cc.Node('Info');
        hudNode.anchorX = 0;
        hudNode.anchorY = 1;
        hudNode.setPosition(-view.width / 2 + 16, view.height / 2 - 12);
        this.hudLabel = hudNode.addComponent(cc.Label);
        this.hudLabel.fontSize = 20;
        this.hudLabel.lineHeight = 28;
        this.hudLabel.horizontalAlign = cc.Label.HorizontalAlign.LEFT;
        hud.addChild(hudNode);

        const messageNode = new cc.Node('Message');
        this.messageLabel = messageNode.addComponent(cc.Label);
        this.messageLabel.fontSize = 56;
        this.messageLabel.lineHeight = 64;
        messageNode.active = false;
        hud.addChild(messageNode);
    }

    private refreshHud(): void {
        if (!this.player || !this.hudLabel) {
            return;
        }
        const form = this.player.form;
        const lines = [`形态：${FORM_CONFIGS[form].name}    [L] 切换   [1][2][3] 直接选择 水/冰/蒸汽`];
        if (form === PlayerForm.Steam) {
            lines.push(`蒸汽剩余：${this.player.steamTimeLeft.toFixed(1)}s`);
        }
        lines.push('[A/D] 移动   [空格/W/K] 跳跃   [J] 技能（冰：留下冰雕，空中按住 S 为下砸）');
        lines.push('[R] 重来   [B] 显示碰撞框');
        this.hudLabel.string = lines.join('\n');
    }

    private showMessageAndRestart(text: string, delay: number): void {
        this.messageLabel.string = text;
        this.messageLabel.node.active = true;
        this.scheduleOnce(() => this.restart(), delay);
    }

    private restart(): void {
        if (this.restarting) {
            return;
        }
        this.restarting = true;
        cc.director.loadScene(cc.director.getScene().name);
    }
}
