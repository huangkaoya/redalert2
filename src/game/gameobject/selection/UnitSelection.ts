import { SelectionModel } from './SelectionModel';
import { fnv32a } from '@/util/math';
import { GameObject } from '../GameObject';
export class UnitSelection {
    private selectedUnits: Set<GameObject>;
    private selectionModelsByUnit: Map<GameObject, SelectionModel>;
    private groups: Map<number, Set<GameObject>>;
    private hashNeedsUpdate: boolean;
    private hash: number;
    constructor() {
        this.selectedUnits = new Set();
        this.selectionModelsByUnit = new Map();
        this.groups = new Map();
        this.hashNeedsUpdate = true;
    }
    getOrCreateSelectionModel(unit: GameObject): SelectionModel {
        let model = this.selectionModelsByUnit.get(unit);
        if (!model) {
            model = new SelectionModel(unit);
            this.selectionModelsByUnit.set(unit, model);
        }
        return model;
    }
    deselectAll(): void {
        this.selectedUnits.forEach(unit => this.selectionModelsByUnit.get(unit)?.setSelected(false));
        this.selectedUnits.clear();
        this.hashNeedsUpdate = true;
    }
    addToSelection(unit: GameObject): void {
        this.selectedUnits.add(unit);
        this.getOrCreateSelectionModel(unit).setSelected(true);
        this.hashNeedsUpdate = true;
    }
    removeFromSelection(units: GameObject[]): void {
        units.forEach(unit => {
            this.selectedUnits.delete(unit);
            this.getOrCreateSelectionModel(unit).setSelected(false);
        });
        this.hashNeedsUpdate = true;
    }
    getSelectedUnits(): GameObject[] {
        return [...this.selectedUnits].filter(unit => !unit.isDestroyed && !unit.isCrashing && !unit.isDisposed && unit.isSpawned);
    }
    isSelected(unit: GameObject): boolean {
        return this.selectedUnits.has(unit);
    }
    cleanupUnit(unit: GameObject): void {
        this.selectionModelsByUnit.delete(unit);
        this.selectedUnits.delete(unit);
        this.removeUnitsFromGroup([unit]);
        this.hashNeedsUpdate = true;
    }
    updateHash(): void {
        this.hash = fnv32a([...this.selectedUnits].map(unit => unit.id));
    }
    getHash(): number {
        if (this.hashNeedsUpdate) {
            this.updateHash();
            this.hashNeedsUpdate = false;
        }
        return this.hash;
    }
    createGroup(groupNumber: number): void {
        this.addUnitsToGroup(groupNumber, this.getSelectedUnits());
    }
    addUnitsToGroup(groupNumber: number, units: GameObject[], clearExisting: boolean = true): void {
        this.removeUnitsFromGroup(units);
        let group = this.groups.get(groupNumber);
        if (!group) {
            group = new Set();
            this.groups.set(groupNumber, group);
        }
        if (clearExisting) {
            [...group.values()].forEach(unit => this.selectionModelsByUnit.get(unit)?.setControlGroupNumber(undefined));
            group.clear();
        }
        for (const unit of units) {
            group.add(unit);
            this.getOrCreateSelectionModel(unit).setControlGroupNumber(groupNumber);
        }
    }
    addGroupToSelection(groupNumber: number): void {
        if (this.groups.has(groupNumber)) {
            for (const unit of [...this.groups.get(groupNumber)!]) {
                this.addToSelection(unit);
            }
        }
    }
    selectGroup(groupNumber: number): void {
        this.deselectAll();
        this.addGroupToSelection(groupNumber);
    }
    getGroupUnits(groupNumber: number): GameObject[] {
        return [...(this.groups.get(groupNumber) ?? [])];
    }
    removeUnitsFromGroup(units: GameObject[]): void {
        for (const group of this.groups.values()) {
            for (const unit of units) {
                group.delete(unit);
                this.selectionModelsByUnit.get(unit)?.setControlGroupNumber(undefined);
            }
        }
    }
}
