import { LeaveTransportEvent } from '@/game/event/LeaveTransportEvent';
import { FacingUtil } from '@/game/gameobject/unit/FacingUtil';
import { MovePositionHelper } from '@/game/gameobject/unit/MovePositionHelper';
import { MoveTask } from './move/MoveTask';
import { ScatterTask } from './ScatterTask';
import { Task } from './system/Task';
import { TurnTask } from './TurnTask';
import { WaitMinutesTask } from './system/WaitMinutesTask';
import { ZoneType } from '../unit/ZoneType';
import { CallbackTask } from './system/CallbackTask';

enum EvacuationState {
  None = 0,
  OnlyPassengers = 1,
  All = 2
}

interface EvacTarget {
  spawnNode: { tile: any; onBridge?: any };
  moveNode?: { tile: any; onBridge?: any };
  dir: number;
}

interface Unit {
  position: {
    tile: any;
    tileElevation: number;
  };
  onBridge: boolean;
  zone: ZoneType;
  owner: any;
  rules: {
    speedType: any;
    gunner?: boolean;
  };
  unitOrderTrait: {
    unmarkNextQueuedOrder(): void;
    addTask(task: Task): void;
  };
  isInfantry(): boolean;
}

interface Transport {
  name: string;
  tile: any;
  tileElevation: number;
  onBridge: boolean;
  zone: ZoneType;
  direction: number;
  rules: {
    gunner?: boolean;
  };
  transportTrait: {
    units: Unit[];
  };
}

interface Game {
  map: {
    getTileZone(tile: any, onGround: boolean): ZoneType;
    tiles: {
      getByMapCoords(x: number, y: number): any;
    };
    mapBounds: {
      isWithinBounds(tile: any): boolean;
    };
    terrain: {
      getPassableSpeed(tile: any, speedType: any, isInfantry: boolean, onBridge: boolean): number;
      findObstacles(position: { tile: any; onBridge?: any }, unit: Unit): any[];
    };
    tileOccupation: {
      getBridgeOnTile(tile: any): any;
    };
  };
  events: {
    dispatch(event: any): void;
  };
  destroyObject(obj: any, options: { player: any }): void;
  unlimboObject(obj: any, tile: any): void;
}

export class EvacuateTransportTask extends Task {
  private game: Game;
  private soft: boolean;
  private evacState: EvacuationState = EvacuationState.None;
  private evacTries: number = 0;
  private turnPerformed: boolean = false;
  public preventLanding: boolean = false;

  constructor(game: Game, soft: boolean) {
    super();
    this.game = game;
    this.soft = soft;
  }

  forceEvac(): void {
    this.evacState = EvacuationState.All;
  }

  onStart(transport: Transport): void {
    if (!transport.transportTrait) {
      throw new Error(`Object "${transport.name}" is not a valid transport`);
    }

    const transportTrait = transport.transportTrait;
    if (transportTrait.units.length > 0) {
      this.evacState = (this.evacState !== EvacuationState.OnlyPassengers && 
                       transportTrait.units.length !== 1) || 
                       !transport.rules.gunner
        ? EvacuationState.OnlyPassengers
        : EvacuationState.All;
    }
  }

  onTick(transport: Transport): boolean {
    if (this.isCancelling() || this.evacState === EvacuationState.None) {
      return true;
    }

    // Wait if in air
    if (transport.zone === ZoneType.Air) {
      this.children.push(
        new CallbackTask(() => transport.zone !== ZoneType.Air)
      );
      return false;
    }

    const units = transport.transportTrait.units;
    
    // Check if evacuation is complete
    if (!units.length || 
        (transport.rules.gunner && units.length === 1 && this.evacState !== EvacuationState.All)) {
      return true;
    }

    const unitToEvacuate = units[units.length - 1];
    const evacTarget = this.findValidEvacTarget(transport, unitToEvacuate);

    // Turn to face evacuation direction
    if (evacTarget && !this.turnPerformed) {
      this.turnPerformed = true;
      const targetDirection = (evacTarget.dir + 180) % 360;
      if (transport.direction !== targetDirection) {
        this.children.push(new TurnTask(targetDirection));
        return false;
      }
    }

    // Attempt evacuation
    if (this.evacuateUnit(unitToEvacuate, transport, evacTarget)) {
      units.pop();
      this.children.push(new WaitMinutesTask(1 / 60)); // ~1 second wait
      return false;
    }

    // Retry logic
    if (++this.evacTries <= 3) {
      this.children.push(new WaitMinutesTask(0.05)); // 3 second wait
      return false;
    }

    return true;
  }

