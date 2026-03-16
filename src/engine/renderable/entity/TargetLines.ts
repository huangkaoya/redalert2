import * as THREE from "three";
import { Coords } from "@/game/Coords";
import { cloneConfig, configsAreEqual, configHasTarget } from "@/game/gameobject/task/system/TargetLinesConfig";
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
interface LineObjects {
    root: THREE.Object3D;
    line: THREE.Line;
    srcLineHead: THREE.Mesh;
    destLineHead: THREE.Mesh;
}
export class TargetLines {
    private obj?: THREE.Object3D;
    private unitPaths = new Map<any, any>();
    private unitLines = new Map<any, LineObjects>();
    private lineHeadGeometry: THREE.PlaneGeometry;
    private attackLineMaterial?: THREE.LineBasicMaterial;
    private moveLineMaterial?: THREE.LineBasicMaterial;
    private attackLineHeadMaterial?: THREE.MeshBasicMaterial;
    private moveLineHeadMaterial?: THREE.MeshBasicMaterial;
    private selectionHash?: string;
    private showStart?: number;
    constructor(private currentPlayer: any, private unitSelection: any, private camera: any, private debugPaths: any, private enabled: any) {
        this.lineHeadGeometry = new THREE.PlaneGeometry(3 * Coords.ISO_WORLD_SCALE, 3 * Coords.ISO_WORLD_SCALE);
    }
    create3DObject(): void {
        if (this.obj) {
            return;
        }
        this.obj = new THREE.Object3D();
        this.obj.name = "target_lines";
        this.obj.matrixAutoUpdate = false;
        this.attackLineMaterial = new THREE.LineBasicMaterial({
            color: 0xad0000,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        this.moveLineMaterial = new THREE.LineBasicMaterial({
            color: 0x00aa00,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        this.attackLineHeadMaterial = new THREE.MeshBasicMaterial({
            color: 0xad0000,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        this.moveLineHeadMaterial = new THREE.MeshBasicMaterial({
            color: 0x00aa00,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.obj;
    }
    forceShow(): void {
        this.selectionHash = undefined;
    }
    update(now: number): void {
        if (this.obj) {
            this.obj.visible = this.enabled.value;
        }
        if (!this.enabled.value) {
            return;
        }
        const selectionHash = this.unitSelection.getHash();
        if (this.selectionHash === undefined || this.selectionHash !== selectionHash) {
            this.selectionHash = selectionHash;
            this.hideAllLines();
            this.unitPaths.clear();
            this.disposeUnitLines();
            this.unitSelection.getSelectedUnits().forEach((unit: any) => {
                if (!unit.isUnit() || (this.currentPlayer && unit.owner !== this.currentPlayer)) {
                    return;
                }
                this.unitPaths.set(unit, cloneConfig(unit.unitOrderTrait.targetLinesConfig));
                this.updateLines(unit);
                if (unit.zone === ZoneType.Air ||
                    configHasTarget(unit.unitOrderTrait.targetLinesConfig)) {
                    this.showLines(unit, now);
                }
            });
            return;
        }
        let pathsChanged = false;
        this.unitSelection.getSelectedUnits().forEach((unit: any) => {
            if (!unit.isUnit() || (this.currentPlayer && unit.owner !== this.currentPlayer)) {
                return;
            }
            const targetLinesConfig = unit.unitOrderTrait.targetLinesConfig;
            const previousConfig = this.unitPaths.get(unit);
            const configChanged = !this.unitPaths.has(unit) ||
                !configsAreEqual(previousConfig, targetLinesConfig) ||
                !!targetLinesConfig?.isRecalc;
            if (configChanged) {
                this.unitPaths.set(unit, cloneConfig(targetLinesConfig));
                pathsChanged = true;
                this.updateLines(unit);
                if (configHasTarget(targetLinesConfig)) {
                    this.showLines(unit, now);
                }
            }
            this.updateLineEndpoints(unit);
        });
        if (pathsChanged) {
            return;
        }
        if (this.showStart !== undefined && now - this.showStart >= 1000) {
            this.hideAllLines();
        }
    }
    showLines(unit: any, now: number): void {
        const lineObjects = this.unitLines.get(unit);
        if (!lineObjects) {
            return;
        }
        this.showStart = now;
        lineObjects.root.visible = true;
    }
    hideAllLines(): void {
        this.showStart = undefined;
        this.unitLines.forEach((objects) => {
            objects.root.visible = false;
        });
    }
    updateLines(unit: any): void {
        let config = unit.unitOrderTrait.targetLinesConfig;
        if (!config || !configHasTarget(config)) {
            if (unit.zone !== ZoneType.Air) {
                const existing = this.unitLines.get(unit);
                if (existing) {
                    this.obj?.remove(existing.root);
                    this.disposeLineObjects(existing);
                    this.unitLines.delete(unit);
                }
                return;
            }
            config = {
                pathNodes: [
                    { tile: unit.tile, onBridge: undefined },
                    { tile: unit.tile, onBridge: undefined },
                ],
            };
        }
        const positions: number[] = [];
        let pathNodes = config.pathNodes;
        if (pathNodes.length) {
            if (!this.debugPaths.value) {
                pathNodes = [pathNodes[0], pathNodes[pathNodes.length - 1]];
            }
            pathNodes.forEach((node: any) => {
                const position = Coords.tile3dToWorld(node.tile.rx + 0.5, node.tile.ry + 0.5, node.tile.z + (node.onBridge?.tileElevation ?? 0));
                positions.push(position.x, position.y, position.z);
            });
            positions.splice(positions.length - 3, 3, unit.position.worldPosition.x, unit.position.worldPosition.y, unit.position.worldPosition.z);
        }
        else {
            const target = config.target;
            positions.push(target.position.worldPosition.x, target.position.worldPosition.y, target.position.worldPosition.z, unit.position.worldPosition.x, unit.position.worldPosition.y, unit.position.worldPosition.z);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeBoundingSphere();
        const isAttack = !!config.isAttack;
        const line = new THREE.Line(geometry, isAttack ? this.attackLineMaterial! : this.moveLineMaterial!);
        line.matrixAutoUpdate = false;
        const srcLineHead = this.createLineHead(isAttack);
        const destLineHead = this.createLineHead(isAttack);
        this.syncLineHeadPositions(line, srcLineHead, destLineHead);
        line.renderOrder = 1000000;
        srcLineHead.renderOrder = 1000000;
        destLineHead.renderOrder = 1000000;
        const root = new THREE.Object3D();
        root.matrixAutoUpdate = false;
        root.visible = false;
        root.add(line);
        root.add(srcLineHead);
        root.add(destLineHead);
        const existing = this.unitLines.get(unit);
        if (existing) {
            this.obj?.remove(existing.root);
            this.disposeLineObjects(existing);
        }
        this.unitLines.set(unit, {
            root,
            line,
            srcLineHead,
            destLineHead,
        });
        this.obj?.add(root);
    }
    createLineHead(isAttack: boolean): THREE.Mesh {
        const lineHead = new THREE.Mesh(this.lineHeadGeometry, isAttack ? this.attackLineHeadMaterial! : this.moveLineHeadMaterial!);
        const rotation = new THREE.Quaternion().setFromEuler(this.camera.rotation);
        lineHead.setRotationFromQuaternion(rotation);
        lineHead.matrixAutoUpdate = false;
        return lineHead;
    }
    disposeUnitLines(): void {
        this.unitLines.forEach((lineObjects) => {
            this.disposeLineObjects(lineObjects);
        });
        this.unitLines.clear();
    }
    disposeLineObjects(lineObjects: LineObjects): void {
        lineObjects.line.geometry.dispose();
    }
    dispose(): void {
        this.disposeUnitLines();
        this.attackLineMaterial?.dispose();
        this.attackLineHeadMaterial?.dispose();
        this.moveLineMaterial?.dispose();
        this.moveLineHeadMaterial?.dispose();
        this.lineHeadGeometry.dispose();
    }
    private updateLineEndpoints(unit: any): void {
        const lineObjects = this.unitLines.get(unit);
        if (!lineObjects) {
            return;
        }
        const worldPosition = unit.position.worldPosition;
        const srcChanged = !worldPosition.equals(lineObjects.srcLineHead.position);
        const target = unit.unitOrderTrait.targetLinesConfig?.target;
        const targetPosition = target?.position.worldPosition;
        const destChanged = !!targetPosition && !targetPosition.equals(lineObjects.destLineHead.position);
        if (!srcChanged && !destChanged) {
            return;
        }
        const positions = lineObjects.line.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
        if (!positions || positions.count < 2) {
            return;
        }
        if (srcChanged) {
            const srcIndex = positions.count - 1;
            positions.setXYZ(srcIndex, worldPosition.x, worldPosition.y, worldPosition.z);
            lineObjects.srcLineHead.position.copy(worldPosition);
            lineObjects.srcLineHead.updateMatrix();
        }
        if (targetPosition && destChanged) {
            positions.setXYZ(0, targetPosition.x, targetPosition.y, targetPosition.z);
            lineObjects.destLineHead.position.copy(targetPosition);
            lineObjects.destLineHead.updateMatrix();
        }
        positions.needsUpdate = true;
        lineObjects.line.geometry.computeBoundingSphere();
    }
    private syncLineHeadPositions(line: THREE.Line, srcLineHead: THREE.Mesh, destLineHead: THREE.Mesh): void {
        const positions = line.geometry.getAttribute("position") as THREE.BufferAttribute;
        const srcIndex = positions.count - 1;
        srcLineHead.position.set(positions.getX(srcIndex), positions.getY(srcIndex), positions.getZ(srcIndex));
        srcLineHead.updateMatrix();
        destLineHead.position.set(positions.getX(0), positions.getY(0), positions.getZ(0));
        destLineHead.updateMatrix();
    }
}
