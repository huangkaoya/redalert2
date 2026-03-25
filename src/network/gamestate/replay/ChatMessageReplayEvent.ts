export class ChatMessageReplayEvent {
    constructor(public readonly payload: { playerId: number; message: string }) {}
}
