import { EventDispatcher } from '@/util/event';

/**
 * Minimal turn manager aligned with original interfaces used across the codebase.
 * - Provides init(), getTurnMillis(), doGameTurn(), setRate(), setErrorState(), getErrorState()
 * - Exposes onActionsSent for awaiters (subscribeOnce used in GameScreen)
 * - setPassiveMode() is optional in callers; provided as a no-op here
 * - dispose() is a no-op placeholder
 */
export class GameTurnManager {
  private gameTurnMillis: number = 33; // ~30 FPS default
  private errorState = false;

  // Used by GameScreen to await send completion
  public readonly onActionsSent = new EventDispatcher<this, void>();

  constructor(
    private game?: { update(): void },
    private actionQueue?: { dequeueAll(): any[] }
  ) {}

  init(): void {
    // No-op: real implementation handled in networked managers in the original project
  }

  getTurnMillis(): number {
    return this.gameTurnMillis;
  }

  setRate(rate: number): void {
    // Keep simple: avoid zero/negatives; higher rate means more turns per second
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
    // No-op for single player
  }

  setErrorState(): void {
    this.errorState = true;
  }

  getErrorState(): boolean {
    return this.errorState;
  }

  dispose(): void {
    // No-op
  }
}
