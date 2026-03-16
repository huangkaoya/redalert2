import { TileCollection, TileDirection, Tile } from "@/game/map/TileCollection";
import { SpeedType } from "@/game/type/SpeedType";
import { Graph, GraphNode } from "@/util/Graph";
import { PathFinder } from "@/game/map/pathFinder/PathFinder";
import { isNotNullOrUndefined } from "@/util/typeGuard";
import { RadialTileFinder } from "@/game/map/tileFinder/RadialTileFinder";
import { rectContainsPoint } from "@/util/geometry";
import { LandType, getLandType } from "@/game/type/LandType";
import { OccupationBits } from "@/game/rules/TerrainRules";
import { MapBounds } from "@/game/map/MapBounds";
import { Rules } from "@/game/rules/Rules";
interface GameObject {
    tile: Tile;
    onBridge?: boolean;
    isTerrain(): boolean;
    isOverlay(): boolean;
    isBridge(): boolean;
    isTiberium(): boolean;
    isBuilding(): boolean;
    isAircraft(): boolean;
    isInfantry(): boolean;
    isVehicle(): boolean;
    isSmudge(): boolean;
    isHighBridge(): boolean;
    isBridgePlaceholder(): boolean;
    isUnit(): boolean;
    isDestroyed: boolean;
    rules: any;
    art: any;
    position: any;
    moveTrait: any;
}
interface Bridge {
    tileElevation?: number;
    isHighBridge(): boolean;
}
interface PathNode {
    tile: Tile;
    onBridge?: Bridge;
}
interface TileOccupation {
    onChange: {
        subscribe(handler: (event: {
            tiles: Tile[];
            object: GameObject;
        }) => void): void;
        unsubscribe(handler: (event: {
            tiles: Tile[];
            object: GameObject;
        }) => void): void;
    };
    calculateTilesForGameObject(tile: Tile, object: GameObject): Tile[];
    getBridgeOnTile(tile: Tile): Bridge | undefined;
    getObjectsOnTile(tile: Tile): GameObject[];
    getGroundObjectsOnTile(tile: Tile): GameObject[];
}
interface NodeData {
    tile: Tile;
    onBridge?: Bridge;
    islandId?: number;
}
interface PathOptions {
    maxExpandedNodes?: number;
    bestEffort?: boolean;
    excludeTiles?: (node: PathNode) => boolean;
    ignoredBlockers?: GameObject[];
}
interface Obstacle {
    obj: GameObject;
    static: boolean;
}
function calculateDistance(nodeA: GraphNode<NodeData>, nodeB: GraphNode<NodeData>): number {
    const dx = Math.abs(nodeA.data.tile.rx - nodeB.data.tile.rx);
    const dy = Math.abs(nodeA.data.tile.ry - nodeB.data.tile.ry);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
}
function calculateHeuristic(nodeA: GraphNode<NodeData>, nodeB: GraphNode<NodeData>, pathInfo?: {
    parent?: {
        node: GraphNode<NodeData>;
        dirX: number;
        dirY: number;
    };
    dirX?: number;
    dirY?: number;
}): number {
    const dx = Math.abs(nodeA.data.tile.rx - nodeB.data.tile.rx);
    const dy = Math.abs(nodeA.data.tile.ry - nodeB.data.tile.ry);
    let distance = dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
    if (pathInfo?.parent) {
        const parentNode = pathInfo.parent.node;
        const newDirX = parentNode.data.tile.rx - nodeA.data.tile.rx;
        const newDirY = parentNode.data.tile.ry - nodeA.data.tile.ry;
        pathInfo.dirX = newDirX;
        pathInfo.dirY = newDirY;
        if (newDirX !== pathInfo.parent.dirX || newDirY !== pathInfo.parent.dirY) {
            distance += 0.2;
        }
    }
    return distance;
}
export class Terrain {
    private passabilityGraphs = new Map<string, Graph<NodeData>>();
    private invalidatedTiles = new Map<string, Set<Tile>>();
    constructor(private tiles: TileCollection, private theaterType: any, private mapBounds: MapBounds, private tileOccupation: TileOccupation, private rules: Rules) {
        this.tileOccupation.onChange.subscribe(this.handleTileOccupationUpdate);
        this.mapBounds.onLocalResize.subscribe(this.handleMapBoundsResize);
    }
    private handleTileOccupationUpdate = ({ tiles, object }: {
        tiles: Tile[];
        object: GameObject;
    }) => {
        const relevantTiles = tiles.filter(tile => {
            let speedType = SpeedType.Foot;
            let isInfantry = true;
            if (object.isTerrain() &&
                object.rules.getOccupationBits(this.theaterType) !== OccupationBits.All) {
                speedType = SpeedType.Wheel;
                isInfantry = false;
            }
            return (object.isOverlay() && (object.isBridge() || object.isTiberium())) ||
                this.isBlockerObject(object, tile, false, speedType, isInfantry) ||
                this.isBlockerObject(object, tile, true, speedType, isInfantry) ||
                (object.isBuilding() && object.rules.leaveRubble);
        });
        if (relevantTiles.length) {
            this.invalidateTiles(relevantTiles);
        }
    };
    private handleMapBoundsResize = () => {
        this.passabilityGraphs.clear();
    };
    private getGraphKey(speedType: SpeedType, onBridge: boolean): string {
        return speedType + "_" + Number(onBridge);
    }
    private invalidateTiles(tiles: Tile[]): void {
        if (!tiles.length)
            return;
        [...this.passabilityGraphs.keys()].forEach(graphKey => {
            let invalidatedSet = this.invalidatedTiles.get(graphKey);
            if (invalidatedSet) {
                tiles.forEach(tile => invalidatedSet!.add(tile));
            }
            else {
                this.invalidatedTiles.set(graphKey, new Set(tiles));
            }
        });
    }
    computePath(speedType: SpeedType, onBridge: boolean, startTile: Tile, startOnBridge: boolean, endTile: Tile, endOnBridge: boolean, options: PathOptions = {}): PathNode[] {
        const { maxExpandedNodes = Number.POSITIVE_INFINITY, bestEffort = true, excludeTiles, ignoredBlockers = [] } = options;
        const graph = this.computePassabilityGraph(speedType, onBridge);
        const ignoredTiles = ignoredBlockers
            .map(blocker => this.tileOccupation.calculateTilesForGameObject(blocker.tile, blocker))
            .reduce((acc, tiles) => acc.concat(tiles), []);
        if (ignoredTiles.length) {
            this.updatePassability(ignoredTiles, speedType, onBridge, graph, ignoredBlockers);
        }
        const startNodeId = this.getNodeId(startTile, startOnBridge);
        const hasStartNode = graph.hasNode(startNodeId);
        if (!hasStartNode) {
            graph.addNode(startNodeId, {
                tile: startTile,
                onBridge: this.tileOccupation.getBridgeOnTile(startTile)
            });
            this.updatePassability([startTile], speedType, onBridge, graph, ignoredBlockers, 1);
        }
        const endNodeId = this.getNodeId(endTile, endOnBridge);
        const hasEndNode = graph.hasNode(endNodeId);
        let finalEndTile = endTile;
        let finalEndOnBridge = endOnBridge;
        const useIslandCheck = hasStartNode && !ignoredTiles.length;
        let islandChecker: ((tile: Tile, onBridge: boolean) => boolean) | undefined;
        if (useIslandCheck) {
            const islandIdMap = this.getIslandIdMap(speedType, onBridge);
            const startIslandId = islandIdMap.get(startTile, startOnBridge);
            islandChecker = (tile, onBridge) => islandIdMap.get(tile, onBridge) === startIslandId;
        }
        else {
            islandChecker = (tile, onBridge) => this.getPassableSpeed(tile, speedType, onBridge, onBridge, ignoredBlockers) > 0;
        }
        if (!hasEndNode || !islandChecker(endTile, endOnBridge)) {
            const fallbackTile = bestEffort ?
                new RadialTileFinder(this.tiles, this.mapBounds, endTile, { width: 1, height: 1 }, 1, useIslandCheck ? 15 : 5, (tile) => islandChecker!(tile, false) &&
                    Math.abs(tile.z - endTile.z) < 2 &&
                    !excludeTiles?.({ tile, onBridge: undefined })).getNextTile() : undefined;
            if (fallbackTile) {
                finalEndTile = fallbackTile;
                finalEndOnBridge = false;
            }
            else {
                if (useIslandCheck) {
                    if (ignoredTiles.length) {
                        this.updatePassability(ignoredTiles, speedType, onBridge, graph);
                    }
                    return [];
                }
                graph.addNode(endNodeId, { tile: endTile, onBridge: undefined });
                Math.min(maxExpandedNodes, 500);
            }
        }
        const pathFinder = new PathFinder(graph, {
            bestEffort,
            maxExpandedNodes,
            excludedNodes: excludeTiles,
            distance: calculateDistance,
            heuristic: calculateHeuristic
        });
        let path = pathFinder
            .find(this.getNodeId(startTile, startOnBridge), this.getNodeId(finalEndTile, finalEndOnBridge))
            .map((node: GraphNode<NodeData>) => ({
            tile: node.data.tile,
            onBridge: node.data.onBridge
        }));
        if ((path.length < 2) ||
            (excludeTiles && path.length &&
                ((!bestEffort && path[0].tile !== finalEndTile) ||
                    path[path.length - 1].tile !== startTile))) {
            path = [];
        }
        if (!hasStartNode) {
            graph.removeNode(startNodeId);
            this.updatePassability([startTile], speedType, onBridge, graph);
        }
        if (!hasEndNode) {
            graph.removeNode(endNodeId);
        }
        if (ignoredTiles.length) {
            this.updatePassability(ignoredTiles, speedType, onBridge, graph);
        }
        return path;
    }
    computeAllPassabilityGraphs(): void {
        Object.keys(SpeedType).forEach(key => {
            const speedType = Number(key);
            if (!isNaN(speedType) && speedType !== SpeedType.Winged) {
                this.computePassabilityGraph(speedType, false);
                this.computePassabilityGraph(speedType, true);
            }
        });
    }
    private computePassabilityGraph(speedType: SpeedType, onBridge: boolean): Graph<NodeData> {
        const graphKey = this.getGraphKey(speedType, onBridge);
        let graph = this.passabilityGraphs.get(graphKey);
        if (graph) {
            const invalidatedSet = this.invalidatedTiles.get(graphKey);
            if (invalidatedSet?.size) {
                this.updatePassability([...invalidatedSet], speedType, onBridge, graph);
                invalidatedSet.clear();
                this.computeIslandIds(graph);
            }
        }
        else {
            graph = new Graph<NodeData>();
            this.passabilityGraphs.set(graphKey, graph);
            this.tiles.forEach(tile => {
                this.computePassability(tile, speedType, onBridge, graph);
            });
            this.computeIslandIds(graph);
        }
        return graph;
    }
    private updatePassability(tiles: Tile[], speedType: SpeedType, onBridge: boolean, graph: Graph<NodeData>, ignoredBlockers: GameObject[] = [], forcePassable?: number): void {
        const affectedTiles = new Set<Tile>();
        tiles.forEach(tile => {
            [
                tile,
                this.tiles.getNeighbourTile(tile, TileDirection.Right),
                this.tiles.getNeighbourTile(tile, TileDirection.BottomRight),
                this.tiles.getNeighbourTile(tile, TileDirection.Bottom),
                this.tiles.getNeighbourTile(tile, TileDirection.BottomLeft)
            ]
                .filter(isNotNullOrUndefined)
                .forEach(t => affectedTiles.add(t));
        });
        const savedIslandIds = new Map<string, number | undefined>();
        tiles.forEach(tile => {
            const nodes = [
                graph.getNode(this.getNodeId(tile, false)),
                graph.getNode(this.getNodeId(tile, true))
            ];
            for (const node of nodes) {
                if (node) {
                    savedIslandIds.set(node.id, node.data.islandId);
                    graph.removeNode(node.id);
                }
            }
        });
        affectedTiles.forEach(tile => {
            this.computePassability(tile, speedType, onBridge, graph, ignoredBlockers, forcePassable && tiles.includes(tile) ? forcePassable : undefined);
        });
        savedIslandIds.forEach((islandId, nodeId) => {
            const node = graph.getNode(nodeId);
            if (node) {
                node.data.islandId = islandId;
            }
        });
    }
    private computePassability(tile: Tile, speedType: SpeedType, onBridge: boolean, graph: Graph<NodeData>, ignoredBlockers: GameObject[] = [], forcePassable?: number): void {
        const directions = [
            TileDirection.Left,
            TileDirection.TopLeft,
            TileDirection.Top,
            TileDirection.TopRight
        ];
        if (forcePassable || this.getPassableSpeed(tile, speedType, onBridge, false, ignoredBlockers)) {
            const nodeId = this.getNodeId(tile, false);
            if (!graph.hasNode(nodeId)) {
                graph.addNode(nodeId, { tile, onBridge: undefined });
            }
            for (const direction of directions) {
                this.connectTiles(tile, undefined, direction, speedType, onBridge, graph, ignoredBlockers);
            }
        }
        const bridge = this.tileOccupation.getBridgeOnTile(tile);
        if (bridge && (forcePassable || this.getPassableSpeed(tile, speedType, onBridge, true, ignoredBlockers))) {
            const nodeId = this.getNodeId(tile, true);
            if (!graph.hasNode(nodeId)) {
                graph.addNode(nodeId, { tile, onBridge: bridge });
            }
            for (const direction of directions) {
                this.connectTiles(tile, bridge, direction, speedType, onBridge, graph, ignoredBlockers);
            }
        }
    }
    private connectTiles(tile: Tile, bridge: Bridge | undefined, direction: TileDirection, speedType: SpeedType, onBridge: boolean, graph: Graph<NodeData>, ignoredBlockers: GameObject[] = []): void {
        const neighborTile = this.tiles.getNeighbourTile(tile, direction);
        if (!neighborTile)
            return;
        let neighborBridge = this.tileOccupation.getBridgeOnTile(neighborTile);
        const maxElevationDiff = (bridge || neighborBridge) ? 0 : 1;
        const elevationDiff = Math.abs(tile.z + (bridge?.tileElevation ?? 0) -
            (neighborTile.z + (neighborBridge?.tileElevation ?? 0)));
        if (elevationDiff > maxElevationDiff) {
            if ((!neighborBridge?.isHighBridge() && !bridge?.isHighBridge()) ||
                Math.abs(tile.z - neighborTile.z) !== 0 ||
                !graph.hasNode(this.getNodeId(tile, false))) {
                return;
            }
            bridge = neighborBridge = undefined;
        }
        if (!this.getPassableSpeed(neighborTile, speedType, onBridge, !!neighborBridge, ignoredBlockers)) {
            return;
        }
        const neighborNodeId = this.getNodeId(neighborTile, !!neighborBridge);
        const neighborNode = graph.getNode(neighborNodeId) ??
            graph.addNode(neighborNodeId, { tile: neighborTile, onBridge: neighborBridge });
        const currentNodeId = this.getNodeId(tile, !!bridge);
        const currentNode = graph.getNode(currentNodeId);
        if (currentNode) {
            currentNode.addLink(neighborNode);
        }
    }
    private getNodeId(tile: Tile, onBridge: boolean): string {
        return tile.id + (onBridge ? "_bridge" : "");
    }
    private computeIslandIds(graph: Graph<NodeData>): void {
        let islandId = 1;
        graph.forEachNode(node => {
            node.data.islandId = undefined;
        });
        graph.forEachNode(node => {
            if (!node.data.islandId) {
                this.floodIslandId(node, islandId++);
            }
        });
    }
    private floodIslandId(startNode: GraphNode<NodeData>, islandId: number): void {
        const queue = [startNode];
        while (queue.length) {
            const node = queue.pop()!;
            node.data.islandId = islandId;
            for (const neighbor of node.neighbors) {
                if (!neighbor.data.islandId) {
                    queue.push(neighbor);
                }
            }
        }
    }
    private getIslandIdMap(speedType: SpeedType, onBridge: boolean) {
        const graph = this.computePassabilityGraph(speedType, onBridge);
        return {
            get: (tile: Tile, onBridge: boolean): number | undefined => {
                const nodeId = this.getNodeId(tile, onBridge);
                return graph.getNode(nodeId)?.data.islandId;
            }
        };
    }
    private getPassableSpeed(tile: Tile, speedType: SpeedType, onBridge: boolean, bridgeLevel: boolean, ignoredBlockers: GameObject[] = [], skipBlockerCheck = false): number {
        if (!this.mapBounds.isWithinBounds(tile))
            return 0;
        let landType = bridgeLevel ? tile.onBridgeLandType : tile.landType;
        if (landType === undefined)
            return 0;
        if (landType === LandType.Wall && speedType === SpeedType.Track) {
            landType = getLandType(tile.terrainType);
        }
        const landRules = this.rules.getLandRules(landType);
        const speedModifier = landRules.getSpeedModifier(speedType);
        if (!speedModifier)
            return 0;
        if (!skipBlockerCheck) {
            for (const obj of this.tileOccupation.getObjectsOnTile(tile)) {
                if (this.isBlockerObject(obj, tile, bridgeLevel, speedType, onBridge) &&
                    !ignoredBlockers.includes(obj)) {
                    return 0;
                }
            }
        }
        return speedModifier;
    }
    private isBlockerObject(obj: GameObject, tile: Tile, bridgeLevel: boolean, speedType: SpeedType, isInfantry: boolean): boolean {
        if (obj.isTerrain() && isInfantry &&
            obj.rules.getOccupationBits(this.theaterType) !== OccupationBits.All) {
            return false;
        }
        if (obj.isBuilding()) {
            if (obj.rules.invisibleInGame)
                return false;
            if (obj.isDestroyed && obj.rules.leaveRubble)
                return false;
            if (obj.rules.gate)
                return false;
            const foundation = obj.art.foundation;
            let impassableRows = obj.rules.numberImpassableRows;
            if (isInfantry) {
                impassableRows = foundation.width;
            }
            else if (obj.rules.weaponsFactory && !impassableRows) {
                impassableRows = foundation.width - 1;
            }
            const rect = {
                x: obj.tile.rx,
                y: obj.tile.ry,
                width: (impassableRows || foundation.width) - 1,
                height: foundation.height - 1
            };
            return rectContainsPoint(rect, { x: tile.rx, y: tile.ry });
        }
        if (obj.isAircraft() || obj.isInfantry() || obj.isVehicle() || obj.isSmudge()) {
            return false;
        }
        if (obj.isOverlay()) {
            if ((bridgeLevel && obj.isBridge()) ||
                (!bridgeLevel && obj.isHighBridge()) ||
                obj.isTiberium() ||
                obj.rules.crate ||
                obj.isBridgePlaceholder()) {
                return false;
            }
        }
        if ([SpeedType.Track, SpeedType.Hover].includes(speedType) && obj.rules.crushable) {
            return false;
        }
        return true;
    }
    findObstacles(pathNode: PathNode, unit: GameObject): Obstacle[] {
        const speedType = unit.rules.speedType;
        const isInfantry = unit.isInfantry();
        const obstacles: Obstacle[] = [];
        for (const obj of this.tileOccupation.getGroundObjectsOnTile(pathNode.tile)) {
            if (obj === unit)
                continue;
            const isStaticBlocker = this.isBlockerObject(obj, pathNode.tile, !!pathNode.onBridge, speedType, isInfantry);
            let shouldInclude = false;
            if (isStaticBlocker) {
                shouldInclude = true;
            }
            else if (obj.isUnit()) {
                const sameLocation = (obj.tile === pathNode.tile && obj.onBridge === !!pathNode.onBridge);
                const inReservedPath = obj.moveTrait.reservedPathNodes.find((node: PathNode) => node.tile === pathNode.tile && !!node.onBridge === !!pathNode.onBridge);
                if (sameLocation || inReservedPath) {
                    shouldInclude = true;
                }
            }
            else if ([SpeedType.Track, SpeedType.Hover].includes(speedType) && obj.rules.crushable) {
                shouldInclude = true;
            }
            else if (isInfantry && obj.isTerrain()) {
                shouldInclude = true;
            }
            else if (obj.isBuilding() && obj.rules.gate) {
                shouldInclude = true;
            }
            if (shouldInclude) {
                const obstacle: Obstacle = { obj, static: isStaticBlocker };
                if (obj.isInfantry() && isInfantry) {
                    if (obj.position.desiredSubCell === unit.position.desiredSubCell) {
                        obstacles.push(obstacle);
                    }
                }
                else {
                    const skipForInfantryTerrain = obj.isTerrain() &&
                        isInfantry &&
                        !obj.rules.getOccupiedSubCells(this.theaterType).includes(unit.position.desiredSubCell);
                    if (!skipForInfantryTerrain) {
                        obstacles.push(obstacle);
                    }
                }
            }
        }
        return obstacles;
    }
    dispose(): void {
        this.tileOccupation.onChange.unsubscribe(this.handleTileOccupationUpdate);
        this.mapBounds.onLocalResize.unsubscribe(this.handleMapBoundsResize);
    }
}
