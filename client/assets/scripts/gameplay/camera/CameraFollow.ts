const { ccclass } = cc._decorator;

/** 平滑跟随目标，并把镜头限制在关卡范围内。bounds 使用相机父节点的坐标系。 */
@ccclass
export default class CameraFollow extends cc.Component {
    target: cc.Node = null;
    bounds: cc.Rect = null;
    /** 越大跟得越紧 */
    smoothing = 8;

    snap(): void {
        if (this.target) {
            this.node.setPosition(this.getDesiredPosition());
        }
    }

    lateUpdate(dt: number): void {
        if (!this.target) {
            return;
        }
        const desired = this.getDesiredPosition();
        const t = 1 - Math.exp(-this.smoothing * dt);
        this.node.setPosition(
            this.node.x + (desired.x - this.node.x) * t,
            this.node.y + (desired.y - this.node.y) * t,
        );
    }

    private getDesiredPosition(): cc.Vec2 {
        const worldPos = this.target.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const pos = this.node.parent.convertToNodeSpaceAR(worldPos);
        if (!this.bounds) {
            return pos;
        }
        const view = cc.view.getVisibleSize();
        return cc.v2(
            this.clampAxis(pos.x, this.bounds.xMin, this.bounds.xMax, view.width / 2),
            this.clampAxis(pos.y, this.bounds.yMin, this.bounds.yMax, view.height / 2),
        );
    }

    private clampAxis(value: number, min: number, max: number, halfView: number): number {
        if (max - min <= halfView * 2) {
            return (min + max) / 2;
        }
        return Math.min(Math.max(value, min + halfView), max - halfView);
    }
}
