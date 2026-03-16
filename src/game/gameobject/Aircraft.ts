import { ObjectType } from '@/engine/type/ObjectType';
import { MoveTrait } from '@/game/gameobject/trait/MoveTrait';
import { ZoneType } from '@/game/gameobject/unit/ZoneType';
import { DockableTrait } from '@/game/gameobject/trait/DockableTrait';
import { Techno } from '@/game/gameobject/Techno';
import { ParasiteableTrait } from '@/game/gameobject/trait/ParasiteableTrait';
import { CrashableTrait } from '@/game/gameobject/trait/CrashableTrait';
import { AirportBoundTrait } from '@/game/gameobject/trait/AirportBoundTrait';
import { SpawnLinkTrait } from '@/game/gameobject/trait/SpawnLinkTrait';
import { MissileSpawnTrait } from '@/game/gameobject/trait/MissileSpawnTrait';
import { CrateBonuses } from '@/game/gameobject/unit/CrateBonuses';
import { UnlandableTrait } from '@/game/gameobject/trait/UnlandableTrait';
export class Aircraft extends Techno {
    pitch: number;
    yaw: number;
    roll: number;
    onBridge: boolean;
    zone: ZoneType;
    crateBonuses: CrateBonuses;
    moveTrait: MoveTrait;
    airportBoundTrait?: AirportBoundTrait;
    crashableTrait?: CrashableTrait;
    missileSpawnTrait?: MissileSpawnTrait;
    spawnLinkTrait?: SpawnLinkTrait;
    parasiteableTrait?: ParasiteableTrait;
    get direction() {
        return this.yaw;
    }
    set direction(value: number) {
        this.yaw = value;
    }
    get isMoving() {
        return this.moveTrait.isMoving();
    }
    static factory(id: string, rules: any, owner: any, gameRules: any, map: any) {
        const aircraft = new this(id, rules, owner);
        if (aircraft.rules.airportBound && aircraft.rules.dock.length) {
            aircraft.airportBoundTrait = new AirportBoundTrait(aircraft.rules.dock);
            aircraft.traits.add(aircraft.airportBoundTrait);
        }
        if (!aircraft.rules.missileSpawn) {
            aircraft.crashableTrait = new CrashableTrait(aircraft);
            aircraft.traits.add(aircraft.crashableTrait);
        }
        if (aircraft.rules.spawned) {
            if (aircraft.rules.missileSpawn) {
                aircraft.missileSpawnTrait = new MissileSpawnTrait();
                aircraft.traits.add(aircraft.missileSpawnTrait);
            }
            else {
                aircraft.spawnLinkTrait = new SpawnLinkTrait();
                aircraft.traits.add(aircraft.spawnLinkTrait);
            }
        }
        aircraft.moveTrait = new MoveTrait(aircraft, map);
        aircraft.traits.add(aircraft.moveTrait);
        if (rules.dock.length) {
            aircraft.traits.add(new DockableTrait());
        }
        if (!(rules.landable && id !== gameRules.general.paradrop.paradropPlane)) {
            aircraft.traits.add(new UnlandableTrait());
        }
        if (rules.parasiteable) {
            aircraft.parasiteableTrait = new ParasiteableTrait(aircraft);
            aircraft.traits.add(aircraft.parasiteableTrait);
        }
        return aircraft;
    }
    constructor(id: string, rules: any, owner: any) {
        super(ObjectType.Aircraft, id, rules, owner);
        this.pitch = 0;
        this.yaw = 0;
        this.roll = 0;
        this.onBridge = false;
        this.zone = ZoneType.Ground;
        this.crateBonuses = new CrateBonuses();
    }
    isUnit(): boolean {
        return true;
    }
    isAircraft(): boolean {
        return true;
    }
}
