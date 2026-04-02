import { ObjectType } from "@/engine/type/ObjectType";
import { HarvesterTrait } from "@/game/gameobject/trait/HarvesterTrait";
import { TransportTrait } from "@/game/gameobject/trait/TransportTrait";
import { MoveTrait } from "@/game/gameobject/trait/MoveTrait";
import { TurretTrait } from "@/game/gameobject/trait/TurretTrait";
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
import { DockableTrait } from "@/game/gameobject/trait/DockableTrait";
import { Techno } from "@/game/gameobject/Techno";
import { CrewedTrait } from "@/game/gameobject/trait/CrewedTrait";
import { GunnerTrait } from "@/game/gameobject/trait/GunnerTrait";
import { ParasiteableTrait } from "@/game/gameobject/trait/ParasiteableTrait";
import { CrashableTrait } from "@/game/gameobject/trait/CrashableTrait";
import { SubmergibleTrait } from "@/game/gameobject/trait/SubmergibleTrait";
import { LocomotorType } from "@/game/type/LocomotorType";
import { HoverBobTrait } from "@/game/gameobject/trait/HoverBobTrait";
import { CrateBonuses } from "@/game/gameobject/unit/CrateBonuses";
import { TilterTrait } from "@/game/gameobject/trait/TilterTrait";
export const ROCKING_TICKS = 34;
interface RockingState {
    ticksLeft: number;
    facing: number;
    factor: number;
}
interface VehicleRules {
    underwater: boolean;
    weight: number;
    naval: boolean;
    crashable: boolean;
    crewed: boolean;
    harvester: boolean;
    storage?: any;
    passengers: boolean;
    gunner: boolean;
    turret: boolean;
    consideredAircraft: boolean;
    landable: boolean;
    parasiteable: boolean;
    locomotor: LocomotorType;
}
interface GameRules {
    general: {
        shipSinkingWeight: number;
    };
}
interface TerrainInfo {
    isVoxel: boolean;
}
export class Vehicle extends Techno {
    public direction: number = 0;
    public spinVelocity: number = 0;
    public crateBonuses: CrateBonuses = new CrateBonuses();
    public turretNo: number = 0;
    public onBridge: boolean = false;
    public isSinker: boolean = false;
    public isFiring: boolean = false;
    public zone: ZoneType;
    public rocking?: RockingState;
    public moveTrait!: MoveTrait;
    public crashableTrait?: CrashableTrait;
    public crewedTrait?: CrewedTrait;
    public harvesterTrait?: HarvesterTrait;
    public transportTrait?: TransportTrait;
    public gunnerTrait?: GunnerTrait;
    public turretTrait?: TurretTrait;
    public parasiteableTrait?: ParasiteableTrait;
    public submergibleTrait?: SubmergibleTrait;
    public tilterTrait?: TilterTrait;
    get isMoving(): boolean {
        return this.moveTrait.isMoving();
    }
    static factory(owner: any, rules: VehicleRules, terrain: TerrainInfo, gameRules: GameRules, moveRules: any): Vehicle {
        const vehicle = new this(owner, rules, terrain);
        vehicle.isSinker = !rules.underwater &&
            (rules.weight >= gameRules.general.shipSinkingWeight || !rules.naval);
        vehicle.moveTrait = new MoveTrait(vehicle as any, moveRules);
        vehicle.traits.add(vehicle.moveTrait);
        if (rules.crashable) {
            vehicle.crashableTrait = new CrashableTrait(vehicle);
            vehicle.traits.add(vehicle.crashableTrait);
        }
        if (rules.crewed) {
            vehicle.crewedTrait = new CrewedTrait();
            vehicle.traits.add(vehicle.crewedTrait);
        }
        if (rules.harvester) {
            vehicle.harvesterTrait = new HarvesterTrait(rules.storage);
            vehicle.traits.add(vehicle.harvesterTrait);
        }
        if (rules.passengers) {
            vehicle.transportTrait = new TransportTrait(vehicle);
            vehicle.traits.add(vehicle.transportTrait);
            if (rules.gunner) {
                vehicle.gunnerTrait = new GunnerTrait();
                vehicle.traits.add(vehicle.gunnerTrait);
            }
        }
        if (rules.turret) {
            vehicle.turretTrait = new TurretTrait();
            vehicle.traits.add(vehicle.turretTrait);
        }
        if (!(rules.consideredAircraft && !rules.landable)) {
            vehicle.traits.add(new DockableTrait());
        }
        if (rules.parasiteable) {
            vehicle.parasiteableTrait = new ParasiteableTrait(vehicle);
            vehicle.traits.add(vehicle.parasiteableTrait);
        }
        if (rules.naval && rules.underwater) {
            vehicle.submergibleTrait = new SubmergibleTrait();
            vehicle.traits.add(vehicle.submergibleTrait);
        }
        if (rules.locomotor === LocomotorType.Hover) {
            vehicle.traits.add(new HoverBobTrait());
        }
        if ([LocomotorType.Vehicle, LocomotorType.Chrono].includes(rules.locomotor) &&
            terrain.isVoxel) {
            vehicle.tilterTrait = new TilterTrait();
            vehicle.traits.add(vehicle.tilterTrait);
        }
        return vehicle;
    }
    constructor(owner: any, rules: VehicleRules, terrain: TerrainInfo) {
        super(ObjectType.Vehicle as any, owner, rules, terrain);
        this.zone = rules.naval ? ZoneType.Water : ZoneType.Ground;
    }
    isUnit(): boolean {
        return true;
    }
    isVehicle(): boolean {
        return true;
    }
    getUiName(): string {
        if (this.gunnerTrait) {
            const specialWeaponIndex = this.armedTrait.getSpecialWeaponIndex();
            const ifvModeName = this.gunnerTrait.getUiNameForIfvMode(specialWeaponIndex, this.transportTrait?.units[0]?.name);
            const baseName = "name:" + this.name;
            return ifvModeName ? `{${ifvModeName}} {${baseName}}` : baseName;
        }
        return super.getUiName();
    }
    update(deltaTime: number): void {
        if (this.rocking) {
            this.rocking.ticksLeft--;
            if (!this.rocking.ticksLeft) {
                this.rocking = undefined;
            }
        }
        super.update(deltaTime);
    }
    applyRocking(facing: number, factor: number): void {
        if (!this.rules.consideredAircraft) {
            this.rocking = {
                ticksLeft: this.rocking?.ticksLeft ?? ROCKING_TICKS,
                facing: facing,
                factor: factor
            };
        }
    }
}
