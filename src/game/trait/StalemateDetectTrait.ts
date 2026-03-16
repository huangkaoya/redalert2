import { StalemateDetectEvent } from '../event/StalemateDetectEvent';
import { GameSpeed } from '../GameSpeed';
import { NotifyDestroy } from './interface/NotifyDestroy';
import { NotifyOwnerChange } from './interface/NotifyOwnerChange';
import { NotifyPlaceBuilding } from './interface/NotifyPlaceBuilding';
import { NotifyProduceUnit } from './interface/NotifyProduceUnit';
import { NotifyTick } from './interface/NotifyTick';
export class StalemateDetectTrait {
    private static graceMinutes = 10;
    private stale: boolean = false;
    private allPlayersCredits: Map<any, number> = new Map();
    private countdownTicks: number;
    constructor() {
        this.resetCountdown();
    }
    isStale(): boolean {
        return this.stale;
    }
    getCountdownTicks(): number {
        return this.countdownTicks;
    }
    resetCountdown(): void {
        this.countdownTicks = Math.floor(60 * StalemateDetectTrait.graceMinutes * GameSpeed.BASE_TICKS_PER_SECOND);
    }
    clearStale(): void {
        this.stale = false;
        this.resetCountdown();
    }
    [NotifyTick.onTick](e: any): void {
        if (this.countdownTicks > 0) {
            this.countdownTicks--;
        }
        else if (!this.stale) {
            this.stale = true;
            this.resetCountdown();
            e.events.dispatch(new StalemateDetectEvent());
        }
        for (const t of e.getCombatants()) {
            const i = this.allPlayersCredits.get(t);
            if (i !== t.credits) {
                this.allPlayersCredits.set(t, t.credits);
                if (t.credits > (i ?? 0) && t.production.hasAnyFactory()) {
                    this.clearStale();
                }
            }
        }
    }
    [NotifyProduceUnit.onProduce](): void {
        this.clearStale();
    }
    [NotifyPlaceBuilding.onPlace](e: any): void {
        if (!e.wallTrait) {
            this.clearStale();
        }
    }
    [NotifyDestroy.onDestroy](e: any, t: any, i: any): void {
        if (e.isBuilding() &&
            !e.owner.isNeutral &&
            !e.wallTrait &&
            !e.rules.insignificant &&
            !(e.owner.defeated && this.stale) &&
            !(i?.obj && t.areFriendly(e, i.obj))) {
            this.clearStale();
        }
    }
    [NotifyOwnerChange.onChange](e: any, t: any, i: any): void {
        if (e.isBuilding() &&
            !t.isNeutral &&
            !i.alliances.areAllied(e.owner, t)) {
            this.clearStale();
        }
    }
}
