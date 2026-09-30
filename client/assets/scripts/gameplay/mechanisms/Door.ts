const { ccclass } = cc._decorator;

@ccclass
export default class Door extends cc.Component {
    private _isOpen = false;

    get isOpen(): boolean {
        return this._isOpen;
    }

    open(): void {
        if (this._isOpen) {
            return;
        }
        this._isOpen = true;
        cc.Tween.stopAllByTarget(this.node);
        cc.tween(this.node)
            .to(0.25, { opacity: 0 })
            .call(() => {
                this.node.active = false;
            })
            .start();
    }

    close(): void {
        if (!this._isOpen) {
            return;
        }
        this._isOpen = false;
        cc.Tween.stopAllByTarget(this.node);
        this.node.active = true;
        this.node.opacity = 255;
    }
}
