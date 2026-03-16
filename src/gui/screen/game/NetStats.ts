import Stats from 'stats.js';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
export class NetStats {
    private disposables = new CompositeDisposable();
    constructor(private lockstep: any, private player: any, private renderer: any, private pingMonitor: any) { }
    init(): void {
        const stats = this.renderer.getStats();
        const rttPanel = new Stats.Panel('ms RTT', '#ff8', '#221');
        const maxRtt = 250;
        const onNewPingSample = (rtt: number) => {
            requestAnimationFrame(() => rttPanel.update(rtt, maxRtt));
        };
        this.pingMonitor.onNewSample.subscribe(onNewPingSample);
        this.disposables.add(() => {
            this.pingMonitor.onNewSample.unsubscribe(onNewPingSample);
            const currentStats = this.renderer.getStats();
            if (currentStats && rttPanel.dom) {
                currentStats.dom.removeChild(rttPanel.dom);
            }
        });
        stats.addPanel(rttPanel);
        if (!this.player.isObserver) {
            const latencyPanel = new Stats.Panel('ms LAT', '#f8f', '#212');
            const actionTimestamps = new Map<any, number>();
            this.lockstep.onActionsSent.subscribe((actionId: any) => {
                actionTimestamps.set(actionId, performance.now());
            });
            this.lockstep.onActionsReceived.subscribe((actionId: any) => {
                if (actionTimestamps.has(actionId)) {
                    const latency = performance.now() - actionTimestamps.get(actionId)!;
                    actionTimestamps.delete(actionId);
                    requestAnimationFrame(() => latencyPanel.update(latency, 1000));
                }
            });
            stats.addPanel(latencyPanel);
            this.disposables.add(() => {
                const currentStats = this.renderer.getStats();
                if (currentStats && latencyPanel.dom) {
                    currentStats.dom.removeChild(latencyPanel.dom);
                }
            });
        }
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
