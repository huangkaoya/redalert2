import { Action } from './Action';
import { DataStream } from '@/data/DataStream';
import { BuildingPlaceEvent } from '../event/BuildingPlaceEvent';
import { ProductionQueue, QueueStatus } from '../player/production/ProductionQueue';
import { TechnoRules, FactoryType } from '../rules/TechnoRules';
import { FactoryTrait, FactoryStatus } from '../gameobject/trait/FactoryTrait';
import { ActionType } from './ActionType';
import { BuildingFailedPlaceEvent } from '../event/BuildingFailedPlaceEvent';
import { NotifyPlaceBuilding } from '../trait/interface/NotifyPlaceBuilding';
import { ObjectType } from '@/engine/type/ObjectType';
import { Game } from '../Game';
import { Tile } from '../map/Tile';
import { Player } from '@/game/Player';
import { GameObject } from '../gameobject/GameObject';

export class PlaceBuildingAction extends Action {
  private game: Game;
  private buildingRules: TechnoRules;
  private tile: { x: number; y: number };

  constructor(game: Game) {
    super(ActionType.PlaceBuilding);
    this.game = game;
  }

  unserialize(data: Uint8Array): void {
    const stream = new DataStream(data);
    this.buildingRules = this.game.rules.getTechnoByInternalId(
      stream.readUint32(),
      ObjectType.Building
    );
    this.tile = { 
      x: stream.readUint16(), 
      y: stream.readUint16() 
    };
  }

  serialize(): Uint8Array {
    const stream = new DataStream(8);
    stream.writeUint32(this.buildingRules.index);
    stream.writeUint16(this.tile.x);
    stream.writeUint16(this.tile.y);
    return stream.toUint8Array();
  }

  print(): string {
    return `Place building ${this.buildingRules.name} at tile (${this.tile.x}, ${this.tile.y})`;
  }

  process(): void {
    const tile = this.game.map.tiles.getByMapCoords(this.tile.x, this.tile.y);
    
    if (tile) {
      const player = this.player;
      const building = this.tryPlaceBuilding(player, tile);
      
      if (building) {
        this.game.traits
          .filter(NotifyPlaceBuilding)
          .forEach(trait => {
            trait[NotifyPlaceBuilding.onPlace](building, this.game);
          });
        this.game.events.dispatch(new BuildingPlaceEvent(building));
      } else {
        this.game.events.dispatch(
          new BuildingFailedPlaceEvent(this.buildingRules.name, player, tile)
        );
      }
    } else {
      console.warn(`Tile ${this.tile.x},${this.tile.y} doesn't exist`);
    }
  }

  private tryPlaceBuilding(player: Player, tile: Tile): GameObject | undefined {
    const buildingRules = this.buildingRules;
    
    if (player.production) {
      const queue = player.production.getQueueForObject(buildingRules);
      
      if (queue.status === QueueStatus.Ready && queue.getFirst().rules === buildingRules) {
        const worker = this.game.getConstructionWorker(player);
        
        if (player.production.isAvailableForProduction(buildingRules) && 
            worker.canPlaceAt(buildingRules.name, tile, { normalizedTile: true })) {
          
          const placed = worker.placeAt(buildingRules.name, tile, true);
          player.addUnitsBuilt(buildingRules, 1);
          queue.shift(buildingRules, 1);
          
          const factory = player.production.getPrimaryFactory(FactoryType.BuildingType);
          if (factory) {
            factory.factoryTrait.status = FactoryStatus.Delivering;
          }
          
          return placed[0];
        }
      }
    }
    
    return undefined;
  }
}
