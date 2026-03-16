import { TimerExpireEvent } from './event/TimerExpireEvent';
import { GameSpeed } from './GameSpeed';
export class CountdownTimer {
    private ticks: number = 0;
    private running: boolean = false;
    getSeconds(): number {
        return Math.floor(this.ticks / GameSpeed.BASE_TICKS_PER_SECOND);
    }
    setSeconds(seconds: number): void {
        this.ticks = Math.max(0, Math.floor(GameSpeed.BASE_TICKS_PER_SECOND * seconds));
    }
    addSeconds(seconds: number): void {
        this.ticks = Math.max(0, this.ticks + Math.floor(GameSpeed.BASE_TICKS_PER_SECOND * seconds));
    }
    start(): void {
        this.running = true;
    }
    stop(): void {
        this.running = false;
    }
    isRunning(): boolean {
        return this.running;
    }
    update(game: {
        events: {
            dispatch: (event: TimerExpireEvent) => void;
        };
    }): void {
        if (this.running) {
            if (this.ticks > 0) {
                this.ticks--;
            }
            else {
                this.running = false;
                game.events.dispatch(new TimerExpireEvent(this));
            }
        }
    }
}
