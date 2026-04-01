import type { Building as BuildingType } from "@/game/gameobject/Building";
import type { Player as PlayerType } from "@/game/Player";
import type { GameObject as GameObjectType } from "@/game/gameobject/GameObject";
import type { Tile as TileType } from "@/game/map/Tile";
declare global {
    type GameContext = import("@/game/Game").Game;
    type Game = import("@/game/Game").Game;
    type Building = BuildingType;
    type Player = PlayerType;
    type Unit = any;
    type GameObject = GameObjectType;
    type Tile = TileType;
}
export {};
