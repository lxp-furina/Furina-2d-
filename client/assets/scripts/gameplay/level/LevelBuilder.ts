import Door from '../mechanisms/Door';
import PassThrough from '../mechanisms/PassThrough';
import PressurePlate from '../mechanisms/PressurePlate';
import Zone from '../mechanisms/Zone';
import { PlayerForm } from '../player/FormConfig';
import { ZoneKind } from '../player/PlayerTypes';
import { ensureGraphics, fillRect } from '../../utils/Draw';

export const TILE_SIZE = 40;

/** 字符地图图例 */
export const Tile = {
    Empty: '.',
    Wall: '#',
    Fence: '|',
    Spike: 'x',
    Plate: 'P',
    Door: 'D',
    Wind: '^',
    Cold: '~',
    Spawn: 'S',
    Goal: 'G',
};

export interface LevelBuildResult {
    widthPx: number;
    heightPx: number;
    spawnPosition: cc.Vec2;
    plates: PressurePlate[];
    doors: Door[];
}

const Colors = {
    wall: cc.color(70, 76, 96),
    fence: cc.color(150, 150, 160),
    spike: cc.color(220, 70, 70),
    door: cc.color(140, 90, 50),
    wind: cc.color(160, 220, 255, 60),
    windArrow: cc.color(200, 240, 255, 140),
    cold: cc.color(120, 200, 255, 90),
    goal: cc.color(255, 215, 80),
};

interface StaticBoxOptions {
    width: number;
    height: number;
    sensor: boolean;
    /** 碰撞体尺寸，默认与节点相同 */
    colliderSize?: cc.Size;
    colliderOffset?: cc.Vec2;
}

/**
 * 把字符地图生成为节点：地图第 0 行是最上面一行，关卡左下角位于父节点原点。
 */
export default class LevelBuilder {
    static build(rawRows: string[], parent: cc.Node): LevelBuildResult {
        const cols = rawRows.reduce((max, row) => Math.max(max, row.length), 0);
        const rows = rawRows.map((row) => row + Tile.Empty.repeat(cols - row.length));
        const rowCount = rows.length;

        const zoneLayer = LevelBuilder.createLayer('Zones', parent, 0);
        const solidLayer = LevelBuilder.createLayer('Solids', parent, 1);

        const result: LevelBuildResult = {
            widthPx: cols * TILE_SIZE,
            heightPx: rowCount * TILE_SIZE,
            spawnPosition: cc.v2(TILE_SIZE * 1.5, TILE_SIZE * 1.5),
            plates: [],
            doors: [],
        };

        const cellCenter = (c: number, r: number) => cc.v2(c * TILE_SIZE + TILE_SIZE / 2, (rowCount - 1 - r) * TILE_SIZE + TILE_SIZE / 2);

        LevelBuilder.buildWalls(rows, cols, solidLayer);

        for (let r = 0; r < rowCount; r++) {
            for (let c = 0; c < cols; c++) {
                const ch = rows[r][c];
                const pos = cellCenter(c, r);
                switch (ch) {
                    case Tile.Spawn:
                        result.spawnPosition = pos;
                        break;
                    case Tile.Fence:
                        LevelBuilder.buildFence(solidLayer, pos);
                        break;
                    case Tile.Door:
                        result.doors.push(LevelBuilder.buildDoor(solidLayer, pos));
                        break;
                    case Tile.Plate:
                        result.plates.push(LevelBuilder.buildPlate(zoneLayer, pos));
                        break;
                    case Tile.Spike:
                        LevelBuilder.buildSpike(zoneLayer, pos);
                        break;
                    case Tile.Wind:
                        LevelBuilder.drawWindArrow(LevelBuilder.buildZone(zoneLayer, pos, ZoneKind.Wind, Colors.wind));
                        break;
                    case Tile.Cold:
                        LevelBuilder.buildZone(zoneLayer, pos, ZoneKind.Cold, Colors.cold);
                        break;
                    case Tile.Goal:
                        LevelBuilder.buildZone(zoneLayer, pos, ZoneKind.Goal, Colors.goal);
                        break;
                }
            }
        }

        return result;
    }

    private static createLayer(name: string, parent: cc.Node, zIndex: number): cc.Node {
        const layer = new cc.Node(name);
        layer.zIndex = zIndex;
        parent.addChild(layer);
        return layer;
    }

