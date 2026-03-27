# Example AI Bot

A simple example AI bot for Red Alert 2 Web. Supports both Allied and Soviet factions.

## Usage

1. Zip the contents of this folder (ensure `bot.ts` is at the zip root)
2. Upload the zip file in the game's bot upload interface
3. Start a game with an AI opponent — the uploaded bot will be used

The uploader accepts TypeScript (`.ts`) files directly — no compilation needed. Type annotations are automatically stripped at load time.

## Features

- Deploys MCV at game start
- Follows a build order: Power → Refinery → Barracks → War Factory → Power → Refinery
- Builds extra power plants when power runs low
- Trains tanks and infantry in a loop
- Sends idle harvesters to gather resources
- Attacks enemy positions when 6+ combat units are available

## API Reference

The bot's `onGameStart` and `onGameTick` callbacks receive a context object:

```
ctx.gameApi        - Read-only game state (players, units, map, rules)
ctx.actionsApi     - Issue commands (build, order units, queue production)
ctx.productionApi  - Query production queue status
ctx.logger         - Logging (info, warn, error, debug)
ctx.playerName     - This bot's player name
ctx.country        - This bot's country name
```

### Key gameApi Methods

| Method | Description |
|--------|-------------|
| `getPlayerData(name)` | Player info (credits, power, startLocation) |
| `getVisibleUnits(player, type, filter?)` | Get unit IDs ("self"/"enemy"/"allied") |
| `getUnitData(id)` | Unit details (tile, hitPoints, isIdle, weapons) |
| `getGameObjectData(id)` | Generic object data |
| `canPlaceBuilding(player, name, {rx, ry})` | Check if placement is valid |
| `getBuildingPlacementData(name)` | Get foundation size |
| `getCurrentTick()` | Current game tick |
| `mapApi` | Map, tile, and pathfinding queries |
| `rulesApi` | Game rules data |

### Key actionsApi Methods

| Method | Description |
|--------|-------------|
| `queueForProduction(queue, name, type, qty)` | Queue a unit/building |
| `placeBuilding(name, x, y)` | Place a completed building |
| `orderUnits(ids[], orderType, x?, y?)` | Issue orders to units |
| `sellBuilding(id)` | Sell a building |

### Queue Types

```
Structures: 0, Armory: 1, Infantry: 2, Vehicles: 3, Aircrafts: 4, Ships: 5
```

### Order Types

```
Move: 0, Attack: 2, AttackMove: 4, Guard: 5, Deploy: 9, Gather: 14
```

## Module Format

The bot must use CommonJS `module.exports`:

```typescript
(module as any).exports = {
    id: "unique-id",
    displayName: "Bot Name",
    version: "1.0.0",
    author: "Your Name",
    createBot: function(playerName: string, country: string) {
        return { onGameStart, onGameTick, onGameEvent, dispose };
    }
};
```
