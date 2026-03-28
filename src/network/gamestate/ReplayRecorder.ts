import { Replay, ReplayEventType } from './Replay';

export class ReplayRecorder {
    private checkpointInterval = 300; // ~20 seconds at 15 ticks/sec

    constructor(
        private readonly game: any,
        private readonly replay: Replay,
    ) {}

    recordActions(tick: number, actions: any[]): void {
        for (const action of actions) {
            let serialized: Uint8Array | undefined;
            try {
                serialized = action.serialize?.();
            }
            catch (error) {
                console.warn('[ReplayRecorder] Failed to serialize action for replay recording', {
                    tick,
                    actionType: action?.actionType,
                    action,
                    error,
                });
                continue;
            }
            if (!serialized || serialized.length === 0) {
                continue;
            }
            this.replay.actionRecords.push({
                tick,
                playerId: this.resolvePlayerIndex(action.player),
                actionType: action.actionType,
                data: serialized,
            });
        }

        // Periodic hash checkpoints
        if (tick > 0 && tick % this.checkpointInterval === 0 &&
            (this.replay.hashCheckpoints.length === 0 ||
             this.replay.hashCheckpoints[this.replay.hashCheckpoints.length - 1].tick !== tick)) {
            this.replay.hashCheckpoints.push({
                tick,
                hash: this.game.getHash(),
            });
        }
    }

    recordChatMessage(tick: number, playerName: string, message: string): void {
        const playerId = this.resolvePlayerId(playerName);
        this.replay.eventRecords.push({
            tick,
            type: ReplayEventType.Chat,
            playerId,
            payload: message,
        });
    }

    recordTaunt(tick: number, playerName: string, tauntNo: number): void {
        const playerId = this.resolvePlayerId(playerName);
        this.replay.eventRecords.push({
            tick,
            type: ReplayEventType.Taunt,
            playerId,
            payload: String(tauntNo),
        });
    }

    private resolvePlayerId(playerName: string): number {
        try {
            const player = this.game.getPlayerByName(playerName);
            return this.resolvePlayerIndex(player);
        } catch {
            return 0;
        }
    }

    private resolvePlayerIndex(player: any): number {
        if (!player) return 0;
        try {
            return this.game.getPlayerNumber(player) ?? 0;
        } catch {
            return 0;
        }
    }
}
