import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
export class TauntHandler {
    private lastTauntTimeByPlayer = new Map<string, number>();
    private disposables = new CompositeDisposable();
    constructor(private gservCon: any, private localPlayer: any, private game: any, private replayRecorder: any, private tauntsEnabled: any, private tauntPlayback: any, private mutedPlayers: Set<string>) { }
    init(): void {
        this.gservCon.onTaunt.subscribe(this.handleMessage);
        this.disposables.add(() => this.gservCon.onTaunt.unsubscribe(this.handleMessage));
    }
    private handleMessage = (message: any): void => {
        if (!this.tauntsEnabled.value) {
            return;
        }
        const player = this.game.getPlayerByName(message.from);
        if (!player.country) {
            return;
        }
        if (this.mutedPlayers.has(player.name)) {
            return;
        }
        if (this.checkAndUpdateLastTauntTime(player.name)) {
            this.recordReplayEvent(player, message.tauntNo);
            this.tauntPlayback
                .playTaunt(player, message.tauntNo)
                .catch((error: any) => console.error(error));
        }
    };
    sendTaunt(tauntNumber: number): void {
        if (!this.checkAndUpdateLastTauntTime(this.localPlayer.name)) {
            return;
        }
        if (!this.gservCon.isOpen()) {
            return;
        }
        this.gservCon.sendTaunt(tauntNumber);
        this.recordReplayEvent(this.localPlayer, tauntNumber);
        this.tauntPlayback
            .playTaunt(this.localPlayer, tauntNumber)
            .catch((error: any) => console.error(error));
    }
    private checkAndUpdateLastTauntTime(playerName: string): boolean {
        const currentTime = Date.now();
        const lastTauntTime = this.lastTauntTimeByPlayer.get(playerName);
        if (lastTauntTime && currentTime - lastTauntTime <= 5000) {
            return false;
        }
        this.lastTauntTimeByPlayer.set(playerName, currentTime);
        return true;
    }
    private recordReplayEvent(player: any, tauntNumber: number): void {
        this.replayRecorder.recordTaunt(this.game.currentTick, player.name, tauntNumber);
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
