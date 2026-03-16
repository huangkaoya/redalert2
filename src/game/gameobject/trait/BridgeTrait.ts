import { NotifyDamage } from "@/game/gameobject/trait/interface/NotifyDamage";
import { NotifyTick } from "@/game/gameobject/trait/interface/NotifyTick";
import { NotifyDestroy } from "@/game/gameobject/trait/interface/NotifyDestroy";
import { InfDeathType } from "@/game/gameobject/infantry/InfDeathType";
import { getLandType } from "@/game/type/LandType";
import { getZoneType } from "@/game/gameobject/unit/ZoneType";
import { StanceType } from "@/game/gameobject/infantry/StanceType";
export class BridgeTrait {
    private bridges: any;
    private needsImageUpdate: boolean;
    private dominoHandled: boolean;
    constructor(bridges: any) {
        this.bridges = bridges;
        this.needsImageUpdate = false;
        this.dominoHandled = false;
    }
    [NotifyDamage.onDamage]() {
        this.needsImageUpdate = true;
    }
    [NotifyTick.onTick](e: any) {
        if (this.needsImageUpdate) {
            this.needsImageUpdate = false;
            this.bridges.handlePieceHealthChange(this.bridges.getPieceAtTile(e.tile));
        }
    }
    [NotifyDestroy.onDestroy](s: any, a: any, n: any) {
        const piece = this.bridges.getPieceAtTile(s.tile);
        if (!this.dominoHandled) {
            this.bridges
                .findDominoPieces(piece)
                .filter((e: any) => !e.obj.isDestroyed)
                .forEach((e: any) => {
                e.obj.traits.get(BridgeTrait).dominoHandled = true;
                a.destroyObject(e.obj, n);
            });
        }
        const tiles = a.map.tileOccupation.calculateTilesForGameObject(s.tile, s);
        tiles.forEach((tile: any) => {
            const landType = getLandType(tile.terrainType);
            const landRules = a.rules.getLandRules(landType);
            a.map.getGroundObjectsOnTile(tile).forEach((obj: any) => {
                if (obj.isUnit() &&
                    (obj.onBridge || obj.moveTrait.reservedPathNodes.some((node: any) => node.onBridge === s)) &&
                    !obj.isDestroyed) {
                    if ((s.isLowBridge() && landRules.getSpeedModifier(obj.rules.speedType) > 0) ||
                        (obj.isInfantry() && obj.stance === StanceType.Paradrop)) {
                        if (obj.onBridge) {
                            obj.onBridge = false;
                            obj.zone = getZoneType(landType);
                        }
                        for (const node of obj.moveTrait.reservedPathNodes) {
                            if (node.onBridge === s) {
                                node.onBridge = undefined;
                            }
                        }
                        if (obj.moveTrait.currentWaypoint?.onBridge === s) {
                            obj.moveTrait.currentWaypoint.onBridge = undefined;
                        }
                    }
                    else {
                        if (obj.isInfantry()) {
                            obj.infDeathType = InfDeathType.None;
                        }
                        a.destroyObject(obj, n, true);
                    }
                }
            });
        });
    }
}
