import { GameAction, InputState } from './InputState';

const KEY = cc.macro.KEY;

// 主键盘区数字键 1/2/3，creator.d.ts 中没有声明
const DIGIT_1 = 49;
const DIGIT_2 = 50;
const DIGIT_3 = 51;

const KEY_BINDINGS: { [keyCode: number]: GameAction } = {};

function bind(action: GameAction, keyCodes: number[]): void {
    keyCodes.forEach((code) => {
        KEY_BINDINGS[code] = action;
    });
}

bind(GameAction.Left, [KEY.a, KEY.left]);
bind(GameAction.Right, [KEY.d, KEY.right]);
bind(GameAction.Jump, [KEY.space, KEY.w, KEY.up, KEY.k]);
bind(GameAction.CycleForm, [KEY.j]);
bind(GameAction.FormWater, [DIGIT_1, KEY.num1]);
bind(GameAction.FormIce, [DIGIT_2, KEY.num2]);
bind(GameAction.FormSteam, [DIGIT_3, KEY.num3]);
bind(GameAction.Restart, [KEY.r]);
bind(GameAction.ToggleDebug, [KEY.b]);

function onKeyDown(event: cc.Event.EventKeyboard): void {
    const action = KEY_BINDINGS[event.keyCode];
    if (action !== undefined) {
        InputState.press(action);
    }
}

function onKeyUp(event: cc.Event.EventKeyboard): void {
    const action = KEY_BINDINGS[event.keyCode];
    if (action !== undefined) {
        InputState.release(action);
    }
}

export default class KeyboardInput {
    static attach(): void {
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, onKeyDown);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, onKeyUp);
    }

    static detach(): void {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, onKeyDown);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, onKeyUp);
        InputState.reset();
    }
}
