import { Game } from "@/game/Game";
import { Player } from "@/game/Player";

export type TileCoord = any;

export enum EffectStatus {
  NotStarted = 0,
  Running = 1,
  Finished = 2
}

export abstract class SuperWeaponEffect {
  public type: any;
  public owner: Player;
  public tile: any;
  public status: EffectStatus;

  constructor(type: any, owner: Player, tile: any) {
    this.type = type;
    this.owner = owner;
    this.tile = tile;
    this.status = EffectStatus.NotStarted;
  }

  abstract onStart(game: Game): void;
  
  onTick(game: Game): boolean {
    return true;
  }
}
