import { PlayerForm } from './FormConfig';

export enum ZoneKind {
    Wind = 'wind',
    Cold = 'cold',
    Spike = 'spike',
    Goal = 'goal',
}

export const PlayerEvent = {
    Died: 'player-died',
    Won: 'player-won',
    FormChanged: 'player-form-changed',
    FormRejected: 'player-form-rejected',
};

/** 机关只通过这个接口了解玩家，避免机关和 PlayerController 互相引用。 */
export interface IPlayer {
    readonly form: PlayerForm;
    enterZone(kind: ZoneKind): void;
    exitZone(kind: ZoneKind): void;
}

/** 挂在机关节点上、需要感知玩家进出的组件实现此接口。 */
export interface IPlayerTrigger {
    onPlayerEnter(player: IPlayer): void;
    onPlayerExit(player: IPlayer): void;
}

export function getPlayerTriggers(node: cc.Node): IPlayerTrigger[] {
    const triggers: IPlayerTrigger[] = [];
    node.getComponents(cc.Component).forEach((comp) => {
        const candidate = comp as any;
        if (typeof candidate.onPlayerEnter === 'function' && typeof candidate.onPlayerExit === 'function') {
            triggers.push(candidate as IPlayerTrigger);
        }
    });
    return triggers;
}
