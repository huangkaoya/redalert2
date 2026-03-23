export class TauntReplayEvent {
    constructor(public readonly payload: { playerId: number; tauntNo: number }) {}
}
