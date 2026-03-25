import { Coords } from "@/game/Coords";
import type { TargetLinesConfig } from "@/game/gameobject/task/system/TargetLinesConfig";
import { configHasTarget } from "@/game/gameobject/task/system/TargetLinesConfig";
import { equals } from "@/util/array";
import { WaypointLine } from "@/engine/renderable/entity/WaypointLine";
import * as THREE from "three";
enum VertexType {
    Source = 0,
    InitialTarget = 1,
    Waypoint = 2
}
interface Unit {
    isSpawned: boolean;
    owner: Player;
    position: {
        worldPosition: THREE.Vector3;
    };
    unitOrderTrait: {
        targetLinesConfig?: TargetLinesConfig;
        waypointPath?: WaypointPath;
        currentWaypoint?: Waypoint;
    };
    isUnit(): boolean;
}
interface Player {
}
interface Waypoint {
    original?: Waypoint;
    draft?: boolean;
    target: {
        getWorldCoords(): THREE.Vector3;
    };
}
interface WaypointPath {
    units: Set<Unit>;
    waypoints: Waypoint[];
}
interface PathNode {
    tile: {
        rx: number;
        ry: number;
        z: number;
    };
    onBridge?: {
        tileElevation: number;
    };
}
interface Target {
    position: {
        worldPosition: THREE.Vector3;
    };
}
interface UnitSelection {
    getHash(): string;
    getSelectedUnits(): Unit[];
    isSelected(unit: Unit): boolean;
}
interface Camera {
}
interface LineVertex {
    type: VertexType;
    enabled: boolean;
    lineHead: boolean;
    obj?: Unit;
    waypoint?: Waypoint;
    position: THREE.Vector3;
}
interface LinePath {
    vertices: LineVertex[];
    verticesNeedUpdate: boolean;
    color: number;
    bgColor: number;
    lineObj?: WaypointLine;
}
export class WaypointLines {
    private unitSelection: UnitSelection;
    private currentPlayer: Player;
    private selectedPaths: WaypointPath[];
    private paths: WaypointPath[];
    private camera: Camera;
    private lastPathWaypoints: Map<WaypointPath, Waypoint[]> = new Map();
    private sourceLinePaths: Map<Unit, LinePath> = new Map();
    private waypointLinePaths: Map<WaypointPath, LinePath> = new Map();
    private obj?: THREE.Object3D;
    private selectionHash?: string;
    private lastPaths?: WaypointPath[];
    constructor(unitSelection: UnitSelection, currentPlayer: Player, selectedPaths: WaypointPath[], paths: WaypointPath[], camera: Camera) {
        this.unitSelection = unitSelection;
        this.currentPlayer = currentPlayer;
        this.selectedPaths = selectedPaths;
        this.paths = paths;
        this.camera = camera;
    }
    create3DObject(): void {
        if (!this.obj) {
            this.obj = new THREE.Object3D();
            this.obj.name = "waypoint_lines";
            this.obj.matrixAutoUpdate = false;
        }
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.obj;
    }
    update(deltaTime: number): void {
        const currentHash = this.unitSelection.getHash();
        const selectionChanged = this.selectionHash === undefined || this.selectionHash !== currentHash;
        if (selectionChanged) {
            this.selectionHash = currentHash;
        }
        let pathsChanged = !this.lastPaths || !equals(this.lastPaths, this.paths);
        if (pathsChanged) {
            this.lastPaths = [...this.paths];
        }
        else {
            for (const path of this.paths) {
                const lastWaypoints = this.lastPathWaypoints.get(path);
                if (!lastWaypoints || !equals(path.waypoints, lastWaypoints)) {
                    pathsChanged = true;
                    this.lastPathWaypoints.set(path, [...path.waypoints]);
                    break;
                }
            }
        }
        if (selectionChanged || pathsChanged) {
            let relevantUnits: Unit[] = [];
            let selectedUnits = this.unitSelection.getSelectedUnits();
            if (selectedUnits.length === 1 && selectedUnits[0].owner !== this.currentPlayer) {
                selectedUnits = [];
            }
            relevantUnits = this.paths.length
                ? [
                    ...new Set([
                        ...this.paths.map(path => [...path.units]).flat(),
                        ...selectedUnits,
                    ]),
                ]
                : selectedUnits;
            relevantUnits = relevantUnits.filter(unit => unit.isSpawned);
            [
                ...this.sourceLinePaths.values(),
                ...this.waypointLinePaths.values(),
            ].forEach(linePath => {
                const lineObj = linePath.lineObj;
                if (lineObj && this.obj) {
                    this.obj.remove(lineObj.get3DObject());
                    lineObj.dispose();
                }
            });
            this.sourceLinePaths.clear();
            this.waypointLinePaths.clear();
            for (const unit of relevantUnits) {
                if (unit.isUnit()) {
                    const linePath = this.createSourceLinePath(unit, this.paths.find(path => path.units.has(unit)));
                    this.sourceLinePaths.set(unit, linePath);
                    linePath.lineObj = new WaypointLine(linePath, this.camera);
                    linePath.lineObj.create3DObject();
                    if (this.obj) {
                        this.obj.add(linePath.lineObj.get3DObject());
                    }
                    linePath.lineObj.update(deltaTime);
                }
            }
            for (const path of this.paths) {
                const linePath = this.createWaypointLinePath(path, this.selectedPaths.includes(path));
                this.waypointLinePaths.set(path, linePath);
                linePath.lineObj = new WaypointLine(linePath, this.camera);
                linePath.lineObj.create3DObject();
                if (this.obj) {
                    this.obj.add(linePath.lineObj.get3DObject());
                }
                linePath.lineObj.update(deltaTime);
            }
        }
        else {
            this.sourceLinePaths.forEach((linePath, unit) => {
                this.updateSourceLinePath(linePath, unit, this.paths.find(path => path.units.has(unit)));
                linePath.lineObj?.update(deltaTime);
            });
            this.waypointLinePaths.forEach(linePath => {
                this.updateWaypointLinePath(linePath);
                linePath.lineObj?.update(deltaTime);
            });
        }
    }
    private createSourceLinePath(unit: Unit, path?: WaypointPath): LinePath {
        const hasTarget = !!(unit.unitOrderTrait.targetLinesConfig &&
            configHasTarget(unit.unitOrderTrait.targetLinesConfig));
        const currentWaypoint = unit.unitOrderTrait.waypointPath
            ? path?.waypoints.find(waypoint => waypoint.original === (unit.unitOrderTrait.currentWaypoint ??
                unit.unitOrderTrait.waypointPath?.waypoints[0]))
            : path?.waypoints.find(waypoint => waypoint.draft);
        const linePath: LinePath = {
            vertices: [],
            verticesNeedUpdate: false,
            color: 0xA5CF3F,
            bgColor: this.unitSelection.isSelected(unit) ? 0xFFFFFF : 0x000000,
        };
        const sourceVertex: LineVertex = {
            type: VertexType.Source,
            enabled: hasTarget || !!currentWaypoint,
            lineHead: true,
            obj: unit,
            position: unit.position.worldPosition.clone(),
        };
        const initialTargetVertex: LineVertex = {
            type: VertexType.InitialTarget,
            enabled: hasTarget &&
                (!unit.unitOrderTrait.waypointPath || !unit.unitOrderTrait.currentWaypoint),
            lineHead: true,
            obj: unit,
            position: hasTarget
                ? this.computeInitialTargetPosition(unit.unitOrderTrait.targetLinesConfig!).clone()
                : new THREE.Vector3(),
        };
        linePath.vertices.push(sourceVertex, initialTargetVertex);
        if (currentWaypoint) {
            const waypointVertex: LineVertex = {
                type: VertexType.Waypoint,
                enabled: true,
                lineHead: false,
                waypoint: currentWaypoint,
                position: currentWaypoint.target.getWorldCoords().clone(),
            };
            linePath.vertices.push(waypointVertex);
        }
        return linePath;
    }
    private updateSourceLinePath(linePath: LinePath, unit: Unit, path?: WaypointPath): void {
        const currentWaypoint = unit.unitOrderTrait.waypointPath
            ? path?.waypoints.find(waypoint => waypoint.original === (unit.unitOrderTrait.currentWaypoint ??
                unit.unitOrderTrait.waypointPath?.waypoints[0]))
            : path?.waypoints.find(waypoint => waypoint.draft);
        const hasWaypoint = !!currentWaypoint;
        const hasTarget = !!(unit.unitOrderTrait.targetLinesConfig &&
            configHasTarget(unit.unitOrderTrait.targetLinesConfig));
        for (const vertex of linePath.vertices) {
            let enabled: boolean | undefined;
            let position: THREE.Vector3 | undefined;
            if (vertex.type === VertexType.Source) {
                enabled = hasWaypoint || hasTarget;
                position = unit.position.worldPosition;
            }
            else if (vertex.type === VertexType.InitialTarget) {
                enabled = hasTarget &&
                    (!unit.unitOrderTrait.waypointPath || !unit.unitOrderTrait.currentWaypoint);
                if (hasTarget && vertex.obj) {
                    position = this.computeInitialTargetPosition(vertex.obj.unitOrderTrait.targetLinesConfig!);
                }
            }
            else {
                enabled = hasWaypoint;
                if (currentWaypoint && vertex.waypoint) {
                    vertex.waypoint = currentWaypoint;
                }
                position = vertex.waypoint?.target.getWorldCoords();
            }
            if (position && !position.equals(vertex.position)) {
                linePath.verticesNeedUpdate = true;
                vertex.position.copy(position);
            }
            if (enabled !== undefined && enabled !== vertex.enabled) {
                linePath.verticesNeedUpdate = true;
                vertex.enabled = enabled;
            }
        }
    }
    private createWaypointLinePath(path: WaypointPath, isSelected: boolean): LinePath {
        return {
            vertices: path.waypoints.map(waypoint => ({
                type: VertexType.Waypoint,
                enabled: true,
                lineHead: true,
                waypoint,
                position: waypoint.target.getWorldCoords().clone(),
            })),
            verticesNeedUpdate: false,
            color: 0xA5CF3F,
            bgColor: isSelected ? 0xFFFFFF : 0x000000,
        };
    }
    private updateWaypointLinePath(linePath: LinePath): void {
        for (const vertex of linePath.vertices) {
            if (vertex.waypoint) {
                const position = vertex.waypoint.target.getWorldCoords();
                if (!position.equals(vertex.position)) {
                    vertex.position.copy(position);
                    linePath.verticesNeedUpdate = true;
                }
            }
        }
    }
    private computeInitialTargetPosition(config: TargetLinesConfig): THREE.Vector3 {
        if (config.pathNodes && config.pathNodes.length) {
            const node = config.pathNodes[0];
            return Coords.tile3dToWorld(node.tile.rx + 0.5, node.tile.ry + 0.5, node.tile.z + (node.onBridge?.tileElevation ?? 0));
        }
        if (config.target) {
            return config.target.position.worldPosition;
        }
        throw new Error("No target and no pathNodes found");
    }
    dispose(): void {
        this.sourceLinePaths.forEach(linePath => linePath.lineObj?.dispose());
        this.waypointLinePaths.forEach(linePath => linePath.lineObj?.dispose());
    }
}
