import { UnitSelectionLite } from '../gameobject/selection/UnitSelectionLite';
export class OrderActionContext {
    private unitSelectionByPlayer: Map<number, UnitSelectionLite>;
    constructor() {
        this.unitSelectionByPlayer = new Map();
    }
    getOrCreateSelection(playerId: number): UnitSelectionLite {
        let selection = this.unitSelectionByPlayer.get(playerId);
        if (!selection) {
            selection = new UnitSelectionLite(playerId);
            this.unitSelectionByPlayer.set(playerId, selection);
        }
        return selection;
    }
}
