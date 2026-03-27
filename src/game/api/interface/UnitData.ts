import { GameObjectData } from './GameObjectData';

export interface UnitData extends GameObjectData {
    owner: string;
    sight: number;
    veteranLevel: number;
    guardMode: boolean;
    purchaseValue: number;
    primaryWeapon?: any;
    secondaryWeapon?: any;
    deathWeapon?: any;
    attackState?: string;
    direction: number;
    onBridge?: boolean;
    zone?: any;
    buildStatus?: string;
    factory?: {
        deliveringUnit?: string;
        status: string;
    };
    rallyPoint?: any;
    isPoweredOn?: boolean;
    hasWrenchRepair?: boolean;
    turretFacing?: number;
    turretNo?: number;
    garrisonUnitCount?: number;
    garrisonUnitsMax?: number;
    passengerSlotCount?: number;
    passengerSlotMax?: number;
    isIdle: boolean;
    canMove?: boolean;
    velocity?: any;
    stance?: string;
    harvestedOre?: number;
    harvestedGems?: number;
    ammo?: number;
    isWarpedOut: boolean;
    mindControlledBy?: string;
    tntTimer?: number;
}
