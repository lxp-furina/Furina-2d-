import { PlayerForm } from '../player/FormConfig';
import { IPlayer, IPlayerTrigger } from '../player/PlayerTypes';
import { ensureGraphics, fillRect } from '../../utils/Draw';

const { ccclass } = cc._decorator;

export const PlateEvent = {
    Pressed: 'plate-pressed',
    Released: 'plate-released',
};

const PLATE_COLOR = cc.color(230, 170, 60);
const PLATE_PRESSED_COLOR = cc.color(120, 200, 90);
/** 重物离开后延迟弹起的时间，避免玩家留下冰雕的瞬间（接触还没建立）压力板闪一下 */
const RELEASE_DELAY = 0.1;

/** 指定形态（默认冰）的玩家或冰雕等重物在上面时被压下。 */
@ccclass
export default class PressurePlate extends cc.Component implements IPlayerTrigger {
    requiredForm: PlayerForm = PlayerForm.Ice;
    /** 为 true 时压下一次后保持压下状态 */
    latch = false;
    width = 32;

    private occupant: IPlayer = null;
    private occupantCount = 0;
    private weightCount = 0;
    private releaseTimer = 0;
    private _pressed = false;

    get pressed(): boolean {
        return this._pressed;
    }

    onLoad(): void {
        this.redraw();
    }

    /** 非玩家的重物（冰雕）进入时调用，必须与 removeWeight 成对调用。 */
    addWeight(): void {
        this.weightCount++;
    }

    removeWeight(): void {
        this.weightCount = Math.max(0, this.weightCount - 1);
    }

    onPlayerEnter(player: IPlayer): void {
        this.occupant = player;
        this.occupantCount++;
    }

    onPlayerExit(player: IPlayer): void {
        this.occupantCount = Math.max(0, this.occupantCount - 1);
        if (this.occupantCount === 0) {
            this.occupant = null;
        }
    }

    update(dt: number): void {
        const playerPresses = !!this.occupant && this.occupant.form === this.requiredForm;
        const shouldPress = playerPresses || this.weightCount > 0;
        if (shouldPress) {
            this.releaseTimer = RELEASE_DELAY;
        } else {
            this.releaseTimer -= dt;
        }

        if (shouldPress && !this._pressed) {
            this._pressed = true;
            this.redraw();
            this.node.emit(PlateEvent.Pressed, this);
        } else if (!shouldPress && this._pressed && !this.latch && this.releaseTimer <= 0) {
            this._pressed = false;
            this.redraw();
            this.node.emit(PlateEvent.Released, this);
        }
    }

    private redraw(): void {
        const g = ensureGraphics(this.node);
        g.clear();
        const height = this._pressed ? 4 : 10;
        const tileBottom = -this.node.height / 2;
        fillRect(g, this.width, height, this._pressed ? PLATE_PRESSED_COLOR : PLATE_COLOR, 2, tileBottom + height / 2);
    }
}
