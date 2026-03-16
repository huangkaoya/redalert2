import { Base64 } from "@/util/Base64";
export enum WolGameReportResult {
    Win = 0,
    Loss = 1,
    Draw = 2
}
export interface WolGameReportPlayer {
    name: string;
    resultType: WolGameReportResult;
    [key: string]: any;
}
export interface WolGameReportData {
    gameId: string;
    players: WolGameReportPlayer[];
    duration: number;
    [key: string]: any;
}
export class WolGameReport {
    public gameId: string;
    public players: WolGameReportPlayer[];
    public duration: number;
    [key: string]: any;
    constructor(encoded: string) {
        const data: WolGameReportData = JSON.parse(Base64.decode(encoded));
        this.gameId = data.gameId;
        this.players = data.players;
        this.duration = data.duration;
        Object.assign(this, data);
    }
}
