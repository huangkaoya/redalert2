/**
 * Local shim for @chronodivide/game-api.
 * Re-exports all game API types needed by the supalosa bot from local sources.
 */

export { ActionsApi } from '@/game/api/ActionsApi';
export { GameApi } from '@/game/api/GameApi';
export { MapApi } from '@/game/api/MapApi';
export { ProductionApi } from '@/game/api/ProductionApi';
export { Bot } from '@/game/bot/Bot';
export { ObjectType } from '@/engine/type/ObjectType';
export { OrderType } from '@/game/order/OrderType';
export { SideType } from '@/game/SideType';
export { QueueType } from '@/game/player/production/ProductionQueue';
export { QueueStatus } from '@/game/player/production/ProductionQueue';
export { GameMath } from '@/game/math/GameMath';
export { Box2 } from '@/game/math/Box2';
export { Vector2 } from '@/game/math/Vector2';
export { LandType } from '@/game/type/LandType';
export { SpeedType } from '@/game/type/SpeedType';
export { MovementZone } from '@/game/type/MovementZone';
export { TerrainType } from '@/engine/type/TerrainType';
export { AttackState } from '@/game/gameobject/trait/AttackTrait';
export { StanceType } from '@/game/gameobject/infantry/StanceType';
export { ZoneType } from '@/game/gameobject/unit/ZoneType';
export { FactoryType } from '@/game/rules/TechnoRules';
export { TechnoRules } from '@/game/rules/TechnoRules';

// Re-export event types
export { ApiEventType } from '@/game/api/EventsApi';

// Re-export interfaces
export type { GameObjectData } from '@/game/api/interface/GameObjectData';
export type { PlayerData } from '@/game/api/interface/PlayerData';
export type { UnitData } from '@/game/api/interface/UnitData';
export type { PathNode } from '@/game/api/interface/PathNode';
export type { Tile } from '@/game/map/Tile';

// Types not directly exported from the original codebase - define locally

/**
 * ApiEvent union type matching events dispatched by EventsApi.
 */
export type ApiEvent = {
    type: number;
    objectId?: number;
    attackerInfo?: {
        playerName: string;
        objectId?: number;
    };
    [key: string]: any;
};

/**
 * BotContext - provides structured access to game, player, and APIs.
 * Used by the supalosa bot's mission/strategy system.
 */
export interface BotContext {
    readonly game: import('@/game/api/GameApi').GameApi;
    readonly player: {
        readonly name: string;
        readonly actions: import('@/game/api/ActionsApi').ActionsApi;
        readonly production: import('@/game/api/ProductionApi').ProductionApi;
    };
}

/**
 * Size interface for map dimensions.
 */
export interface Size {
    width: number;
    height: number;
}
