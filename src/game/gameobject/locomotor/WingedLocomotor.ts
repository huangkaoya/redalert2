import { Coords } from "@/game/Coords";
import { FacingUtil } from "@/game/gameobject/unit/FacingUtil";
import { TargetUtil } from "@/game/gameobject/unit/TargetUtil";
import { circleContainsPoint } from "@/util/geometry";
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
import { ObjectLiftOffEvent } from "@/game/event/ObjectLiftOffEvent";
import { ObjectLandEvent } from "@/game/event/ObjectLandEvent";
import { SpeedType } from "@/game/type/SpeedType";
import { MoveToDockTask } from "@/game/gameobject/task/MoveToDockTask";
import { NotifyTick } from "@/game/gameobject/trait/interface/NotifyTick";
import { Vector2 } from "@/game/math/Vector2";
import { Vector3 } from "@/game/math/Vector3";
import { lerp } from "@/util/math";
import { GameMath } from "@/game/math/GameMath";
enum ManeuverType {
    None = 0,
    CircleStrafe = 1,
    HoverStrafe = 2
}
interface Unit {
    zone: ZoneType;
    tile: any;
    rules: any;
    unitOrderTrait: any;
    spawnLinkTrait?: any;
    airportBoundTrait?: any;
    direction: number;
    position: any;
    onBridge: boolean;
    moveTrait: any;
    attackTrait?: any;
    crashableTrait: any;
    roll: number;
    pitch: number;
    tileElevation: number;
    isUnit(): boolean;
}
interface Game {
    map: any;
    events: any;
    rules: any;
    crateGeneratorTrait: any;
    generateRandomInt(min: number, max: number): number;
}
interface CrashState {
    rollDelta?: number;
    pitchDelta?: number;
}
export class WingedLocomotor {
    private game: Game;
    private allowOutOfBounds: boolean = true;
    private lastDestLeptons: Vector2;
    private currentMoveDir: Vector2;
    private currentHorizSpeed: number = 0;
    private maneuverType: ManeuverType = ManeuverType.None;
    private deceleratingToTurn: boolean = false;
    private cancelDestLeptons?: Vector2;
    private thrustFacing?: number;
    static tickStationary(s: Unit, a: Game): void {
        if (s.zone === ZoneType.Air) {
            const n = s.tile.onBridgeLandType
                ? a.map.tileOccupation.getBridgeOnTile(s.tile)
                : undefined;
            let e = s.rules.landable &&
                !s.unitOrderTrait.getCurrentTask()?.preventLanding;
            const i = s.spawnLinkTrait?.getParent();
            if (e && i) {
                e = !(((!i.isUnit() || !i.onBridge) && n) ||
                    i.tile !== s.tile);
            }
            else if (e && !s.airportBoundTrait) {
                e = a.map.getTileZone(s.tile) !== ZoneType.Water &&
                    0 < a.map.terrain.getPassableSpeed(s.tile, SpeedType.Foot, true, !!s.tile.onBridgeLandType) &&
                    0 === a.map.terrain.findObstacles({ tile: s.tile, onBridge: n }, s).length;
            }
            let r: number;
            if (e) {
                const dockTrait = s.airportBoundTrait?.preferredAirport?.dockTrait;
                const o = dockTrait?.isDocked(s) || dockTrait?.hasReservedDockForUnit(s);
                if (!s.airportBoundTrait || o) {
                    const l = o ? 0 : 270;
                    if (s.direction !== l) {
                        s.direction = FacingUtil.tick(s.direction, l, s.rules.rot).facing;
                        return;
                    }
                }
                if (s.airportBoundTrait) {
                    let airport = s.airportBoundTrait.preferredAirport;
                    if (!airport?.dockTrait?.isDocked(s)) {
                        if (!airport?.dockTrait?.getAvailableDockCount()) {
                            airport = s.airportBoundTrait.findAvailableAirport(s);
                            s.airportBoundTrait.preferredAirport = airport;
                            if (airport) {
                                const dockNumber = airport.dockTrait.getFirstAvailableDockNumber();
                                airport.dockTrait.reserveDockAt(s, dockNumber);
                            }
                        }
                        if (airport) {
                            s.unitOrderTrait.addTask(new MoveToDockTask(a, airport));
                            s.unitOrderTrait[NotifyTick.onTick](s, a);
                        }
                        else {
                            s.crashableTrait.crash(undefined);
                        }
                        return;
                    }
                }
                const t = i
                    ? i.tile.z + i.tileElevation
                    : s.tile.z + (n?.tileElevation ?? 0);
                r = Coords.tileHeightToWorld(t);
            }
            else {
                const t = s.tile.z + (n?.tileElevation ?? 0);
                const c = s.rules.flightLevel ?? a.rules.general.flightLevel;
                r = Coords.tileHeightToWorld(t) + c;
            }
            const currentY = s.position.worldPosition.y;
            if (r !== currentY) {
                const distance = Math.abs(r - currentY);
                const deltaY = Math.sign(r - currentY) * Math.min(30, distance);
                const oldElevation = s.tileElevation;
                s.position.moveByLeptons3(new Vector3(0, deltaY, 0));
                s.moveTrait.handleElevationChange(oldElevation, a);
            }
            else if (e) {
                s.zone = ZoneType.Ground;
                if (i) {
                    i.airSpawnTrait.storeAircraft(s, a);
                }
                else {
                    s.onBridge = !!n;
                }
                a.events.dispatch(new ObjectLandEvent(s));
                const crate = a.map.tileOccupation
                    .getGroundObjectsOnTile(s.tile)
                    .find((e: any) => e.isOverlay() && e.rules.crate);
                if (crate) {
                    a.crateGeneratorTrait.pickupCrate(s, crate, a);
                }
            }
        }
    }
    static tickCrash(e: Unit, t: Game, i: CrashState): Vector3 {
        if (i.rollDelta === undefined) {
            i.rollDelta = t.generateRandomInt(-15, 15);
        }
        if (i.pitchDelta === undefined) {
            i.pitchDelta = t.generateRandomInt(0, 15);
        }
        e.roll += i.rollDelta;
        e.pitch += i.pitchDelta;
        const r = Coords.vecWorldToGround(e.moveTrait.velocity);
        return new Vector3(r.x, -30, r.y);
    }
    constructor(game: Game) {
        this.game = game;
        this.allowOutOfBounds = true;
        this.lastDestLeptons = new Vector2();
        this.currentMoveDir = new Vector2();
        this.currentHorizSpeed = 0;
        this.maneuverType = ManeuverType.None;
        this.deceleratingToTurn = false;
    }
    onNewWaypoint(e: Unit, t: any, i: Vector2): void {
        this.currentHorizSpeed = Coords.vecWorldToGround(e.moveTrait.velocity).length();
        this.cancelDestLeptons = undefined;
    }
    tick(t: Unit, e: any, i: Vector2, r: boolean): {
        distance: Vector3;
        done: boolean;
    } {
        if (r) {
            if (!this.cancelDestLeptons) {
                let tile = t.tile;
                if (!this.game.map.isWithinBounds(tile)) {
                    tile = this.game.map.clampWithinBounds(tile);
                }
                this.cancelDestLeptons = this.computeCancelDest(tile, i);
            }
            i = this.cancelDestLeptons;
        }
        const s = t.position.getMapPosition();
        const a = i.clone().sub(s);
        const n = a.length();
        if (!this.lastDestLeptons.equals(i)) {
            this.lastDestLeptons.copy(i);
            if (r) {
                this.maneuverType = ManeuverType.HoverStrafe;
            }
            else if (t.zone === ZoneType.Air && this.currentHorizSpeed < 5) {
                this.maneuverType = n > Coords.LEPTONS_PER_TILE
                    ? ManeuverType.CircleStrafe
                    : ManeuverType.HoverStrafe;
            }
            else {
                this.maneuverType = ManeuverType.None;
            }
            this.deceleratingToTurn = false;
        }
        if (t.zone !== ZoneType.Air) {
            t.onBridge = false;
            t.zone = ZoneType.Air;
            this.game.events.dispatch(new ObjectLiftOffEvent(t));
        }
        const o = t.tile.onBridgeLandType
            ? this.game.map.tileOccupation.getBridgeOnTile(t.tile)
            : undefined;
        const l = t.tile.z + (o?.tileElevation ?? 0);
        const flightLevel = t.rules.flightLevel ?? this.game.rules.general.flightLevel;
        const h = Coords.tileHeightToWorld(l) + flightLevel;
        const currentY = t.position.worldPosition.y;
        const u = FacingUtil.fromMapCoords(a);
        if (t.direction === u &&
            this.maneuverType === ManeuverType.None &&
            n <= Coords.LEPTONS_PER_TILE) {
            this.maneuverType = ManeuverType.HoverStrafe;
        }
        else if (t.direction === u &&
            this.maneuverType === ManeuverType.CircleStrafe) {
            this.maneuverType = ManeuverType.None;
        }
        let d: number;
        switch (this.maneuverType) {
            case ManeuverType.HoverStrafe:
                if (t.attackTrait?.currentTarget) {
                    const targetPos = Coords.vecWorldToGround(t.attackTrait.currentTarget.getWorldCoords());
                    d = FacingUtil.fromMapCoords(targetPos.sub(s));
                }
                else {
                    d = t.airportBoundTrait?.preferredAirport?.dockTrait?.hasReservedDockForUnit(t)
                        ? 0
                        : 270;
                }
                break;
            case ManeuverType.CircleStrafe:
            case ManeuverType.None:
                d = u;
                break;
            default:
                throw new Error('Unknown maneuver type "' + this.maneuverType + '"');
        }
        const { facing: g, delta: p } = FacingUtil.tick(t.direction, d, t.rules.rot);
        t.direction = g;
        t.roll = Math.sign(p) * t.rules.pitchAngle;
        let m: number;
        switch (this.maneuverType) {
            case ManeuverType.HoverStrafe:
                m = u;
                break;
            case ManeuverType.CircleStrafe:
                m = (g - 90 * Math.sign(p) + 360) % 360;
                break;
            case ManeuverType.None:
                m = g;
                break;
            default:
                throw new Error('Unknown maneuver type "' + this.maneuverType + '"');
        }
        if (this.thrustFacing === undefined) {
            this.thrustFacing = m;
        }
        const rotSpeed = this.currentHorizSpeed > 5
            ? t.rules.rot
            : Number.POSITIVE_INFINITY;
        const { facing: c, delta: deltaThrust } = FacingUtil.tick(this.thrustFacing, m, rotSpeed);
        this.thrustFacing = c;
        this.currentMoveDir.copy(FacingUtil.toMapCoords(this.thrustFacing));
        let f = false;
        let y = 0;
        let T = 0;
        let v = true;
        if (h !== currentY) {
            const heightDiff = Math.abs(h - currentY);
            y = Math.sign(h - currentY) * Math.min(30, heightDiff);
            v = heightDiff <= 30;
        }
        let b = t.rules.speed;
        if (n <= Coords.LEPTONS_PER_TILE &&
            this.maneuverType !== ManeuverType.CircleStrafe) {
            b = lerp(1, b / 2, GameMath.sqrt(n / Coords.LEPTONS_PER_TILE));
        }
        if (this.deceleratingToTurn) {
            this.currentHorizSpeed = Math.max(0, this.currentHorizSpeed - 2);
        }
        else {
            this.currentHorizSpeed = Math.min(this.currentHorizSpeed + 2, b);
        }
        const S = this.currentHorizSpeed;
        this.deceleratingToTurn = false;
        if (deltaThrust) {
            const turnCircle = (S || deltaThrust)
                ? TargetUtil.computeTurnCircle(s, this.currentMoveDir, Math.sign(deltaThrust) * t.rules.rot, S)
                : undefined;
            if ((S !== 0 && !circleContainsPoint(turnCircle, i)) ||
                (this.maneuverType === ManeuverType.HoverStrafe ||
                    n > Coords.LEPTONS_PER_TILE
                    ? (this.deceleratingToTurn = true)
                    : this.maneuverType === ManeuverType.None &&
                        (this.maneuverType = ManeuverType.HoverStrafe))) {
            }
            T = S;
            f = false;
        }
        else {
            T = Math.min(S, n);
            f = n <= S;
        }
        let w: Vector2;
        if (n < 1) {
            f = true;
            w = a;
        }
        else if (f) {
            w = a;
        }
        else {
            w = this.currentMoveDir.clone().setLength(T);
        }
        const C = new Vector3(w.x, y, w.y);
        const velocity = C.clone();
        t.moveTrait.velocity.copy(velocity);
        return { distance: C, done: f && v };
    }
    computeCancelDest(e: any, t: Vector2): Vector2 {
        const tileAligned = t
            .clone()
            .multiplyScalar(1 / Coords.LEPTONS_PER_TILE)
            .floor()
            .multiplyScalar(Coords.LEPTONS_PER_TILE);
        const offset = t.clone().sub(tileAligned);
        return new Vector2(e.rx, e.ry)
            .multiplyScalar(Coords.LEPTONS_PER_TILE)
            .add(offset);
    }
}
