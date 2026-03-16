import { ObjectType } from '@/engine/type/ObjectType';
import { TechnoRules, FactoryType } from '@/game/rules/TechnoRules';
export class CenterBaseCmd {
    private player: any;
    private rules: any;
    private mapPanningHelper: any;
    private cameraPan: any;
    constructor(player: any, rules: any, mapPanningHelper: any, cameraPan: any) {
        this.player = player;
        this.rules = rules;
        this.mapPanningHelper = mapPanningHelper;
        this.cameraPan = cameraPan;
    }
    execute(): void {
        let tile: any;
        const primaryFactory = this.player.production.getPrimaryFactory(FactoryType.BuildingType);
        if (primaryFactory) {
            tile = primaryFactory.centerTile;
        }
        else {
            const baseUnit = this.player
                .getOwnedObjectsByType(ObjectType.Vehicle)
                .find((unit: any) => this.rules.general.baseUnit.includes(unit.name));
            if (baseUnit) {
                tile = baseUnit.tile;
            }
        }
        if (tile) {
            this.cameraPan.setPan(this.mapPanningHelper.computeCameraPanFromTile(tile.rx, tile.ry));
        }
    }
}
