import { NotifyTick } from './interface/NotifyTick';
import { ReturnOreTask } from '../task/harvester/ReturnOreTask';
import { GatherOreTask } from '../task/harvester/GatherOreTask';
import { NotifySpawn } from './interface/NotifySpawn';
import { NotifyOwnerChange } from './interface/NotifyOwnerChange';
import { GameSpeed } from '@/game/GameSpeed';
import { NotifyTeleport } from './interface/NotifyTeleport';
import { NotifyOrder } from './interface/NotifyOrder';
import { OrderType } from '@/game/order/OrderType';
import { LandType } from '@/game/type/LandType';
export enum HarvesterStatus {
    Idle = 0,
    LookingForOreSite = 1,
    MovingToOreSite = 2,
    Harvesting = 3,
    LookingForRefinery = 4,
    MovingToRefinery = 5,
    Docking = 6,
    PreparingToUnload = 7,
    Unloading = 8
}
export class HarvesterTrait {
    private storage: number;
    private ore: number;
    private gems: number;
    private status: HarvesterStatus;
    private lastGatherExplicit: boolean;
    private autoGatherOnNextIdle: boolean;
    private ticksSinceLastRefineryCheck: number;
    private ticksSinceLastOreCheck: number;
    private lastOreSite?: any;
    constructor(storage: number) {
        this.storage = storage;
        this.ore = 0;
        this.gems = 0;
        this.status = HarvesterStatus.Idle;
        this.lastGatherExplicit = false;
        this.autoGatherOnNextIdle = false;
        this.ticksSinceLastRefineryCheck = 0;
        this.ticksSinceLastOreCheck = 0;
    }
    [NotifySpawn.onSpawn](unit: any, world: any): void {
        if (unit.owner.isCombatant()) {
            world.afterTick(() => {
                unit.unitOrderTrait.addTask(new GatherOreTask(world));
            });
            unit.attackTrait?.increasePassiveScanCooldown(1);
        }
    }
    [NotifyOwnerChange.onChange](unit: any, oldOwner: any, world: any): void {
        if ((!oldOwner.isCombatant() && unit.owner.isCombatant()) ||
            world.alliances.areAllied(unit.owner, oldOwner)) {
            world.afterTick(() => {
                unit.unitOrderTrait.addTask(new GatherOreTask(world));
            });
        }
    }
    [NotifyTick.onTick](unit: any, world: any): void {
        if (this.status === HarvesterStatus.LookingForRefinery) {
            if (this.ticksSinceLastRefineryCheck++ > 5 * GameSpeed.BASE_TICKS_PER_SECOND) {
                this.ticksSinceLastRefineryCheck = 0;
                if (unit.unitOrderTrait.hasTasks()) {
                    this.ticksSinceLastRefineryCheck = -25 * GameSpeed.BASE_TICKS_PER_SECOND;
                }
                else if ([...unit.owner.buildings].some(b => b.rules.refinery) || this.lastGatherExplicit) {
                    unit.unitOrderTrait.addTask(new ReturnOreTask(world));
                }
                else {
                    this.status = HarvesterStatus.Idle;
                }
            }
        }
        else if (this.status === HarvesterStatus.LookingForOreSite) {
            if (this.ticksSinceLastOreCheck++ > 20 * GameSpeed.BASE_TICKS_PER_SECOND) {
                this.ticksSinceLastOreCheck = 0;
                if (!unit.unitOrderTrait.hasTasks()) {
                    unit.unitOrderTrait.addTask(new GatherOreTask(world));
                }
            }
        }
        else if (this.status === HarvesterStatus.Idle &&
            this.autoGatherOnNextIdle &&
            unit.unitOrderTrait.isIdle() &&
            unit.tile.landType === LandType.Tiberium) {
            this.autoGatherOnNextIdle = false;
            unit.unitOrderTrait.addTask(new GatherOreTask(world, unit.tile, true));
        }
    }
    [NotifyTeleport.onBeforeTeleport](unit: any, world: any, tile: any, keepDock: boolean): void {
        if (!keepDock && unit.owner.isCombatant()) {
            this.status = HarvesterStatus.Idle;
            this.lastOreSite = undefined;
            if (tile && unit.rules.teleporter) {
                world.afterTick(() => {
                    unit.unitOrderTrait.addTask(new (this.isFull() ? ReturnOreTask : GatherOreTask)(world));
                });
            }
        }
    }
    [NotifyOrder.onPush](unit: any, orderType: OrderType): void {
        this.autoGatherOnNextIdle = [
            OrderType.AttackMove,
            OrderType.Move,
            OrderType.ForceMove,
            OrderType.Scatter
        ].includes(orderType);
        if ([HarvesterStatus.LookingForRefinery, HarvesterStatus.LookingForOreSite].includes(this.status)) {
            this.status = HarvesterStatus.Idle;
        }
    }
    isFull(): boolean {
        return this.ore + this.gems >= this.storage;
    }
    isEmpty(): boolean {
        return !this.ore && !this.gems;
    }
    getHash(): number {
        return 100 * this.ore + this.gems;
    }
    debugGetState(): {
        ore: number;
        gems: number;
    } {
        return { ore: this.ore, gems: this.gems };
    }
}
