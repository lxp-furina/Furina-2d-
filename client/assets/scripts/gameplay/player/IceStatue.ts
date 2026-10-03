import PressurePlate from '../mechanisms/PressurePlate';
import { ensureGraphics, fillRect, strokeRect } from '../../utils/Draw';

const { ccclass } = cc._decorator;

const STATUE_COLOR = cc.color(170, 225, 255, 210);
const STATUE_EDGE_COLOR = cc.color(235, 250, 255);
/** 远大于玩家的密度，让玩家推不动冰雕 */
const STATUE_DENSITY = 1000;
/** 画在关卡图层之上、玩家之下 */
const STATUE_Z_INDEX = 5;

/**
 * 冰雕残影：可以压住压力板、当垫脚平台的实心冰块。
 * 必须是动态刚体，静态刚体和压力板（静态传感器）之间不会产生接触回调。
 */
@ccclass
export default class IceStatue extends cc.Component {
    /** hangTime > 0 时冰雕先在空中悬停这么久，再受重力下落 */
    static create(parent: cc.Node, position: cc.Vec2, size: number, hangTime = 0): IceStatue {
        const node = new cc.Node('IceStatue');
        node.zIndex = STATUE_Z_INDEX;
        node.setPosition(position);
        node.setContentSize(size, size);

        const body = node.addComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Dynamic;
        body.fixedRotation = true;
        body.allowSleep = false;
        body.enabledContactListener = true;
        body.gravityScale = hangTime > 0 ? 0 : 1;

        const collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(size, size);
        collider.density = STATUE_DENSITY;
        collider.friction = 0;
        collider.restitution = 0;

        const g = ensureGraphics(node);
        fillRect(g, size, size, STATUE_COLOR, 2);
        strokeRect(g, size - 2, size - 2, STATUE_EDGE_COLOR, 2);

        const statue = node.addComponent(IceStatue);
        statue.hangTimer = hangTime;
        parent.addChild(node);
        return statue;
    }

    private body: cc.RigidBody = null;
    private plates: PressurePlate[] = [];
    private shattered = false;
    private hangTimer = 0;

    onLoad(): void {
        this.body = this.getComponent(cc.RigidBody);
    }

    update(dt: number): void {
        const velocity = this.body.linearVelocity;
        if (this.hangTimer > 0) {
            this.hangTimer -= dt;
            velocity.y = 0;
            if (this.hangTimer <= 0) {
                this.body.gravityScale = 1;
            }
        }
        velocity.x = 0;
        this.body.linearVelocity = velocity;
    }

    onBeginContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider): void {
        const plate = other.getComponent(PressurePlate);
        if (plate && !this.shattered) {
            this.plates.push(plate);
            plate.addWeight();
        }
    }

    onEndContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider): void {
        const plate = other.getComponent(PressurePlate);
        const index = this.plates.indexOf(plate);
        if (plate && index >= 0) {
            this.plates.splice(index, 1);
            plate.removeWeight();
        }
    }

    /** 碎掉冰雕。先主动释放压力板，不依赖销毁时引擎是否回调 onEndContact。 */
    shatter(): void {
        if (this.shattered) {
            return;
        }
        this.shattered = true;
        this.plates.forEach((plate) => plate.removeWeight());
        this.plates = [];
        this.node.destroy();
    }
}
