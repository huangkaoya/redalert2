import { Coords } from '@/game/Coords';
import * as THREE from 'three';
type TeslaBoltRuntime = {
    line: THREE.Line;
    material: THREE.LineBasicMaterial;
    seed: number;
    update: (elapsedSeconds: number) => void;
    dispose: () => void;
};
export class TeslaFx {
    private sourcePos: THREE.Vector3;
    private targetPos: THREE.Vector3;
    private primaryColor: THREE.Color;
    private secondaryColor: THREE.Color;
    private durationSeconds: number;
    private bolts: TeslaBoltRuntime[];
    private boltMeshes: THREE.Object3D[];
    private container?: any;
    private target?: THREE.Object3D;
    private firstUpdateMillis?: number;
    private timeLeft: number = 1;
    constructor(sourcePos: THREE.Vector3, targetPos: THREE.Vector3, primaryColor: THREE.Color, secondaryColor: THREE.Color, durationSeconds: number) {
        this.sourcePos = sourcePos;
        this.targetPos = targetPos;
        this.primaryColor = primaryColor;
        this.secondaryColor = secondaryColor;
        this.durationSeconds = durationSeconds;
        this.bolts = [];
        this.boltMeshes = [];
    }
    setContainer(container: any): void {
        this.container = container;
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.target;
    }
    create3DObject(): void {
        if (!this.target) {
            this.target = new THREE.Object3D();
            this.target.name = "fx_tesla";
            const primaryHex = this.primaryColor.getHex();
            const colors = [primaryHex, primaryHex, this.secondaryColor.getHex()];
            colors.forEach((color) => {
                try {
                    const { mesh, bolt } = this.createBolt(color);
                    this.boltMeshes.push(mesh);
                    this.bolts.push(bolt);
                    this.target?.add(mesh);
                }
                catch (e) {
                    console.warn("Couldn't create lightning FX", [e]);
                }
            });
        }
    }
    update(timeMillis: number): void {
        if (!this.firstUpdateMillis) {
            this.firstUpdateMillis = timeMillis;
        }
        const elapsedSeconds = (timeMillis - this.firstUpdateMillis) / 1000;
        this.timeLeft = Math.max(0, 1 - elapsedSeconds / this.durationSeconds);
        try {
            this.bolts.forEach(bolt => bolt.update(elapsedSeconds));
        }
        catch (e) {
            console.warn("Couldn't update lightning FX", [e]);
        }
        if (this.isFinished()) {
            this.container?.remove(this);
            this.dispose();
        }
    }
    private createBolt(color: number): {
        mesh: THREE.Line;
        bolt: TeslaBoltRuntime;
    } {
        const sourceOffset = this.sourcePos.clone();
        const destOffset = this.targetPos.clone();
        const material = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0.9,
        });
        const line = new THREE.Line(new THREE.BufferGeometry(), material);
        const seed = Math.random() * Math.PI * 2;
        const pointCount = 10;
        const rebuildGeometry = (elapsedSeconds: number) => {
            const direction = destOffset.clone().sub(sourceOffset);
            const distance = Math.max(direction.length(), 1);
            const forward = direction.normalize();
            const reference = Math.abs(forward.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
            const right = new THREE.Vector3().crossVectors(forward, reference).normalize();
            const up = new THREE.Vector3().crossVectors(forward, right).normalize();
            const amplitude = Math.max(0.18 * Coords.ISO_WORLD_SCALE, distance * 0.02);
            const points: THREE.Vector3[] = [];
            for (let i = 0; i < pointCount; i++) {
                const t = pointCount === 1 ? 0 : i / (pointCount - 1);
                const point = sourceOffset.clone().lerp(destOffset, t);
                if (i !== 0 && i !== pointCount - 1) {
                    const envelope = Math.sin(t * Math.PI);
                    const phase = elapsedSeconds * 18 + seed + t * Math.PI * 4;
                    point.addScaledVector(right, Math.sin(phase) * amplitude * envelope);
                    point.addScaledVector(up, Math.cos(phase * 1.31) * amplitude * envelope * 0.6);
                }
                points.push(point);
            }
            line.geometry.dispose();
            line.geometry = new THREE.BufferGeometry().setFromPoints(points);
        };
        const bolt: TeslaBoltRuntime = {
            line,
            material,
            seed,
            update: rebuildGeometry,
            dispose: () => {
                line.geometry.dispose();
                material.dispose();
            },
        };
        bolt.update(0);
        return { mesh: line, bolt };
    }
    isFinished(): boolean {
        return this.timeLeft === 0;
    }
    dispose(): void {
        this.bolts.forEach((bolt) => bolt.dispose());
    }
}
