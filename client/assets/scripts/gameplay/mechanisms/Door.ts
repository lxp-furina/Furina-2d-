const { ccclass } = cc._decorator;

const OPEN_OPACITY = 50;
/** 检查门里是否有东西时，把检测框向内收缩一点，避免把贴着门站的物体算进去 */
const BLOCK_CHECK_INSET = 4;

/**
 * 门打开时碰撞体变成传感器（可以穿过），并半透明显示。
 * 关门时如果玩家或冰雕还在门里，会等它们离开后再关，避免把它们卡进实体。
 */
@ccclass
export default class Door extends cc.Component {
    private _isOpen = false;
    private closePending = false;

    get isOpen(): boolean {
        return this._isOpen;
    }

    open(): void {
        this.closePending = false;
        if (this._isOpen) {
            return;
        }
        this._isOpen = true;
        this.setSolid(false);
        cc.Tween.stopAllByTarget(this.node);
        cc.tween(this.node).to(0.25, { opacity: OPEN_OPACITY }).start();
    }

    close(): void {
        if (this._isOpen) {
            this.closePending = true;
        }
    }

    update(): void {
        if (!this.closePending || this.isBlocked()) {
            return;
        }
        this.closePending = false;
        this._isOpen = false;
        this.setSolid(true);
        cc.Tween.stopAllByTarget(this.node);
        cc.tween(this.node).to(0.1, { opacity: 255 }).start();
    }

    private get collider(): cc.PhysicsBoxCollider {
        return this.getComponent(cc.PhysicsBoxCollider);
    }

    private setSolid(solid: boolean): void {
        const collider = this.collider;
        collider.sensor = !solid;
        collider.apply();
    }

    private isBlocked(): boolean {
        const collider = this.collider;
        const center = this.node.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const width = collider.size.width - BLOCK_CHECK_INSET * 2;
        const height = collider.size.height - BLOCK_CHECK_INSET * 2;
        const rect = cc.rect(center.x - width / 2, center.y - height / 2, width, height);
        return cc.director.getPhysicsManager().testAABB(rect).some((other) => {
            return other !== collider && !other.sensor && other.body.type === cc.RigidBodyType.Dynamic;
        });
    }
}
