import { EventDispatcher } from '@/util/event';
export class GameTurnManager {
    private gameTurnMillis: number = 33;
    private errorState = false;
    public readonly onActionsSent = new EventDispatcher<this, void>();
    constructor(private game?: {
        update(): void;
    }, private actionQueue?: {
        dequeueAll(): any[];
    }) { }
    init(): void {
    }
    getTurnMillis(): number {
        return this.gameTurnMillis;
    }
    setRate(rate: number): void {
        const r = Number(rate) > 0 ? Number(rate) : 1;
        this.gameTurnMillis = Math.max(1, Math.floor(1000 / r));
    }
    doGameTurn(_timestamp: number): boolean {
        if (this.actionQueue) {
            const actions = this.actionQueue.dequeueAll();
            if (actions.length) {
                for (const action of actions) {
                    action.process?.();
                }
                this.onActionsSent.dispatch(this);
            }
        }
        this.game?.update();
        return true;
    }
    setPassiveMode(_passive: boolean): void {
    }
    setErrorState(): void {
        this.errorState = true;
    }
    getErrorState(): boolean {
        return this.errorState;
    }
    dispose(): void {
    }
}
