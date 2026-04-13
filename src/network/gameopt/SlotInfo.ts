export enum SlotType {
    Closed = 0,
    Open = 1,
    OpenObserver = 2,
    Player = 3,
    Ai = 4
}
export interface SlotInfo {
    type: SlotType;
    name?: string;
    difficulty?: number;
    customBotId?: string;
}
export interface PingInfo {
    playerName: string;
    ping: number;
}
