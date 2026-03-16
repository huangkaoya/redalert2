import { GameObject } from '../GameObject';
export class UnitSelectionLite {
    private player: any;
    private selectedUnits: Set<GameObject>;
    constructor(player: any) {
        this.player = player;
        this.selectedUnits = new Set();
    }
    update(units: GameObject[]): void {
        const enemyUnit = [...units].reverse().find(unit => unit.owner !== this.player);
        if (enemyUnit) {
            units = [enemyUnit];
        }
        this.selectedUnits.clear();
        for (const unit of units) {
            if (unit.rules.selectable) {
                this.selectedUnits.add(unit);
            }
        }
    }
    getSelectedUnits(): GameObject[] {
        return [...this.selectedUnits].filter(unit => !unit.isDestroyed && !unit.isCrashing);
    }
    isSelected(unit: GameObject): boolean {
        return this.selectedUnits.has(unit);
    }
}
