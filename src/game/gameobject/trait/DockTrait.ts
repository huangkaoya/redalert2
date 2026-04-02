import { NotifyDestroy } from './interface/NotifyDestroy';
import { NotifyOwnerChange } from './interface/NotifyOwnerChange';
import { NotifySell } from './interface/NotifySell';
import { DockableTrait } from './DockableTrait';
import { Coords } from '@/game/Coords';
import { NotifyTick } from './interface/NotifyTick';
import { NotifySpawn } from './interface/NotifySpawn';
import { isNotNullOrUndefined } from '@/util/typeGuard';
import { MoveToDockTask } from '../task/MoveToDockTask';
import { MoveTask } from '../task/move/MoveTask';
import { CallbackTask } from '../task/system/CallbackTask';
import { TaskGroup } from '../task/system/TaskGroup';
import { NotifyUnspawn } from './interface/NotifyUnspawn';
interface Building {
    name: string;
    position: {
        getMapPosition(): {
            x: number;
            y: number;
        };
    };
    owner: {
        buildings: Set<Building>;
    };
    rules: {
        unitRepair?: boolean;
        naval: boolean;
    };
    helipadTrait?: any;
    unitOrderTrait?: any;
    unitRepairTrait?: any;
    warpedOutTrait: {
        isActive(): boolean;
    };
    traits: {
        find<T>(trait: new (...args: any[]) => T): T | undefined;
    };
}
interface Unit {
    name: string;
    tile: Tile;
    isDestroyed: boolean;
    owner: any;
    rules: {
        consideredAircraft?: boolean;
        landable?: boolean;
        dock: string[];
        naval: boolean;
    };
    traits: {
        find<T>(trait: new (...args: any[]) => T): T | undefined;
        get<T>(trait: new (...args: any[]) => T): T;
    };
    unitOrderTrait: {
        addTask(task: any): void;
    };
    crashableTrait?: {
        crash(context: {
            player: any;
        }): void;
    };
    isVehicle(): boolean;
    isAircraft(): boolean;
}
interface Tile {
}
interface Tiles {
    getByMapCoords(x: number, y: number): Tile | undefined;
}
interface DockOffset {
    x: number;
    z: number;
}
interface GameContext {
    destroyObject(obj: Unit, attacker?: any, weapon?: any): void;
    sellTrait: {
        sell(unit: Unit): void;
    };
    changeObjectOwner(obj: Unit, newOwner: any): void;
}
export class DockTrait implements NotifyDestroy, NotifyOwnerChange, NotifySell, NotifyTick, NotifySpawn, NotifyUnspawn {
    private building: Building;
    private tiles: Tiles;
    private numberOfDocks: number;
    private dockingOffsets: DockOffset[];
    private ticksWhenWarpedOut: boolean = true;
    private unitsByDockNumber: (Unit | undefined)[];
    private reservedDocks: (Unit | undefined)[];
    private dockTiles: Tile[] = [];
    constructor(building: Building, tiles: Tiles, numberOfDocks: number, dockingOffsets: DockOffset[]) {
        this.building = building;
        this.tiles = tiles;
        this.numberOfDocks = numberOfDocks;
        this.dockingOffsets = dockingOffsets;
        this.unitsByDockNumber = new Array(numberOfDocks).fill(undefined);
        this.reservedDocks = new Array(numberOfDocks).fill(undefined);
    }
    [NotifySpawn.onSpawn](): void {
        this.dockTiles = [];
        for (let i = 0; i < this.numberOfDocks; i++) {
            const tile = this.findDockTile(i);
            if (!tile) {
                throw new Error(`Docking tile ${i} not found for object "${this.building.name}"`);
            }
            this.dockTiles[i] = tile;
        }
    }
    [NotifyUnspawn.onUnspawn](): void {
        for (let i = 0; i < this.numberOfDocks; i++) {
            this.unreserveDockAt(i);
        }
    }
    [NotifyTick.onTick](): void {
        for (let i = 0; i < this.numberOfDocks; i++) {
            const unit = this.unitsByDockNumber[i];
            if (unit && unit.tile !== this.getDockTile(i)) {
                this.undockUnit(unit);
            }
        }
    }
    [NotifyDestroy.onDestroy](target: Building, context: GameContext, attacker?: any, weapon?: any): void {
        const shouldRepairUnits = (target.rules.unitRepair || target.helipadTrait) &&
            !target.rules.naval &&
            !attacker?.weapon?.warhead.rules.temporal;
        if (shouldRepairUnits) {
            for (const unit of this.unitsByDockNumber) {
                if (unit && !unit.isDestroyed) {
                    if (shouldRepairUnits) {
                        context.destroyObject(unit, attacker, weapon);
                    }
                    else {
                        this.undockUnit(unit);
                    }
                }
            }
        }
    }
    [NotifySell.onSell](building: Building, context: GameContext): void {
        if (building.helipadTrait && this.hasDockedUnits()) {
            const availableHelipads: Building[] = [];
            let unitsToRelocate = 0;
            for (const otherBuilding of [...building.owner.buildings].filter(b => b.helipadTrait &&
                ((b as any).dockTrait?.getAvailableDockCount() ?? false) &&
                b !== building)) {
                let availableDocks = (otherBuilding as any).dockTrait?.getAvailableDockCount() ?? 0;
                while (availableDocks > 0 && unitsToRelocate < this.unitsByDockNumber.length) {
                    availableHelipads.push(otherBuilding);
                    availableDocks--;
                    unitsToRelocate++;
                }
                if (unitsToRelocate === this.unitsByDockNumber.length)
                    break;
            }
            let helipadIndex = 0;
            for (const unit of this.unitsByDockNumber) {
                if (unit) {
                    const targetHelipad = availableHelipads[helipadIndex];
                    if (targetHelipad) {
                        unit.unitOrderTrait.addTask(new MoveToDockTask(context as any, targetHelipad));
                    }
                    else {
                        unit.unitOrderTrait.addTask(new TaskGroup(new MoveTask(context as any, unit.tile as any, false), new CallbackTask((unit: Unit) => {
                            if (unit.crashableTrait) {
                                unit.crashableTrait.crash({ player: building.owner });
                            }
                            else {
                                context.destroyObject(unit, { player: building.owner });
                            }
                        })).setCancellable(false));
                    }
                    helipadIndex++;
                }
            }
        }
        else {
            const shouldSellUnits = building.rules.unitRepair && !building.rules.naval;
            for (const unit of this.unitsByDockNumber) {
                if (unit) {
                    if (shouldSellUnits) {
                        context.sellTrait.sell(unit);
                    }
                    else {
                        this.undockUnit(unit);
                    }
                }
            }
        }
    }
    [NotifyOwnerChange.onChange](building: Building, oldOwner: any, context: GameContext): void {
        for (const unit of this.unitsByDockNumber) {
            if (unit) {
                context.changeObjectOwner(unit, building.owner);
            }
        }
    }
    getFirstAvailableDockNumber(): number | undefined {
        if (!this.building?.warpedOutTrait.isActive()) {
            const index = this.unitsByDockNumber.findIndex((unit, i) => !unit && !this.reservedDocks[i]);
            return index !== -1 ? index : undefined;
        }
        return undefined;
    }
    getAvailableDockCount(): number {
        if (this.building?.warpedOutTrait.isActive()) {
            return 0;
        }
        return this.unitsByDockNumber.filter((unit, i) => !unit && !this.reservedDocks[i]).length;
    }
    getFirstEmptyDockNumber(): number | undefined {
        if (!this.building?.warpedOutTrait.isActive()) {
            const index = this.unitsByDockNumber.findIndex(unit => !unit);
            return index !== -1 ? index : undefined;
        }
        return undefined;
    }
    getDockOffset(dockIndex: number): DockOffset {
        if (dockIndex > this.numberOfDocks - 1) {
            throw new RangeError(`Index ${dockIndex} exceeds available docks (${this.numberOfDocks})`);
        }
        return this.dockingOffsets[dockIndex];
    }
    getDockTile(dockIndex: number): Tile {
        if (dockIndex > this.numberOfDocks - 1) {
            throw new RangeError(`Index ${dockIndex} exceeds available docks (${this.numberOfDocks})`);
        }
        return this.dockTiles[dockIndex];
    }
    getDockNumberByTile(tile: Tile): number | undefined {
        const index = this.dockTiles.indexOf(tile);
        return index !== -1 ? index : undefined;
    }
    getAllDockTiles(): Tile[] {
        return [...this.dockTiles];
    }
    private findDockTile(dockIndex: number): Tile | undefined {
        if (dockIndex > this.numberOfDocks - 1) {
            throw new RangeError(`Index ${dockIndex} exceeds available docks (${this.numberOfDocks})`);
        }
        const mapPos = this.building.position.getMapPosition();
        const offset = this.getDockOffset(dockIndex);
        return this.tiles.getByMapCoords(Math.floor((mapPos.x + offset.x) / Coords.LEPTONS_PER_TILE), Math.floor((mapPos.y + offset.z) / Coords.LEPTONS_PER_TILE));
    }
    isValidUnitForDock(unit: Unit): boolean {
        const isRepairableVehicle = this.building.unitRepairTrait &&
            unit.isVehicle() &&
            !this.building.helipadTrait &&
            (!unit.rules.consideredAircraft || unit.rules.landable);
        const isDockableUnit = unit.rules.dock.includes(this.building.name) &&
            !(unit.isAircraft() && !this.building.helipadTrait);
        const navalMatch = this.building.rules.naval === unit.rules.naval;
        return (isRepairableVehicle || isDockableUnit) && navalMatch;
    }
    dockUnitAt(unit: Unit, dockIndex: number): void {
        if (dockIndex > this.numberOfDocks - 1) {
            throw new RangeError(`Index ${dockIndex} exceeds available docks (${this.numberOfDocks})`);
        }
        if (this.unitsByDockNumber[dockIndex]) {
            throw new Error(`Another unit is already docked at dock #${dockIndex}`);
        }
        const dockableTrait = unit.traits.find(DockableTrait);
        if (!dockableTrait) {
            throw new Error(`Unit "${unit.name}" cannot be docked to ${this.building.name}`);
        }
        this.unitsByDockNumber[dockIndex] = unit;
        dockableTrait.dock = this.building;
    }
    undockUnitAt(dockIndex: number): void {
        if (dockIndex > this.numberOfDocks - 1) {
            throw new RangeError(`Index ${dockIndex} exceeds available docks (${this.numberOfDocks})`);
        }
        const unit = this.unitsByDockNumber[dockIndex];
        if (unit) {
            this.unitsByDockNumber[dockIndex] = undefined;
            unit.traits.get(DockableTrait).dock = undefined;
        }
    }
    undockUnit(unit: Unit): void {
        const index = this.unitsByDockNumber.indexOf(unit);
        if (index !== -1) {
            this.undockUnitAt(index);
        }
    }
    isDocked(unit: Unit): boolean {
        return this.unitsByDockNumber.includes(unit);
    }
    hasDockedUnits(): boolean {
        return !!this.unitsByDockNumber.find(unit => unit);
    }
    getDockedUnits(): Unit[] {
        return this.unitsByDockNumber.filter(isNotNullOrUndefined);
    }
    reserveDockAt(unit: Unit, dockIndex: number): void {
        if (dockIndex > this.numberOfDocks - 1) {
            throw new RangeError(`Index ${dockIndex} exceeds available docks (${this.numberOfDocks})`);
        }
        if (this.reservedDocks[dockIndex]) {
            throw new Error(`Dock #${dockIndex} is already reserved by ${this.reservedDocks[dockIndex]!.name}`);
        }
        this.reservedDocks[dockIndex] = unit;
        const dockableTrait = unit.traits.get(DockableTrait);
        dockableTrait.reservedDock?.dockTrait.unreserveDockForUnit(unit);
        dockableTrait.reservedDock = this.building;
    }
    unreserveDockAt(dockIndex: number): void {
        if (dockIndex > this.numberOfDocks - 1) {
            throw new RangeError(`Index ${dockIndex} exceeds available docks (${this.numberOfDocks})`);
        }
        const unit = this.reservedDocks[dockIndex];
        if (unit) {
            this.reservedDocks[dockIndex] = undefined;
            unit.traits.get(DockableTrait).reservedDock = undefined;
        }
    }
    unreserveDockForUnit(unit: Unit): void {
        const index = this.reservedDocks.indexOf(unit);
        if (index !== -1) {
            this.unreserveDockAt(index);
        }
    }
    hasReservedDockForUnit(unit: Unit): boolean {
        return this.reservedDocks.includes(unit);
    }
    hasReservedDockAt(dockIndex: number): boolean {
        return !!this.reservedDocks[dockIndex];
    }
    getReservedDockForUnit(unit: Unit): number | undefined {
        const index = this.reservedDocks.indexOf(unit);
        return index !== -1 ? index : undefined;
    }
    dispose(): void {
        this.building = undefined as any;
    }
}
