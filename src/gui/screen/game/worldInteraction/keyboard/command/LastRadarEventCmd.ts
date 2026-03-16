import { EventType } from '@/game/event/EventType';
import { SuperWeaponType } from '@/game/type/SuperWeaponType';
export class LastRadarEventCmd {
    private player: any;
    private mapPanningHelper: any;
    private cameraPan: any;
    private eventHistory: any[];
    private eventPointer: number;
    private lastRun?: number;
    constructor(player: any, mapPanningHelper: any, cameraPan: any) {
        this.player = player;
        this.mapPanningHelper = mapPanningHelper;
        this.cameraPan = cameraPan;
        this.eventHistory = [];
        this.eventPointer = -1;
    }
    execute(): void {
        if (this.eventHistory.length) {
            if (this.lastRun) {
                const now = Date.now();
                const timeDiff = now - this.lastRun;
                this.lastRun = now;
                if (timeDiff > 400) {
                    this.eventPointer = this.eventHistory.length - 1;
                }
                else {
                    this.eventPointer--;
                    if (this.eventPointer < 0) {
                        this.eventPointer = this.eventHistory.length - 1;
                    }
                }
            }
            else {
                this.lastRun = Date.now();
            }
            const event = this.eventHistory[this.eventPointer];
            if (event) {
                const cameraPan = this.mapPanningHelper.computeCameraPanFromTile(event.rx, event.ry);
                this.cameraPan.setPan(cameraPan);
            }
        }
    }
    recordEvent(tile: any): void {
        this.eventHistory.push(tile);
        this.eventHistory = this.eventHistory.slice(-8);
        this.eventPointer = this.eventHistory.length - 1;
    }
    handleGameEvent(gameEvent: any): void {
        switch (gameEvent.type) {
            case EventType.RadarEvent:
                if (gameEvent.target === this.player) {
                    this.recordEvent(gameEvent.tile);
                }
                break;
            case EventType.BridgeRepair:
                if (gameEvent.source === this.player) {
                    this.recordEvent(gameEvent.tile);
                }
                break;
            case EventType.ObjectDestroy:
                {
                    const target = gameEvent.target;
                    if (target.isUnit() &&
                        target.owner === this.player) {
                        this.recordEvent(target.tile);
                    }
                    if (target.isProjectile() && target.isNuke) {
                        this.recordEvent(target.tile);
                    }
                }
                break;
            case EventType.FactoryProduceUnit:
                const target = gameEvent.target;
                if (target.owner === this.player) {
                    this.recordEvent(target.tile);
                }
                break;
            case EventType.SuperWeaponActivate:
                const superWeaponEvent = gameEvent;
                if ([
                    SuperWeaponType.IronCurtain,
                    SuperWeaponType.ChronoSphere,
                ].includes(superWeaponEvent.target)) {
                    this.recordEvent(superWeaponEvent.atTile2 ?? superWeaponEvent.atTile);
                }
                break;
            case EventType.LightningStormManifest:
                this.recordEvent(gameEvent.target);
        }
    }
}
