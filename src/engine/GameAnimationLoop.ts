import { IrcConnection } from "@/network/IrcConnection";
import { recordGamePerformanceFrame } from "@/performance/PerformanceRuntime";
interface LocalPlayer {
    isObserver: boolean;
}
interface Renderer {
    getStats(): {
        begin(): void;
        end(): void;
    } | null;
    update(timestamp: number, interpolation: number): void;
    render(): void;
    flush(): void;
}
interface Sound {
    audioSystem: {
        setMuted(muted: boolean): void;
    };
}
interface GameTurnManager {
    getTurnMillis(): number;
    doGameTurn(timestamp: number): boolean;
    setErrorState(): void;
    setPassiveMode?(passive: boolean): void;
}
interface GameAnimationLoopOptions {
    skipFrames?: boolean;
    skipBudgetMillis?: number;
    onError?(error: Error, isRenderError?: boolean): void;
}
export class GameAnimationLoop {
    private localPlayer: LocalPlayer;
    private renderer: Renderer;
    private sound: Sound;
    private gameTurnMgr: GameTurnManager;
    private options: GameAnimationLoopOptions;
    private isStarted: boolean = false;
    private paused: boolean = false;
    private rendererErrorState: boolean = false;
    private turnMgrIsWaiting: boolean = false;
    private startTime: number | undefined;
    private lastGameFrame: number = 0;
    private lastGameTurnMillis: number | undefined;
    private rafId: number | undefined;
    private backgroundIntervalId: number | undefined;
    constructor(localPlayer: LocalPlayer, renderer: Renderer, sound: Sound, gameTurnMgr: GameTurnManager, options: GameAnimationLoopOptions = {}) {
        this.localPlayer = localPlayer;
        this.renderer = renderer;
        this.sound = sound;
        this.gameTurnMgr = gameTurnMgr;
        this.options = options;
    }
    private doBackgroundFrame = (timestamp: number): void => {
        if (this.isStarted && this.paused) {
            let deltaFrames = this.updateDeltaGameFrames(timestamp);
            if (this.turnMgrIsWaiting) {
                deltaFrames = 1;
            }
            while (deltaFrames > 0) {
                this.turnMgrIsWaiting = !this.tickGame(timestamp);
                deltaFrames--;
            }
        }
    };
    private doFrame = (timestamp: number): void => {
        if (this.isStarted && !this.paused) {
            recordGamePerformanceFrame(timestamp);
            let deltaFrames = this.updateDeltaGameFrames(timestamp);
            if (this.turnMgrIsWaiting || (!this.options.skipFrames && deltaFrames > 1)) {
                deltaFrames = 1;
            }
            const stats = this.renderer.getStats();
            if (stats) {
                stats.begin();
            }
            if (this.options.skipBudgetMillis) {
                let budget = this.options.skipBudgetMillis;
                while (deltaFrames > 0) {
                    const startTime = performance.now();
                    this.turnMgrIsWaiting = !this.tickGame(timestamp);
                    deltaFrames--;
                    const elapsed = performance.now() - startTime;
                    budget = Math.max(0, budget - elapsed);
                    if (budget <= 0) {
                        break;
                    }
                }
            }
            else {
                while (deltaFrames > 0) {
                    this.turnMgrIsWaiting = !this.tickGame(timestamp);
                    deltaFrames--;
                }
            }
            const turnMillis = this.gameTurnMgr.getTurnMillis();
            const interpolation = Math.max(0, (timestamp - (this.startTime! + this.lastGameFrame * turnMillis)) / turnMillis);
            this.updateRenderer(timestamp, interpolation);
            if (this.render()) {
                if (stats) {
                    stats.end();
                }
                this.rafId = requestAnimationFrame(this.doFrame);
            }
        }
    };
    private handleVisibilityChange = (): void => {
        const isHidden = document.hidden;
        if (this.paused !== isHidden) {
            if (this.localPlayer &&
                !this.localPlayer.isObserver &&
                this.paused) {
                this.doBackgroundFrame(performance.now());
            }
            this.paused = isHidden;
            if (!this.paused) {
                this.startTime = undefined;
                this.lastGameFrame = 0;
            }
            if (this.localPlayer && !this.localPlayer.isObserver) {
                try {
                    this.gameTurnMgr.setPassiveMode?.(this.paused);
                }
                catch (error) {
                    if (!(error instanceof IrcConnection.SocketError)) {
                        throw error;
                    }
                }
            }
            if (this.paused) {
                if (this.rafId) {
                    cancelAnimationFrame(this.rafId);
                    this.rafId = undefined;
                }
                this.backgroundIntervalId = setInterval(() => {
                    const timestamp = performance.now();
                    this.doBackgroundFrame(timestamp);
                }, 1000);
            }
            else {
                if (this.backgroundIntervalId) {
                    clearInterval(this.backgroundIntervalId);
                    this.backgroundIntervalId = undefined;
                }
                this.rafId = requestAnimationFrame(this.doFrame);
            }
            this.sound.audioSystem.setMuted(this.paused);
        }
    };
    start(): void {
        if (!this.isStarted) {
            this.isStarted = true;
            this.paused = false;
            this.startTime = undefined;
            this.lastGameFrame = 0;
            if (document.hidden) {
                this.handleVisibilityChange();
            }
            else {
                this.rafId = requestAnimationFrame(this.doFrame);
            }
            document.addEventListener("visibilitychange", this.handleVisibilityChange);
        }
    }
    private updateDeltaGameFrames(timestamp: number): number {
        const turnMillis = this.gameTurnMgr.getTurnMillis();
        const turnMillisChanged = turnMillis !== this.lastGameTurnMillis;
        this.lastGameTurnMillis = turnMillis;
        if (turnMillisChanged) {
            this.lastGameFrame = 0;
            this.startTime = timestamp;
        }
        let deltaFrames = 0;
        if (this.startTime) {
            const elapsed = timestamp - this.startTime;
            const currentFrame = Math.round(elapsed / turnMillis);
            deltaFrames = currentFrame - this.lastGameFrame;
            this.lastGameFrame = currentFrame;
        }
        else {
            this.startTime = timestamp;
        }
        return deltaFrames;
    }
    private tickGame(timestamp: number): boolean {
        if (!this.options.onError) {
            return this.gameTurnMgr.doGameTurn(timestamp);
        }
        try {
            return this.gameTurnMgr.doGameTurn(timestamp);
        }
        catch (error) {
            this.gameTurnMgr.setErrorState();
            this.options.onError(error as Error);
            return false;
        }
    }
    private updateRenderer(timestamp: number, interpolation: number): void {
        if (this.options.onError) {
            if (!this.rendererErrorState) {
                try {
                    this.renderer.update(timestamp, interpolation);
                }
                catch (error) {
                    this.gameTurnMgr.setErrorState();
                    this.rendererErrorState = true;
                    this.options.onError(error as Error);
                    return;
                }
            }
        }
        else {
            this.renderer.update(timestamp, interpolation);
        }
    }
    private render(): boolean {
        if (this.options.onError) {
            try {
                this.renderer.render();
            }
            catch (error) {
                this.gameTurnMgr.setErrorState();
                this.rendererErrorState = true;
                this.options.onError(error as Error, true);
                return false;
            }
        }
        else {
            this.renderer.render();
        }
        return true;
    }
    stop(): void {
        if (this.isStarted) {
            this.isStarted = false;
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = undefined;
            }
            if (this.backgroundIntervalId) {
                clearInterval(this.backgroundIntervalId);
                this.backgroundIntervalId = undefined;
            }
            document.removeEventListener("visibilitychange", this.handleVisibilityChange);
        }
    }
    destroy(): void {
        this.stop();
        this.renderer.flush();
    }
}
