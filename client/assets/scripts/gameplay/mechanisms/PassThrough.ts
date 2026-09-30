import { PlayerForm } from '../player/FormConfig';

const { ccclass } = cc._decorator;

/** 标记一个实体碰撞体可以被某些形态穿过，例如栅栏只允许水通过。 */
@ccclass
export default class PassThrough extends cc.Component {
    passableForms: PlayerForm[] = [];

    canPass(form: PlayerForm): boolean {
        return this.passableForms.indexOf(form) >= 0;
    }

    static isPassable(collider: cc.PhysicsCollider, form: PlayerForm): boolean {
        const passThrough = collider.getComponent(PassThrough);
        return !!passThrough && passThrough.canPass(form);
    }
}
