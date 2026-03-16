import { IrcConnection } from '@/network/IrcConnection';
import { EventDispatcher } from '@/util/event';
export class PingMonitor {
    private _onNewSample = new EventDispatcher<PingMonitor, number>();
    private isDisposed = false;
    private pingTimeoutId?: number;
    get onNewSample() {
        return this._onNewSample.asEvent();
    }
    constructor(private gameTurnMgr: any, private gservCon: any, private avgPing: any, private pingIntervalMillis: number = 1000, private pingTimeoutSeconds: number = 5) { }
    monitor(): void {
        this.isDisposed = false;
        if (!this.pingTimeoutId) {
            this.pingTimeoutId = window.setTimeout(() => this.updatePing(), this.pingIntervalMillis);
        }
    }
    setPingInterval(intervalMillis: number): void {
        if (intervalMillis !== this.pingIntervalMillis) {
            this.pingIntervalMillis = intervalMillis;
            if (this.pingTimeoutId) {
                clearTimeout(this.pingTimeoutId);
                this.updatePing();
            }
        }
    }
    private async updatePing(): Promise<void> {
        this.pingTimeoutId = undefined;
        if (!this.gameTurnMgr.getErrorState() && this.gservCon.isOpen()) {
            let pingTime: number;
            try {
                pingTime = await this.gservCon.ping(this.pingTimeoutSeconds);
                if (this.isDisposed || this.pingTimeoutId) {
                    return;
                }
            }
            catch (error) {
                if (!(error instanceof IrcConnection.NoReplyError)) {
                    console.error(error);
                }
                pingTime = 1000 * this.pingTimeoutSeconds;
            }
            this.avgPing.pushSample(pingTime);
            this._onNewSample.dispatch(this, pingTime);
            this.pingTimeoutId = window.setTimeout(() => this.updatePing(), this.pingIntervalMillis);
        }
    }
    dispose(): void {
        if (this.pingTimeoutId) {
            clearTimeout(this.pingTimeoutId);
        }
        this.isDisposed = true;
        this._onNewSample = new EventDispatcher();
    }
}
