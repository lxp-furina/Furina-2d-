/**
 * 与具体输入设备无关的输入状态。
 * 键盘、虚拟摇杆等输入源只负责往这里写，游戏逻辑只从这里读。
 */
export enum GameAction {
    Left,
    Right,
    Down,
    Jump,
    Skill,
    CycleForm,
    FormWater,
    FormIce,
    FormSteam,
    Restart,
    ToggleDebug,
}

class InputStateImpl {
    private held: { [action: number]: boolean } = {};
    private pressed: { [action: number]: boolean } = {};

    press(action: GameAction): void {
        if (!this.held[action]) {
            this.pressed[action] = true;
        }
        this.held[action] = true;
    }

    release(action: GameAction): void {
        this.held[action] = false;
    }

    isHeld(action: GameAction): boolean {
        return !!this.held[action];
    }

    /** 读取并清除“本次按下”标记，每次按键只会返回一次 true。 */
    consumePressed(action: GameAction): boolean {
        const wasPressed = !!this.pressed[action];
        this.pressed[action] = false;
        return wasPressed;
    }

    reset(): void {
        this.held = {};
        this.pressed = {};
    }
}

export const InputState = new InputStateImpl();