    /** 贪心合并相邻的墙格子为大矩形，减少碰撞体数量，也避免角色在格子接缝处被卡住。 */
    private static buildWalls(rows: string[], cols: number, parent: cc.Node): void {
        const rowCount = rows.length;
        const visited: boolean[][] = rows.map(() => new Array(cols).fill(false));
        const isFreeWall = (r: number, c: number) => rows[r][c] === Tile.Wall && !visited[r][c];

        for (let r = 0; r < rowCount; r++) {
            for (let c = 0; c < cols; c++) {
                if (!isFreeWall(r, c)) {
                    continue;
                }
                let w = 1;
                while (c + w < cols && isFreeWall(r, c + w)) {
                    w++;
                }
                let h = 1;
                while (r + h < rowCount) {
                    let fullRow = true;
                    for (let k = 0; k < w; k++) {
                        if (!isFreeWall(r + h, c + k)) {
                            fullRow = false;
                            break;
                        }
                    }
                    if (!fullRow) {
                        break;
                    }
                    h++;
                }
                for (let dr = 0; dr < h; dr++) {
                    for (let dc = 0; dc < w; dc++) {
                        visited[r + dr][c + dc] = true;
                    }
                }

                const width = w * TILE_SIZE;
                const height = h * TILE_SIZE;
                const x = c * TILE_SIZE + width / 2;
                const y = (rowCount - r - h) * TILE_SIZE + height / 2;
                const node = LevelBuilder.createStaticBox('Wall', parent, cc.v2(x, y), { width, height, sensor: false });
                fillRect(ensureGraphics(node), width, height, Colors.wall);
            }
        }
    }

    private static buildFence(parent: cc.Node, pos: cc.Vec2): void {
        const node = LevelBuilder.createStaticBox('Fence', parent, pos, { width: TILE_SIZE, height: TILE_SIZE, sensor: false });
        node.addComponent(PassThrough).passableForms = [PlayerForm.Water];

        const g = ensureGraphics(node);
        const barWidth = 4;
        const bars = 4;
        for (let i = 0; i < bars; i++) {
            const x = -TILE_SIZE / 2 + (TILE_SIZE / bars) * (i + 0.5);
            g.fillColor = Colors.fence;
            g.rect(x - barWidth / 2, -TILE_SIZE / 2, barWidth, TILE_SIZE);
            g.fill();
        }
    }

    private static buildDoor(parent: cc.Node, pos: cc.Vec2): Door {
        const node = LevelBuilder.createStaticBox('Door', parent, pos, { width: TILE_SIZE, height: TILE_SIZE, sensor: false });
        fillRect(ensureGraphics(node), TILE_SIZE - 6, TILE_SIZE, Colors.door, 3);
        return node.addComponent(Door);
    }

    private static buildPlate(parent: cc.Node, pos: cc.Vec2): PressurePlate {
        const sensorHeight = 12;
        const node = LevelBuilder.createStaticBox('Plate', parent, pos, {
            width: TILE_SIZE,
            height: TILE_SIZE,
            sensor: true,
            colliderSize: cc.size(TILE_SIZE - 8, sensorHeight),
            colliderOffset: cc.v2(0, -TILE_SIZE / 2 + sensorHeight / 2),
        });
        return node.addComponent(PressurePlate);
    }

    private static buildSpike(parent: cc.Node, pos: cc.Vec2): void {
        const spikeHeight = TILE_SIZE / 2;
        const node = LevelBuilder.createStaticBox('Spike', parent, pos, {
            width: TILE_SIZE,
            height: TILE_SIZE,
            sensor: true,
            colliderSize: cc.size(TILE_SIZE - 4, spikeHeight - 4),
            colliderOffset: cc.v2(0, -TILE_SIZE / 2 + (spikeHeight - 4) / 2),
        });
        node.addComponent(Zone).kind = ZoneKind.Spike;

        const g = ensureGraphics(node);
        g.fillColor = Colors.spike;
        const teeth = 3;
        const toothWidth = TILE_SIZE / teeth;
        const bottom = -TILE_SIZE / 2;
        for (let i = 0; i < teeth; i++) {
            const left = -TILE_SIZE / 2 + toothWidth * i;
            g.moveTo(left, bottom);
            g.lineTo(left + toothWidth / 2, bottom + spikeHeight);
            g.lineTo(left + toothWidth, bottom);
            g.close();
        }
        g.fill();
    }

    private static buildZone(parent: cc.Node, pos: cc.Vec2, kind: ZoneKind, color: cc.Color): cc.Node {
        const node = LevelBuilder.createStaticBox(`Zone_${kind}`, parent, pos, { width: TILE_SIZE, height: TILE_SIZE, sensor: true });
        node.addComponent(Zone).kind = kind;
        fillRect(ensureGraphics(node), TILE_SIZE, TILE_SIZE, color);
        return node;
    }

    private static drawWindArrow(node: cc.Node): void {
        const g = ensureGraphics(node);
        g.strokeColor = Colors.windArrow;
        g.lineWidth = 2;
        g.moveTo(0, -10);
        g.lineTo(0, 10);
        g.moveTo(-6, 4);
        g.lineTo(0, 10);
        g.lineTo(6, 4);
        g.stroke();
    }

    /** 先配置好刚体和碰撞体再加入场景，避免刚体以默认的动态类型被创建。 */
    private static createStaticBox(name: string, parent: cc.Node, pos: cc.Vec2, options: StaticBoxOptions): cc.Node {
        const node = new cc.Node(name);
        node.setPosition(pos);
        node.setContentSize(options.width, options.height);

        const body = node.addComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Static;

        const collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = options.colliderSize || cc.size(options.width, options.height);
        collider.offset = options.colliderOffset || cc.v2(0, 0);
        collider.sensor = options.sensor;
        collider.friction = 0;

        parent.addChild(node);
        return node;
    }
}