  private evacuateUnit(unit: Unit, transport: Transport, evacTarget?: EvacTarget): boolean {
    if (!evacTarget) {
      // Hard evacuation - destroy unit if no valid position found
      if (!this.soft) {
        unit.position.tile = transport.tile;
        unit.position.tileElevation = transport.tileElevation;
        unit.onBridge = transport.onBridge;
        unit.zone = transport.zone;
        this.game.destroyObject(unit, { player: unit.owner });
        return true;
      }
      return false;
    }

    const { spawnNode, moveNode } = evacTarget;

    // Position unit at spawn location
    unit.position.tileElevation = spawnNode.onBridge?.tileElevation ?? 0;
    unit.onBridge = !!spawnNode.onBridge;
    unit.zone = this.game.map.getTileZone(spawnNode.tile, !spawnNode.onBridge);

    // Spawn unit on map
    this.game.unlimboObject(unit, spawnNode.tile);
    unit.unitOrderTrait.unmarkNextQueuedOrder();

    // Add movement task
    if (moveNode) {
      unit.unitOrderTrait.addTask(
        new MoveTask(this.game, moveNode.tile, !!moveNode.onBridge)
      );
    } else {
      unit.unitOrderTrait.addTask(new ScatterTask(this.game));
    }

    // Dispatch leave transport event
    this.game.events.dispatch(new LeaveTransportEvent(transport));
    return true;
  }

  private findValidEvacTarget(transport: Transport, unit: Unit): EvacTarget | undefined {
    const map = this.game.map;
    const moveHelper = new MovePositionHelper(map);
    const bridge = transport.onBridge 
      ? map.tileOccupation.getBridgeOnTile(transport.tile) 
      : undefined;
    const baseDirection = (transport.direction + 180) % 360;

    let fallbackTarget: EvacTarget | undefined;

    // Search in expanding arc pattern
    for (let angleOffset = 0; angleOffset <= 180; angleOffset += 45) {
      const directions = angleOffset && angleOffset < 180 
        ? [baseDirection + angleOffset, baseDirection - angleOffset]
        : [baseDirection];

      for (const direction of directions) {
        const mapCoords = FacingUtil.toMapCoords(direction);
        let currentTile = transport.tile;
        let currentBridge = bridge;
        let intermediateNode: { tile: any; onBridge?: any } | undefined;

        // Check positions at distance 1 and 2
        for (let distance = 1; distance <= 2; distance++) {
          if (distance === 2) {
            if (!intermediateNode) break;
            currentTile = intermediateNode.tile;
            currentBridge = intermediateNode.onBridge;
          }

          const targetX = transport.tile.rx + Math.sign(mapCoords.x) * distance;
          const targetY = transport.tile.ry + Math.sign(mapCoords.y) * distance;
          const targetTile = map.tiles.getByMapCoords(targetX, targetY);

          if (!targetTile || !map.mapBounds.isWithinBounds(targetTile)) {
            break;
          }

          // Check both bridge and ground positions
          const bridgeOptions = [map.tileOccupation.getBridgeOnTile(targetTile)];
          if (bridgeOptions[0]) {
            bridgeOptions.push(undefined);
          }

          for (const bridgeOption of bridgeOptions) {
            if (this.isValidEvacPosition(targetTile, bridgeOption, currentBridge, currentTile, unit)) {
              if (distance === 1) {
                intermediateNode = { tile: targetTile, onBridge: bridgeOption };
                fallbackTarget = {
                  spawnNode: intermediateNode,
                  moveNode: undefined,
                  dir: direction
                };
              } else {
                return {
                  spawnNode: intermediateNode!,
                  moveNode: { tile: targetTile, onBridge: bridgeOption },
                  dir: direction
                };
              }
            }
          }
        }
      }
    }

    return fallbackTarget;
  }

  private isValidEvacPosition(
    tile: any, 
    onBridge: any, 
    fromBridge: any, 
    fromTile: any, 
    unit: Unit
  ): boolean {
    const map = this.game.map;
    
    return map.terrain.getPassableSpeed(tile, unit.rules.speedType, unit.isInfantry(), !!onBridge) > 0 &&
           new MovePositionHelper(map).isEligibleTile(tile, onBridge, fromBridge, fromTile) &&
           !map.terrain.findObstacles({ tile, onBridge }, unit).length;
  }
}
