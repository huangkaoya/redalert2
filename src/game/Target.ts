import { Coords } from './Coords';
import { ZoneType } from './gameobject/unit/ZoneType';
import { LandType } from './type/LandType';
import { LocomotorType } from './type/LocomotorType';
import { MovementZone } from './type/MovementZone';
import { SpeedType } from './type/SpeedType';

export enum TargetBridgeMode {
    Auto = 0,
    Ground = 1,
    Bridge = 2,
}

export class Target {
    private tileOccupation: any;
    private isOre: boolean;
    private bridge?: any;
    private bridgeMode: TargetBridgeMode;
    public tile: any;
    public obj?: any;
    constructor(obj: any, tile: any, tileOccupation: any, bridgeMode: TargetBridgeMode = TargetBridgeMode.Auto) {
        this.tileOccupation = tileOccupation;
        this.isOre = false;
        this.bridgeMode = bridgeMode;
        if (obj) {
            if (obj.isOverlay() && obj.isBridge()) {
                this.bridge = obj;
                this.obj = obj;
                this.tile = tile;
                this.bridgeMode = TargetBridgeMode.Bridge;
            }
            else if (obj.isOverlay() && obj.isTiberium()) {
                this.isOre = true;
                this.tile = obj.tile;
            }
            else {
                this.obj = obj;
                this.tile = obj.isBuilding() ? obj.centerTile : obj.tile;
            }
        }
        else {
            if (tile.landType === LandType.Tiberium) {
                this.isOre = true;
            }
            if (bridgeMode === TargetBridgeMode.Bridge) {
                this.bridge = tileOccupation.getBridgeOnTile(tile);
            }
            else if (bridgeMode === TargetBridgeMode.Auto &&
                tile.onBridgeLandType !== undefined) {
                this.bridge = tileOccupation.getBridgeOnTile(tile);
            }
            this.tile = tile;
        }
    }
    equals(other: Target): boolean {
        return (this.obj === other.obj &&
            this.tile === other.tile &&
            this.bridge === other.bridge &&
            this.isOre === other.isOre);
    }
    getWorldCoords() {
        return this.obj
            ? this.obj.position.worldPosition
            : Coords.tile3dToWorld(this.tile.rx + 0.5, this.tile.ry + 0.5, this.tile.z + (this.bridge?.tileElevation ?? 0));
    }
    isBridge(): boolean {
        return !!this.bridge;
    }
    getBridge() {
        return (this.bridge ||
            (this.obj?.isUnit() && this.obj.onBridge
                ? this.tileOccupation.getBridgeOnTile(this.obj.tile)
                : undefined));
    }
    getBridgeFor(sourceObject?: any) {
        if (sourceObject && Target.usesGroundLayerUnderBridge(sourceObject)) {
            return undefined;
        }
        return this.getBridge();
    }
    getBridgeMode(): TargetBridgeMode {
        return this.bridgeMode;
    }
    hasExplicitBridgeMode(): boolean {
        return this.bridgeMode !== TargetBridgeMode.Auto;
    }
    static usesGroundLayerUnderBridge(sourceObject: any): boolean {
        const rules = sourceObject?.rules;
        return !!rules &&
            (rules.naval ||
                rules.waterBound ||
                rules.locomotor === LocomotorType.Ship ||
                sourceObject.zone === ZoneType.Water ||
                rules.movementZone === MovementZone.Water ||
                rules.speedType === SpeedType.Float ||
                rules.speedType === SpeedType.FloatBeach);
    }
}
