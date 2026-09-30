import { GameAction, InputState } from '../../core/input/InputState';
import PassThrough from '../mechanisms/PassThrough';
import { FORM_CONFIGS, FORM_CYCLE, PlayerForm, PlayerTuning } from './FormConfig';
import { getPlayerTriggers, IPlayer, PlayerEvent, ZoneKind } from './PlayerTypes';
import { ensureGraphics, fillRect, strokeRect } from '../../utils/Draw';

const { ccclass } = cc._decorator;

const PLAYER_SIZE = 32;
const GROUND_PROBE_INSET = 3;
const GROUND_PROBE_DEPTH = 4;

function moveTowards(current: number, target: number, maxDelta: number): number {
    if (Math.abs(target - current) <= maxDelta) {
        return target;
    }
    return current + Math.sign(target - current) * maxDelta;
}

/**
 * 玩家控制：输入 -> 形态 -> 移动。
 * 刚体不受物理重力影响（gravityScale = 0），速度每帧由这里计算后写入，
 * Box2D 只负责碰撞，这样手感完全可控。
 */
@ccclass
export default class PlayerController extends cc.Component implements IPlayer {
    static create(parent: cc.Node, position: cc.Vec2): PlayerController {
        const node = new cc.Node('Player');
        node.setPosition(position);
        node.setContentSize(PLAYER_SIZE, PLAYER_SIZE);

        const body = node.addComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Dynamic;
        body.fixedRotation = true;
        body.gravityScale = 0;
        body.allowSleep = false;
        body.enabledContactListener = true;

        const collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(PLAYER_SIZE, PLAYER_SIZE);
        collider.friction = 0;
        collider.restitution = 0;

        // 缩放动画只作用在子节点上，避免缩放带物理的节点导致碰撞体重建
        const visual = new cc.Node('Visual');
        node.addChild(visual);

        const player = node.addComponent(PlayerController);
        parent.addChild(node);
        return player;
    }

    private _form: PlayerForm = PlayerForm.Water;
    private body: cc.RigidBody = null;
    private visual: cc.Node = null;
    private graphics: cc.Graphics = null;

    private grounded = false;
    private coyoteTimer = 0;
    private jumpBufferTimer = 0;
    private isJumping = false;
    private steamTimer = 0;
    private facing = 1;
    private finished = false;
    private zoneCounts: { [kind: string]: number } = {};

    get form(): PlayerForm {
        return this._form;
    }

    get steamTimeLeft(): number {
        return this._form === PlayerForm.Steam ? Math.max(0, this.steamTimer) : 0;
    }

    get isGrounded(): boolean {
        return this.grounded;
    }

    onLoad(): void {
        this.body = this.getComponent(cc.RigidBody);
        this.visual = this.node.getChildByName('Visual');
        this.graphics = ensureGraphics(this.visual);
        this.redraw();
    }

    // ---------- IPlayer ----------

    enterZone(kind: ZoneKind): void {
        this.zoneCounts[kind] = (this.zoneCounts[kind] || 0) + 1;
    }

    exitZone(kind: ZoneKind): void {
        this.zoneCounts[kind] = Math.max(0, (this.zoneCounts[kind] || 0) - 1);
    }

    isInZone(kind: ZoneKind): boolean {
        return (this.zoneCounts[kind] || 0) > 0;
    }

    // ---------- 物理回调 ----------

    onBeginContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider): void {
        getPlayerTriggers(other.node).forEach((trigger) => trigger.onPlayerEnter(this));
    }

    onEndContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider): void {
        getPlayerTriggers(other.node).forEach((trigger) => trigger.onPlayerExit(this));
    }

    onPreSolve(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider): void {
        if (PassThrough.isPassable(other, this._form)) {
            contact.disabledOnce = true;
        }
    }

    // ---------- 形态 ----------

    /** 切换形态；如果新形态会卡在实体里（例如在栅栏中间变成冰），则拒绝切换。 */
    setForm(target: PlayerForm): boolean {
        if (target === this._form || this.finished) {
            return false;
        }
        if (this.overlapsSolidFor(target)) {
            this.playRejectFeedback();
            this.node.emit(PlayerEvent.FormRejected, target);
            return false;
        }

        this._form = target;
        this.isJumping = false;
        if (target === PlayerForm.Steam) {
            this.steamTimer = PlayerTuning.steamDuration;
        }
        this.redraw();
        this.playSwitchFeedback();
        this.node.emit(PlayerEvent.FormChanged, target);
        return true;
    }

    private handleFormInput(): void {
        if (InputState.consumePressed(GameAction.FormWater)) {
            this.setForm(PlayerForm.Water);
        }
        if (InputState.consumePressed(GameAction.FormIce)) {
            this.setForm(PlayerForm.Ice);
        }
        if (InputState.consumePressed(GameAction.FormSteam)) {
            this.setForm(PlayerForm.Steam);
        }
        if (InputState.consumePressed(GameAction.CycleForm)) {
            const index = FORM_CYCLE.indexOf(this._form);
            this.setForm(FORM_CYCLE[(index + 1) % FORM_CYCLE.length]);
        }
    }

    private overlapsSolidFor(form: PlayerForm): boolean {
        const center = this.node.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const shrink = 3;
        const size = PLAYER_SIZE - shrink * 2;
        const rect = cc.rect(center.x - size / 2, center.y - size / 2, size, size);
        const colliders = cc.director.getPhysicsManager().testAABB(rect);
        return colliders.some((collider) => {
            return collider.node !== this.node && !collider.sensor && !PassThrough.isPassable(collider, form);
        });
    }

    // ---------- 每帧逻辑 ----------

    update(dt: number): void {
        if (this.finished) {
            return;
        }
        this.handleFormInput();
        this.applyZoneEffects();
        if (this.finished) {
            return;
        }
        this.updateSteamTimer(dt);
        this.updateMovement(dt);
        if (this.node.y < PlayerTuning.killY) {
            this.die();
        }
    }

    private applyZoneEffects(): void {
        if (this.isInZone(ZoneKind.Goal)) {
            this.win();
            return;
        }
        if (this.isInZone(ZoneKind.Spike) && this._form !== PlayerForm.Ice) {
            this.die();
            return;
        }
        if (this.isInZone(ZoneKind.Cold) && this._form === PlayerForm.Steam) {
            this.setForm(PlayerForm.Water);
        }
    }

    private updateSteamTimer(dt: number): void {
        if (this._form !== PlayerForm.Steam) {
            return;
        }
        this.steamTimer -= dt;
        if (this.steamTimer <= 0) {
            this.setForm(PlayerForm.Water);
        }
    }

    private updateMovement(dt: number): void {
        const cfg = FORM_CONFIGS[this._form];
        const velocity = this.body.linearVelocity;

        this.grounded = velocity.y <= 1 && this.checkGrounded();
        this.coyoteTimer = this.grounded ? PlayerTuning.coyoteTime : this.coyoteTimer - dt;
        if (InputState.consumePressed(GameAction.Jump)) {
            this.jumpBufferTimer = PlayerTuning.jumpBufferTime;
        } else {
            this.jumpBufferTimer -= dt;
        }

        // 水平
        const dir = (InputState.isHeld(GameAction.Right) ? 1 : 0) - (InputState.isHeld(GameAction.Left) ? 1 : 0);
        if (dir !== 0 && dir !== this.facing) {
            this.facing = dir;
            this.redraw();
        }
        const accel = dir !== 0
            ? (this.grounded ? cfg.groundAccel : cfg.airAccel)
            : (this.grounded ? cfg.groundDecel : cfg.airDecel);
        velocity.x = moveTowards(velocity.x, dir * cfg.moveSpeed, accel * dt);

        // 起跳
        if (cfg.canJump && this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
            velocity.y = cfg.jumpSpeed;
            this.jumpBufferTimer = 0;
            this.coyoteTimer = 0;
            this.isJumping = true;
        }
        if (this.isJumping && velocity.y > 0 && !InputState.isHeld(GameAction.Jump)) {
            velocity.y *= cfg.jumpCutMultiplier;
            this.isJumping = false;
        }
        if (velocity.y <= 0) {
            this.isJumping = false;
        }

        // 竖直
        let gravity = cfg.gravity;
        let maxRise = cfg.maxRiseSpeed;
        if (this._form === PlayerForm.Steam && this.isInZone(ZoneKind.Wind)) {
            gravity += PlayerTuning.windAccel;
            maxRise = PlayerTuning.windMaxRiseSpeed;
        }
        velocity.y += gravity * dt;
        if (velocity.y > maxRise) {
            velocity.y = Math.max(maxRise, velocity.y - PlayerTuning.riseSettleRate * dt);
        }
        velocity.y = Math.max(velocity.y, -cfg.maxFallSpeed);

        this.body.linearVelocity = velocity;
    }

    /** 从脚底两个角向下发射短射线检测地面，忽略传感器和当前形态可穿过的物体。 */
    private checkGrounded(): boolean {
        const physics = cc.director.getPhysicsManager();
        const center = this.node.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const half = PLAYER_SIZE / 2;
        const startY = center.y - half + 2;
        const endY = center.y - half - GROUND_PROBE_DEPTH;
        const probeXs = [center.x - half + GROUND_PROBE_INSET, center.x + half - GROUND_PROBE_INSET];

        return probeXs.some((x) => {
            const results = physics.rayCast(cc.v2(x, startY), cc.v2(x, endY), cc.RayCastType.All);
            return results.some((result) => {
                const collider = result.collider;
                return collider.node !== this.node && !collider.sensor && !PassThrough.isPassable(collider, this._form);
            });
        });
    }

    // ---------- 结束 ----------

    private die(): void {
        this.finish(PlayerEvent.Died);
        cc.tween(this.visual).to(0.25, { scale: 0, opacity: 0 }).start();
    }

    private win(): void {
        this.finish(PlayerEvent.Won);
        cc.tween(this.visual).to(0.15, { scale: 1.3 }).to(0.15, { scale: 1 }).start();
    }

    private finish(eventName: string): void {
        this.finished = true;
        this.body.linearVelocity = cc.Vec2.ZERO;
        this.node.emit(eventName);
    }

    // ---------- 表现 ----------

    private redraw(): void {
        const g = this.graphics;
        const cfg = FORM_CONFIGS[this._form];
        g.clear();

        switch (this._form) {
            case PlayerForm.Water:
                fillRect(g, PLAYER_SIZE, PLAYER_SIZE, cfg.color, 10);
                break;
            case PlayerForm.Ice:
                fillRect(g, PLAYER_SIZE, PLAYER_SIZE, cfg.color, 2);
                strokeRect(g, PLAYER_SIZE - 2, PLAYER_SIZE - 2, cc.Color.WHITE, 2);
                break;
            case PlayerForm.Steam:
                g.fillColor = cfg.color;
                g.circle(0, 0, PLAYER_SIZE / 2);
                g.fill();
                break;
        }

        // 眼睛，表示朝向
        g.fillColor = cc.color(30, 40, 60);
        const eyeX = this.facing * 5;
        g.circle(eyeX - 4, 4, 2.5);
        g.circle(eyeX + 4, 4, 2.5);
        g.fill();
    }

    private playSwitchFeedback(): void {
        cc.Tween.stopAllByTarget(this.visual);
        this.visual.scale = 1;
        cc.tween(this.visual).to(0.06, { scale: 1.2 }).to(0.1, { scale: 1 }).start();
    }

    private playRejectFeedback(): void {
        cc.Tween.stopAllByTarget(this.visual);
        this.visual.x = 0;
        cc.tween(this.visual).to(0.04, { x: -3 }).to(0.04, { x: 3 }).to(0.04, { x: 0 }).start();
    }
}
