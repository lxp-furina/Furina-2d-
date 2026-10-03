export enum PlayerForm {
    Water,
    Ice,
    Steam,
}

export interface FormConfig {
    name: string;
    color: cc.Color;
    /** 最大水平速度（像素/秒） */
    moveSpeed: number;
    groundAccel: number;
    groundDecel: number;
    airAccel: number;
    airDecel: number;
    /** 竖直加速度，负数向下，正数向上（蒸汽） */
    gravity: number;
    maxFallSpeed: number;
    maxRiseSpeed: number;
    canJump: boolean;
    jumpSpeed: number;
    /** 跳跃途中松开跳跃键时，竖直速度乘以该系数，实现“小跳” */
    jumpCutMultiplier: number;
}

export const FORM_CONFIGS: { [form: number]: FormConfig } = {
    [PlayerForm.Water]: {
        name: '水',
        color: cc.color(64, 156, 255),
        moveSpeed: 260,
        groundAccel: 2400,
        groundDecel: 2400,
        airAccel: 1600,
        airDecel: 1200,
        gravity: -1800,
        maxFallSpeed: 900,
        maxRiseSpeed: 2000,
        canJump: true,
        jumpSpeed: 700,
        jumpCutMultiplier: 0.5,
    },
    [PlayerForm.Ice]: {
        name: '冰',
        color: cc.color(200, 240, 255),
        moveSpeed: 220,
        groundAccel: 700,
        groundDecel: 250,
        airAccel: 600,
        airDecel: 400,
        gravity: -2600,
        maxFallSpeed: 1200,
        maxRiseSpeed: 2000,
        canJump: true,
        jumpSpeed: 520,
        jumpCutMultiplier: 0.6,
    },
    [PlayerForm.Steam]: {
        name: '蒸汽',
        color: cc.color(190, 190, 200, 200),
        moveSpeed: 180,
        groundAccel: 900,
        groundDecel: 900,
        airAccel: 900,
        airDecel: 900,
        gravity: 250,
        maxFallSpeed: 200,
        maxRiseSpeed: 90,
        canJump: false,
        jumpSpeed: 0,
        jumpCutMultiplier: 1,
    },
};

export const FORM_CYCLE: PlayerForm[] = [PlayerForm.Water, PlayerForm.Ice, PlayerForm.Steam];

export const PlayerTuning = {
    /** 走出平台边缘后仍可起跳的时间 */
    coyoteTime: 0.1,
    /** 落地前提前按跳跃键，落地后仍会起跳的时间 */
    jumpBufferTime: 0.12,
    /** 蒸汽形态持续时间，到时自动凝结为水 */
    steamDuration: 3,
    /** 风口对蒸汽的向上加速度 */
    windAccel: 2600,
    windMaxRiseSpeed: 420,
    /** 上升速度超过上限时，每秒回落的速度 */
    riseSettleRate: 1200,
    /** 留下冰雕时，本体被放到冰雕顶上再往上多留的空隙（像素） */
    statuePopGap: 2,
    /** 空中造出的冰雕悬停多久后才开始下落（秒） */
    airStatueHangTime: 0.8,
    /** 下砸：起砸前在空中停顿的时间，以及急坠速度 */
    groundPoundHangTime: 0.25,
    groundPoundSpeed: 1400,
    /** 低于该高度视为掉出关卡 */
    killY: -200,
};
