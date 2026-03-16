import * as THREE from 'three';
import { equals } from '@/util/Array';
import { rectContainsPoint } from '@/util/geometry';
import { clamp } from '@/util/math';
import { EventDispatcher } from '@/util/event';
import { HealthLevel } from '@/game/gameobject/unit/HealthLevel';
enum QueryType {
    None = 0,
    OnScreen = 1,
    OnMap = 2,
    Veteran = 3,
    Health = 4
}
interface SelectionUpdate {
    selection: any[];
    queryType?: QueryType;
    veteranLevel?: number;
    healthLevel?: number;
}
export class UnitSelectionHandler {
    private readonly _onUserSelectionChange = new EventDispatcher<UnitSelectionHandler, SelectionUpdate>();
    private readonly _onUserSelectionUpdate = new EventDispatcher<UnitSelectionHandler, SelectionUpdate>();
    private shouldSelectByTypeOnMap = false;
    private shouldSelectCombatantsOnMap = false;
    private selectVeteranState?: number;
    private selectHealthState?: number;
    private vetNavSelectionSet: any[] = [];
    private healthNavSelectionSet: any[] = [];
    private boxSelectOrigin?: {
        x: number;
        y: number;
    };
    private selectBox?: THREE.Line;
    constructor(private readonly worldScene: any, private readonly uiScene: any, public readonly player: any, private readonly unitSelection: any, private readonly entityIntersectHelper: any, private readonly veteranCap: number) {
        this._onUserSelectionChange.subscribe(() => {
            this.shouldSelectByTypeOnMap = false;
            this.shouldSelectCombatantsOnMap = false;
        });
        this._onUserSelectionUpdate.subscribe(() => {
            this.selectVeteranState = undefined;
            this.selectHealthState = undefined;
        });
    }
    get onUserSelectionChange() {
        return this._onUserSelectionChange.asEvent();
    }
    get onUserSelectionUpdate() {
        return this._onUserSelectionUpdate.asEvent();
    }
    addToSelection(unit: any): void {
        if (!unit?.rules?.selectable) {
            return;
        }
        const selected = this.unitSelection.getSelectedUnits();
        if (selected.length &&
            ((unit.owner === this.player && !selected.find((selectedUnit: any) => selectedUnit.owner !== unit.owner)) ||
                !this.player)) {
            this.unitSelection.addToSelection(unit);
            return;
        }
        if (selected.length) {
            this.unitSelection.deselectAll();
        }
        this.unitSelection.addToSelection(unit);
    }
    selectSingleUnit(unit: any): void {
        if (!unit?.rules?.selectable) {
            return;
        }
        const previousSelection = this.unitSelection.getSelectedUnits();
        if (previousSelection.length) {
            this.unitSelection.deselectAll();
        }
        this.unitSelection.addToSelection(unit);
        const currentSelection = this.unitSelection.getSelectedUnits();
        const event = { selection: currentSelection };
        if (!(currentSelection.length === previousSelection.length && currentSelection[0] === previousSelection[0])) {
            this._onUserSelectionChange.dispatch(this, event);
        }
        this._onUserSelectionUpdate.dispatch(this, event);
    }
    toggleSelection(unit: any): void {
        if (!unit?.rules?.selectable) {
            return;
        }
        if (this.unitSelection.isSelected(unit)) {
            this.unitSelection.removeFromSelection([unit]);
        }
        else {
            this.addToSelection(unit);
        }
        const event = { selection: this.unitSelection.getSelectedUnits() };
        this._onUserSelectionChange.dispatch(this, event);
        this._onUserSelectionUpdate.dispatch(this, event);
    }
    deselectAll(): void {
        const event = { selection: [] };
        if (this.unitSelection.getSelectedUnits().length) {
            this.unitSelection.deselectAll();
            this._onUserSelectionChange.dispatch(this, event);
        }
        this._onUserSelectionUpdate.dispatch(this, event);
    }
    selectMultipleUnits(units: any[], meta: {
        queryType?: QueryType;
        veteranLevel?: number;
        healthLevel?: number;
    } = {}, clearExisting: boolean = true): void {
        const previousSelection = this.unitSelection.getSelectedUnits();
        if (clearExisting) {
            this.unitSelection.deselectAll();
        }
        units.forEach((unit) => this.addToSelection(unit));
        const currentSelection = this.unitSelection.getSelectedUnits();
        const event = {
            selection: currentSelection,
            queryType: meta.queryType ?? QueryType.None,
            veteranLevel: meta.veteranLevel,
            healthLevel: meta.healthLevel,
        };
        if (!equals(previousSelection, currentSelection)) {
            this._onUserSelectionChange.dispatch(this, event);
        }
        this._onUserSelectionUpdate.dispatch(this, event);
    }
    getSelectedUnits(): any[] {
        return this.unitSelection.getSelectedUnits();
    }
    startBoxSelect(pointer: {
        x: number;
        y: number;
    }): void {
        this.boxSelectOrigin = pointer;
        this.disposeBoxSelect();
        this.selectBox = this.createSelectBox(new THREE.Box2());
        this.uiScene.get3DObject().add(this.selectBox);
    }
    updateBoxSelect(pointer: {
        x: number;
        y: number;
    }): void {
        if (!this.boxSelectOrigin || !this.selectBox) {
            return;
        }
        const clamped = this.clampPointerToWorldViewport(pointer);
        const box = new THREE.Box2().setFromPoints([
            new THREE.Vector2(this.boxSelectOrigin.x, this.boxSelectOrigin.y),
            new THREE.Vector2(clamped.x, clamped.y),
        ]);
        this.selectBox.geometry.dispose();
        this.selectBox.geometry = this.createBoxGeometry(box);
    }
    finishBoxSelect(pointer: {
        x: number;
        y: number;
    }, clearExisting: boolean): boolean {
        if (!this.boxSelectOrigin) {
            return false;
        }
        const origin = this.boxSelectOrigin;
        this.boxSelectOrigin = undefined;
        this.disposeBoxSelect();
        if (rectContainsPoint({ x: origin.x, y: origin.y, width: 0, height: 0 }, pointer)) {
            return false;
        }
        if (origin.x === pointer.x && origin.y === pointer.y) {
            return false;
        }
        const clamped = this.clampPointerToWorldViewport(pointer);
        const box = new THREE.Box2().setFromPoints([
            new THREE.Vector2(origin.x, origin.y),
            new THREE.Vector2(clamped.x, clamped.y),
        ]);
        const units = this.entityIntersectHelper
            .getEntitiesAtScreenBox(box)
            ?.map((renderable: any) => renderable.gameObject)
            .filter((gameObject: any) => gameObject.isTechno?.() && gameObject.rules.selectable && gameObject.owner === this.player);
        if (!units?.length) {
            return false;
        }
        const selection = units.length === 1 ? [units[0]] : units.filter((unit: any) => !unit.isBuilding?.());
        if (!selection.length) {
            return false;
        }
        this.selectMultipleUnits(selection, { queryType: QueryType.None }, clearExisting);
        return true;
    }
    cancelBoxSelect(): void {
        this.boxSelectOrigin = undefined;
        this.disposeBoxSelect();
    }
    createGroup(groupNumber: number): void {
        const selectedUnits = this.unitSelection.getSelectedUnits();
        if (selectedUnits.length === 1 && selectedUnits[0].owner !== this.player) {
            return;
        }
        this.unitSelection.createGroup(groupNumber);
    }
    getGroupUnits(groupNumber: number): any[] {
        return this.unitSelection.getGroupUnits(groupNumber);
    }
    addGroupToSelection(groupNumber: number): void {
        const previousSelection = this.getSelectedUnits();
        this.unitSelection.addGroupToSelection(groupNumber);
        const currentSelection = this.getSelectedUnits();
        const event = { selection: currentSelection };
        if (!equals(currentSelection, previousSelection)) {
            this._onUserSelectionChange.dispatch(this, event);
        }
        this._onUserSelectionUpdate.dispatch(this, event);
    }
    selectGroup(groupNumber: number): void {
        const previousSelection = this.getSelectedUnits();
        this.unitSelection.selectGroup(groupNumber);
        const currentSelection = this.getSelectedUnits();
        const event = { selection: currentSelection };
        if (!equals(currentSelection, previousSelection)) {
            this._onUserSelectionChange.dispatch(this, event);
        }
        this._onUserSelectionUpdate.dispatch(this, event);
    }
    selectByType(): void {
        const owner = this.player ?? this.unitSelection.getSelectedUnits()[0]?.owner;
        if (!owner) {
            return;
        }
        const selectedNames = this.getSelectedUnits().reduce((set, unit) => set.add(unit.name), new Set<string>());
        let candidates: any[] = [];
        let matching: any[] = [];
        if (!this.shouldSelectByTypeOnMap) {
            candidates = this.getOwnedObjectsOnScreen(owner);
            matching = candidates.filter((unit) => selectedNames.has(unit.name));
            if (matching.every((unit) => this.unitSelection.isSelected(unit))) {
                this.shouldSelectByTypeOnMap = true;
            }
        }
        if (this.shouldSelectByTypeOnMap) {
            candidates = owner.getOwnedObjects();
            matching = candidates.filter((unit: any) => selectedNames.has(unit.name));
        }
        const queryType = this.shouldSelectByTypeOnMap ? QueryType.OnMap : QueryType.OnScreen;
        if (matching.length) {
            this.selectMultipleUnits(matching, { queryType }, false);
        }
        else if (!selectedNames.size) {
            this.selectMultipleUnits([], { queryType });
        }
        this.shouldSelectByTypeOnMap = true;
    }
    selectCombatants(): void {
        const owner = this.player ?? this.unitSelection.getSelectedUnits()[0]?.owner;
        if (!owner) {
            return;
        }
        const candidates = this.shouldSelectCombatantsOnMap ? owner.getOwnedObjects() : this.getOwnedObjectsOnScreen(owner);
        const matching = candidates.filter((unit: any) => unit.isUnit?.() &&
            unit.rules.selectable &&
            unit.rules.isSelectableCombatant &&
            unit.attackTrait &&
            !unit.rules.harvester);
        if (matching.length) {
            this.selectMultipleUnits(matching, {
                queryType: this.shouldSelectCombatantsOnMap ? QueryType.OnMap : QueryType.OnScreen,
            });
        }
        else if (this.shouldSelectCombatantsOnMap) {
            this.selectMultipleUnits([], { queryType: QueryType.OnMap });
        }
        else {
            this.shouldSelectCombatantsOnMap = true;
            this.selectCombatants();
            return;
        }
        this.shouldSelectCombatantsOnMap = true;
    }
    selectByVeterancy(): void {
        const owner = this.player ?? this.unitSelection.getSelectedUnits()[0]?.owner;
        if (!owner) {
            return;
        }
        let veteranLevel: number;
        if (this.selectVeteranState === undefined) {
            veteranLevel = this.veteranCap;
            this.vetNavSelectionSet = this.unitSelection.getSelectedUnits();
            if (!this.vetNavSelectionSet.length) {
                this.vetNavSelectionSet = this.getOwnedObjectsOnScreen(owner).filter((unit) => unit.isUnit?.());
            }
        }
        else {
            const totalLevels = this.veteranCap + 1;
            veteranLevel = (this.selectVeteranState - 1 + totalLevels) % totalLevels;
        }
        const candidates = this.vetNavSelectionSet.filter((unit) => unit.rules.selectable && !unit.isDestroyed && !unit.isCrashing && !unit.limboData && unit.owner === owner);
        const matching = candidates.filter((unit) => unit.veteranLevel === veteranLevel);
        this.selectMultipleUnits(matching, {
            queryType: QueryType.Veteran,
            veteranLevel: candidates.length ? veteranLevel : undefined,
        });
        this.selectVeteranState = veteranLevel;
    }
    selectByHealth(): void {
        const owner = this.player ?? this.unitSelection.getSelectedUnits()[0]?.owner;
        if (!owner) {
            return;
        }
        const totalLevels = Object.keys(HealthLevel).filter((value) => !Number.isNaN(Number(value))).length;
        let healthLevel: number;
        if (this.selectHealthState === undefined) {
            healthLevel = totalLevels - 1;
            this.healthNavSelectionSet = this.unitSelection.getSelectedUnits();
            if (!this.healthNavSelectionSet.length) {
                this.healthNavSelectionSet = this.getOwnedObjectsOnScreen(owner).filter((unit) => unit.isUnit?.());
            }
        }
        else {
            healthLevel = (this.selectHealthState - 1 + totalLevels) % totalLevels;
        }
        const candidates = this.healthNavSelectionSet.filter((unit) => unit.rules.selectable && !unit.isDestroyed && !unit.isCrashing && !unit.limboData && unit.owner === owner);
        const matching = candidates.filter((unit) => unit.healthTrait.level === healthLevel);
        this.selectMultipleUnits(matching, {
            queryType: QueryType.Health,
            healthLevel: candidates.length ? healthLevel : undefined,
        });
        this.selectHealthState = healthLevel;
    }
    clearSelection(): void {
        this.deselectAll();
    }
    getSelection(): any[] {
        return this.getSelectedUnits();
    }
    getHash(): number {
        return this.unitSelection.getHash();
    }
    dispose(): void {
        this.cancelBoxSelect();
    }
    private getOwnedObjectsOnScreen(owner: any): any[] {
        const viewport = this.worldScene.viewport;
        const box = new THREE.Box2(new THREE.Vector2(viewport.x, viewport.y), new THREE.Vector2(viewport.x + viewport.width - 1, viewport.y + viewport.height - 1));
        return (this.entityIntersectHelper
            .getEntitiesAtScreenBox(box)
            ?.map((renderable: any) => renderable.gameObject)
            .filter((gameObject: any) => gameObject.isTechno?.() && gameObject.owner === owner) ?? []);
    }
    private disposeBoxSelect(): void {
        if (!this.selectBox) {
            return;
        }
        this.uiScene.get3DObject().remove(this.selectBox);
        this.selectBox.geometry.dispose();
        (this.selectBox.material as THREE.Material).dispose();
        this.selectBox = undefined;
    }
    private clampPointerToWorldViewport(pointer: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    } {
        const viewport = this.worldScene.viewport;
        return {
            x: clamp(pointer.x, viewport.x, viewport.x + viewport.width - 1),
            y: clamp(pointer.y, viewport.y, viewport.y + viewport.height - 1),
        };
    }
    private createSelectBox(box: THREE.Box2): THREE.Line {
        const material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        const geometry = this.createBoxGeometry(box);
        return new THREE.Line(geometry, material);
    }
    private createBoxGeometry(box: THREE.Box2): THREE.BufferGeometry {
        const min = { x: box.min.x, y: box.min.y };
        const max = { x: box.max.x, y: box.max.y };
        const topRight = { x: box.max.x, y: box.min.y };
        const bottomLeft = { x: box.min.x, y: box.max.y };
        const positions = new Float32Array([
            min.x, min.y, 0,
            bottomLeft.x, bottomLeft.y, 0,
            max.x, max.y, 0,
            topRight.x, topRight.y, 0,
            min.x, min.y, 0,
        ]);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return geometry;
    }
}
