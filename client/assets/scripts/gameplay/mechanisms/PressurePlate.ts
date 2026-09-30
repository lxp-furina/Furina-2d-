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

/** 只有指定形态（默认冰）站上去才会被压下。 */
@ccclass
export default class PressurePlate extends cc.Component implements IPlayerTrigger {
    requiredForm: PlayerForm = PlayerForm.Ice;
    /** 为 true 时压下一次后保持压下状态 */
    latch = true;
    width = 32;

    private occupant: IPlayer = null;
    private occupantCount = 0;
    private _pressed = false;

    get pressed(): boolean {
        return this._pressed;
    }

    onLoad(): void {
        this.redraw();
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

    update(): void {
        const shouldPress = !!this.occupant && this.occupant.form === this.requiredForm;
        if (shouldPress && !this._pressed) {
            this._pressed = true;
            this.redraw();
            this.node.emit(PlateEvent.Pressed, this);
        } else if (!shouldPress && this._pressed && !this.latch) {
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
