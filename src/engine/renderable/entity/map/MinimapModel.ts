import * as THREE from "three";
import { MapShroud, ShroudType, ShroudFlag } from "@/game/map/MapShroud";
const DEFAULT_COLOR = new THREE.Color("rgb(173, 170, 132)");
const WALL_COLORS = new Map([
    ["CAKRMW", new THREE.Color("rgb(107, 69, 49)")],
    ["CAFNCW", new THREE.Color(16777215)],
    ["CAFNCB", new THREE.Color(0)],
    ["GASAND", new THREE.Color("rgb(82, 77, 57)")],
]);
const DEFAULT_WALL_COLOR = new THREE.Color("rgb(90, 89, 82)");
const RUBBLE_COLOR = new THREE.Color(0);
const TIBERIUM_COLOR = new THREE.Color("rgb(173, 170, 132)");
const OVERLAY_COLOR = new THREE.Color(0);
export class MinimapModel {
    private tiles: any;
    private tileOccupation: any;
    private shroud: MapShroud | undefined;
    private localPlayer: any;
    private alliances: any;
    private paradropRules: any;
    private stride: number;
    private tileColors: Uint32Array;
    private aboveShroudTiles: Uint8Array;
    private tileWithTechnos: Uint8Array;
    constructor(tiles: any, tileOccupation: any, shroud: MapShroud | undefined, localPlayer: any, alliances: any, paradropRules: any) {
        this.tiles = tiles;
        this.tileOccupation = tileOccupation;
        this.shroud = shroud;
        this.localPlayer = localPlayer;
        this.alliances = alliances;
        this.paradropRules = paradropRules;
        const mapSize = this.tiles.getMapSize();
        this.stride = mapSize.width;
        this.tileColors = new Uint32Array(mapSize.width * mapSize.height);
        this.aboveShroudTiles = new Uint8Array(mapSize.width * mapSize.height);
        this.tileWithTechnos = new Uint8Array(mapSize.width * mapSize.height);
    }
    computeAllColors(): void {
        this.updateColors(this.tiles.getAll());
    }
    updateColors(tiles: any[]): void {
        for (const tile of tiles) {
            let priority = -1;
            let topObject: any;
            for (const obj of this.tileOccupation.getObjectsOnTile(tile)) {
                const shouldConsider = ((obj.isTechno() || obj.isOverlay() || obj.isTerrain()) &&
                    !obj.radarInvisible) ||
                    (obj.isOverlay() && obj.isBridge()) ||
                    (obj.isBuilding() &&
                        !obj.rules.invisibleInGame &&
                        (!obj.radarInvisible ||
                            (obj.rules.canBeOccupied && obj.owner.isCombatant())));
                if (shouldConsider) {
                    const objPriority = 4 * Number(obj.isTechno()) +
                        2 * Number(obj.isAircraft()) +
                        Number(obj.name !== this.paradropRules.paradropPlane);
                    if (objPriority > priority) {
                        priority = objPriority;
                        topObject = obj;
                    }
                }
            }
            let color: THREE.Color | undefined;
            if (topObject) {
                if ((topObject.isTechno() || topObject.isOverlay()) && topObject.rules.wall) {
                    color = WALL_COLORS.get(topObject.name) ?? DEFAULT_WALL_COLOR;
                }
                else if (topObject.isBuilding() &&
                    topObject.isDestroyed &&
                    topObject.rules.leaveRubble) {
                    color = RUBBLE_COLOR;
                }
                else if (topObject.isTechno()) {
                    if (topObject.cloakableTrait?.isCloaked() &&
                        this.localPlayer &&
                        !this.alliances.haveSharedIntel(this.localPlayer, topObject.owner)) {
                        color = undefined;
                    }
                    else {
                        const disguise = (topObject.isInfantry() || topObject.isVehicle()) &&
                            topObject.disguiseTrait?.getDisguise();
                        color = this.localPlayer &&
                            disguise &&
                            !this.alliances.haveSharedIntel(this.localPlayer, topObject.owner) &&
                            !this.localPlayer.sharedDetectDisguiseTrait?.has(topObject)
                            ? disguise.owner
                                ? new THREE.Color(disguise.owner.color.asHex())
                                : DEFAULT_COLOR
                            : new THREE.Color(topObject.owner.color.asHex());
                    }
                }
                else if (topObject.isTerrain()) {
                    color = DEFAULT_COLOR;
                }
                else if (topObject.isOverlay()) {
                    color = topObject.isTiberium() ? TIBERIUM_COLOR : OVERLAY_COLOR;
                }
            }
            color = color || this.tiles.getTileRadarColor(tile);
            const index = tile.rx + tile.ry * this.stride;
            this.tileColors[index] = color.getHex();
            this.aboveShroudTiles[index] =
                topObject?.name === this.paradropRules.paradropPlane ? 1 : 0;
            this.tileWithTechnos[index] = topObject?.isTechno() ? 1 : 0;
        }
    }
    getTileColor(tile: any): string {
        const index = tile.rx + tile.ry * this.stride;
        if (this.shroud?.getShroudType(tile) === ShroudType.Unexplored &&
            !this.aboveShroudTiles[index]) {
            return "#000000";
        }
        const color = new THREE.Color(this.tileColors[index]);
        if (this.shroud?.isFlagged(tile, ShroudFlag.Darken) &&
            !this.tileWithTechnos[index]) {
            color.multiplyScalar(0.35);
        }
        return "#" + color.getHexString();
    }
}
