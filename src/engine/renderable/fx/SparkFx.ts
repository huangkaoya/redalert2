import { Coords } from '@/game/Coords';
import * as THREE from 'three';
import * as SPE from 'shader-particle-engine';
import { patchSpeGroup } from './speCompat';
export class SparkFx {
    private static readonly PARTICLE_LIFETIME = 1;
    private static readonly MAX_PARTICLE_COUNT = 100;
    private static sparkTex?: THREE.DataTexture;
    private pos: THREE.Vector3;
    private color: THREE.Color;
    private spawnDurationSeconds: number;
    private gameSpeed: {
        value: number;
    };
    private totalDurationSeconds: number;
    private container?: any;
    private particleGroup?: SPE.Group;
    private particleEmitter?: SPE.Emitter;
    private firstUpdateMillis?: number;
    private lastUpdateMillis?: number;
    private timeLeft: number = 1;
    constructor(pos: THREE.Vector3, color: THREE.Color, spawnDurationSeconds: number, gameSpeed: {
        value: number;
    }) {
        this.pos = pos;
        this.color = color;
        this.spawnDurationSeconds = spawnDurationSeconds;
        this.gameSpeed = gameSpeed;
        this.totalDurationSeconds = spawnDurationSeconds + SparkFx.PARTICLE_LIFETIME;
    }
    setContainer(container: any): void {
        this.container = container;
    }
    create3DObject(): void {
        if (!this.particleGroup) {
            if (!SparkFx.sparkTex) {
                SparkFx.sparkTex = new THREE.DataTexture(new Uint8Array(4).fill(255), 1, 1, THREE.RGBAFormat);
                SparkFx.sparkTex.needsUpdate = true;
            }
            this.particleGroup = new SPE.Group({
                texture: { value: SparkFx.sparkTex },
                maxParticleCount: SparkFx.MAX_PARTICLE_COUNT,
            });
            patchSpeGroup(this.particleGroup);
            this.particleGroup.mesh.name = "fx_spark";
            this.particleGroup.mesh.frustumCulled = false;
            this.particleEmitter = new SPE.Emitter({
                maxAge: { value: SparkFx.PARTICLE_LIFETIME },
                position: {
                    value: this.pos,
                    spread: new THREE.Vector3(10, 0, 10).multiplyScalar(Coords.ISO_WORLD_SCALE),
                },
                acceleration: {
                    value: new THREE.Vector3(0, -50, 0).multiplyScalar(Coords.ISO_WORLD_SCALE),
                    spread: new THREE.Vector3(0, 0, 0),
                },
                velocity: {
                    value: new THREE.Vector3(0, 30, 0).multiplyScalar(Coords.ISO_WORLD_SCALE),
                    spread: new THREE.Vector3(40, 5, 40).multiplyScalar(Coords.ISO_WORLD_SCALE),
                },
                color: { value: [this.color] },
                opacity: { value: [1, 0.5] },
                size: { value: 1 },
                particleCount: SparkFx.MAX_PARTICLE_COUNT,
            });
            this.particleGroup.addEmitter(this.particleEmitter);
        }
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.particleGroup?.mesh;
    }
    update(timeMillis: number): void {
        if (this.lastUpdateMillis) {
            const deltaTime = timeMillis - this.lastUpdateMillis;
            this.particleGroup?.tick((deltaTime / 1000) * this.gameSpeed.value);
        }
        else {
            this.firstUpdateMillis = timeMillis;
            this.particleGroup?.tick(0);
        }
        this.lastUpdateMillis = timeMillis;
        if (this.particleEmitter?.alive &&
            timeMillis - this.firstUpdateMillis! >=
                (1000 * this.spawnDurationSeconds) / this.gameSpeed.value) {
            this.particleEmitter.disable();
        }
        this.timeLeft = Math.max(0, 1 -
            (timeMillis - this.firstUpdateMillis!) /
                ((1000 * this.totalDurationSeconds) / this.gameSpeed.value));
        if (!this.timeLeft) {
            this.container?.remove(this);
            this.dispose();
        }
    }
    dispose(): void {
        this.particleGroup?.mesh.geometry.dispose();
        this.particleGroup?.mesh.material.dispose();
    }
}
