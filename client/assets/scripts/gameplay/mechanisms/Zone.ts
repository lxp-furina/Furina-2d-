import { IPlayer, IPlayerTrigger, ZoneKind } from '../player/PlayerTypes';

const { ccclass } = cc._decorator;

/** 区域型机关（风口、冷气、尖刺、终点），效果由玩家根据自身形态结算。 */
@ccclass
export default class Zone extends cc.Component implements IPlayerTrigger {
    kind: ZoneKind = ZoneKind.Wind;

    onPlayerEnter(player: IPlayer): void {
        player.enterZone(this.kind);
    }

    onPlayerExit(player: IPlayer): void {
        player.exitZone(this.kind);
    }
}
