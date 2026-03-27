/**
 * Example AI Bot for Red Alert 2 Web
 *
 * This bot is written as JavaScript-compatible TypeScript so it runs
 * directly in the sandbox without compilation.  Type information lives
 * in JSDoc comments and the companion README.
 *
 * To use as an uploaded bot:
 *   1. Zip this file so bot.ts is at the zip root
 *   2. Upload the zip in the game's lobby → "Upload AI Bot" dialog
 *
 * Context object received in onGameStart / onGameTick:
 *   ctx.gameApi        - read-only game state queries
 *   ctx.actionsApi     - issue commands (build, order units, production)
 *   ctx.productionApi  - query production queues
 *   ctx.logger         - logging (info, warn, error, debug)
 *   ctx.playerName     - this bot's player name
 *   ctx.country        - this bot's country name
 */

// ---- Constants (must match engine enums) ----

var QueueType = { Structures: 0, Armory: 1, Infantry: 2, Vehicles: 3, Aircrafts: 4, Ships: 5 };
var QueueStatus = { Idle: 0, Active: 1, OnHold: 2, Ready: 3 };
var OrderType = { Move: 0, ForceMove: 1, Attack: 2, ForceAttack: 3, AttackMove: 4, Guard: 5, GuardArea: 6, Capture: 7, Occupy: 8, Deploy: 9, DeploySelected: 10, Stop: 11, Gather: 14 };
var ObjectType = { None: 0, Aircraft: 1, Building: 2, Infantry: 3, Overlay: 4, Smudge: 5, Terrain: 6, Vehicle: 7 };

// ---- Faction data ----

var ALLIED_COUNTRIES = [
    "Americans", "British", "French", "Germans", "Koreans", "Alliance",
];

var ALLIED_BUILD_ORDER = [
    { name: "GAPOWR", queue: QueueType.Structures, type: ObjectType.Building },  // Power Plant
    { name: "GAREFN", queue: QueueType.Structures, type: ObjectType.Building },  // Refinery
    { name: "GAPILE", queue: QueueType.Structures, type: ObjectType.Building },  // Barracks
    { name: "GAWEAP", queue: QueueType.Structures, type: ObjectType.Building },  // War Factory
    { name: "GAPOWR", queue: QueueType.Structures, type: ObjectType.Building },  // 2nd Power Plant
    { name: "GAREFN", queue: QueueType.Structures, type: ObjectType.Building },  // 2nd Refinery
];

var SOVIET_BUILD_ORDER = [
    { name: "NAPOWR", queue: QueueType.Structures, type: ObjectType.Building },  // Tesla Reactor
    { name: "NAREFN", queue: QueueType.Structures, type: ObjectType.Building },  // Refinery
    { name: "NAHAND", queue: QueueType.Structures, type: ObjectType.Building },  // Barracks
    { name: "NAWEAP", queue: QueueType.Structures, type: ObjectType.Building },  // War Factory
    { name: "NAPOWR", queue: QueueType.Structures, type: ObjectType.Building },  // 2nd Tesla Reactor
    { name: "NAREFN", queue: QueueType.Structures, type: ObjectType.Building },  // 2nd Refinery
];

var ALLIED_UNITS = [
    { name: "MTNK", queue: QueueType.Vehicles, type: ObjectType.Vehicle },   // Grizzly Tank
    { name: "MTNK", queue: QueueType.Vehicles, type: ObjectType.Vehicle },
    { name: "E1",   queue: QueueType.Infantry, type: ObjectType.Infantry },   // GI
    { name: "FV",   queue: QueueType.Vehicles, type: ObjectType.Vehicle },    // IFV
];

var SOVIET_UNITS = [
    { name: "HTNK", queue: QueueType.Vehicles, type: ObjectType.Vehicle },   // Rhino Tank
    { name: "HTNK", queue: QueueType.Vehicles, type: ObjectType.Vehicle },
    { name: "E2",   queue: QueueType.Infantry, type: ObjectType.Infantry },   // Conscript
    { name: "HTK",  queue: QueueType.Vehicles, type: ObjectType.Vehicle },    // Flak Track
];

var POWER_BUILDING = {
    allied: { name: "GAPOWR", queue: QueueType.Structures, type: ObjectType.Building },
    soviet: { name: "NAPOWR", queue: QueueType.Structures, type: ObjectType.Building },
};

// ---- Bot implementation ----

function createExampleBot(playerName, country) {
    var isAllied = ALLIED_COUNTRIES.indexOf(country) !== -1;
    var buildOrder = (isAllied ? ALLIED_BUILD_ORDER : SOVIET_BUILD_ORDER).slice();
    var unitPool = isAllied ? ALLIED_UNITS : SOVIET_UNITS;
    var powerBuilding = isAllied ? POWER_BUILDING.allied : POWER_BUILDING.soviet;

    var buildOrderIndex = 0;
    var unitPoolIndex = 0;
    var startLocation = { rx: 50, ry: 50 };
    var initialized = false;
    var lastBuildAttemptTick = 0;
    var lastUnitQueueTick = 0;
    var lastAttackTick = 0;

    // ---- Helpers ----

    function getMyCombatUnits(gameApi) {
        return gameApi.getVisibleUnits(playerName, "self", function (r) {
            return (r.type === ObjectType.Vehicle || r.type === ObjectType.Infantry)
                && !!r.primary;
        });
    }

    function getEnemyUnits(gameApi) {
        return gameApi.getVisibleUnits(playerName, "enemy");
    }

    function findPlacementNear(gameApi, buildingName, center) {
        var placementData = gameApi.getBuildingPlacementData(buildingName);
        if (!placementData) return null;

        // Start from radius 2 to leave room around conyard for unit movement
        for (var radius = 2; radius < 18; radius++) {
            for (var dx = -radius; dx <= radius; dx++) {
                for (var dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    var pos = { rx: center.rx + dx, ry: center.ry + dy };
                    if (gameApi.canPlaceBuilding(playerName, buildingName, pos)) {
                        return pos;
                    }
                }
            }
        }
        return null;
    }

    function isQueueIdle(productionApi, queueType) {
        var data = productionApi.getQueueData(queueType);
        return !!data && data.status === QueueStatus.Idle;
    }

    function isQueueReady(productionApi, queueType) {
        var data = productionApi.getQueueData(queueType);
        return !!data && data.status === QueueStatus.Ready;
    }

    // ---- Subsystems ----

    function handleDeployMCV(ctx) {
        var gameApi = ctx.gameApi, actionsApi = ctx.actionsApi, logger = ctx.logger;
        var mcvs = gameApi.getVisibleUnits(playerName, "self", function (r) { return !!r.deploysInto; });
        for (var i = 0; i < mcvs.length; i++) {
            var data = gameApi.getUnitData(mcvs[i]);
            if (data && data.isIdle) {
                actionsApi.orderUnits([mcvs[i]], OrderType.DeploySelected);
                logger.info("Deploying MCV");
                break;
            }
        }
    }

    function handleBuildOrder(ctx) {
        var gameApi = ctx.gameApi, actionsApi = ctx.actionsApi, productionApi = ctx.productionApi, logger = ctx.logger;
        var tick = gameApi.getCurrentTick();

        if (buildOrderIndex >= buildOrder.length) return;
        if (tick - lastBuildAttemptTick < 30) return;

        if (isQueueReady(productionApi, QueueType.Structures)) {
            var currentItem = buildOrder[buildOrderIndex];
            var placement = findPlacementNear(gameApi, currentItem.name, startLocation);
            if (placement) {
                actionsApi.placeBuilding(currentItem.name, placement.rx, placement.ry);
                logger.info("Placing " + currentItem.name + " at " + placement.rx + "," + placement.ry);
                buildOrderIndex++;
                lastBuildAttemptTick = tick;
            }
            return;
        }

        if (isQueueIdle(productionApi, QueueType.Structures)) {
            var nextItem = buildOrder[buildOrderIndex];
            actionsApi.queueForProduction(nextItem.queue, nextItem.name, nextItem.type, 1);
            logger.info("Queuing build: " + nextItem.name);
            lastBuildAttemptTick = tick;
        }
    }

    function handlePower(ctx) {
        var gameApi = ctx.gameApi, productionApi = ctx.productionApi, actionsApi = ctx.actionsApi, logger = ctx.logger;
        var playerData = gameApi.getPlayerData(playerName);
        if (!playerData || !playerData.power) return;

        if (playerData.power.drain > (playerData.power.total || playerData.power.output || 0) - 50) {
            if (isQueueIdle(productionApi, QueueType.Structures) && buildOrderIndex >= buildOrder.length) {
                actionsApi.queueForProduction(powerBuilding.queue, powerBuilding.name, powerBuilding.type, 1);
                logger.info("Queuing extra power plant (low power)");
                buildOrder.push(powerBuilding);
            }
        }
    }

    function handleUnitProduction(ctx) {
        var gameApi = ctx.gameApi, actionsApi = ctx.actionsApi, productionApi = ctx.productionApi, logger = ctx.logger;
        var tick = gameApi.getCurrentTick();

        if (tick - lastUnitQueueTick < 60) return;

        var vehicleData = productionApi.getQueueData(QueueType.Vehicles);
        if (vehicleData && vehicleData.status === QueueStatus.Idle) {
            var unit = unitPool[unitPoolIndex % unitPool.length];
            if (unit.queue === QueueType.Vehicles) {
                actionsApi.queueForProduction(unit.queue, unit.name, unit.type, 1);
                logger.info("Queuing unit: " + unit.name);
                unitPoolIndex++;
                lastUnitQueueTick = tick;
            }
        }

        var infantryData = productionApi.getQueueData(QueueType.Infantry);
        if (infantryData && infantryData.status === QueueStatus.Idle) {
            var inf = unitPool[unitPoolIndex % unitPool.length];
            if (inf.queue === QueueType.Infantry) {
                actionsApi.queueForProduction(inf.queue, inf.name, inf.type, 1);
                logger.info("Queuing infantry: " + inf.name);
                unitPoolIndex++;
                lastUnitQueueTick = tick;
            }
        }
    }

    function handleHarvesters(ctx) {
        var gameApi = ctx.gameApi, actionsApi = ctx.actionsApi;
        var harvesters = gameApi.getVisibleUnits(playerName, "self", function (r) {
            return !!r.harvester;
        });
        for (var i = 0; i < harvesters.length; i++) {
            var data = gameApi.getUnitData(harvesters[i]);
            if (data && data.isIdle) {
                actionsApi.orderUnits([harvesters[i]], OrderType.Gather);
            }
        }
    }

    function handleAttack(ctx) {
        var gameApi = ctx.gameApi, actionsApi = ctx.actionsApi, logger = ctx.logger;
        var tick = gameApi.getCurrentTick();

        if (tick - lastAttackTick < 450) return;

        var myUnits = getMyCombatUnits(gameApi);
        if (myUnits.length < 6) return;

        var enemies = getEnemyUnits(gameApi);
        if (enemies.length === 0) return;

        var targetData = gameApi.getGameObjectData(enemies[0]);
        if (!targetData || !targetData.tile) return;

        var idleUnits = myUnits.filter(function (id) {
            var d = gameApi.getUnitData(id);
            return d && d.isIdle;
        });

        if (idleUnits.length >= 4) {
            actionsApi.orderUnits(idleUnits, OrderType.AttackMove, targetData.tile.rx, targetData.tile.ry);
            logger.info("Sending " + idleUnits.length + " units to attack at " + targetData.tile.rx + "," + targetData.tile.ry);
            lastAttackTick = tick;
        }
    }

    // ---- Public interface ----

    return {
        onGameStart: function (ctx) {
            var gameApi = ctx.gameApi, logger = ctx.logger;
            logger.info("=== Example Bot Starting ===");
            logger.info("Player: " + playerName + ", Country: " + country + ", Side: " + (isAllied ? "Allied" : "Soviet"));

            var playerData = gameApi.getPlayerData(playerName);
            if (playerData && playerData.startLocation) {
                // startLocation from API is a Vector2 with x/y – convert to rx/ry
                var loc = playerData.startLocation;
                startLocation = { rx: loc.rx || loc.x, ry: loc.ry || loc.y };
                logger.info("Start location: " + startLocation.rx + "," + startLocation.ry);
            } else {
                logger.warn("No start location found, using fallback");
            }

            initialized = true;
        },

        onGameTick: function (ctx) {
            if (!initialized) return;

            var tick = ctx.gameApi.getCurrentTick();

            // Log heartbeat every 300 ticks
            if (tick % 300 === 0) {
                var pd = ctx.gameApi.getPlayerData(playerName);
                var units = ctx.gameApi.getVisibleUnits(playerName, "self");
                ctx.logger.info(
                    "[Heartbeat] tick=" + tick + " credits=" + (pd ? pd.credits : "?") +
                    " units=" + units.length + " buildIdx=" + buildOrderIndex + "/" + buildOrder.length
                );
            }

            handleDeployMCV(ctx);
            handleBuildOrder(ctx);
            handlePower(ctx);
            handleUnitProduction(ctx);
            handleHarvesters(ctx);
            handleAttack(ctx);
        },

        onGameEvent: function () {
            // Can react to events here (unit destroyed, etc.)
        },

        dispose: function () {
            // Cleanup if needed
        },
    };
}

// ---- Module export (CommonJS — required by BotSandbox) ----

module.exports = {
    id: "example-bot",
    displayName: "Example Bot",
    version: "1.0.0",
    author: "RedAlert2 Web",
    description: "A simple example AI that builds a base, trains units, and attacks enemies. Supports both Allied and Soviet factions.",
    createBot: createExampleBot,
};
