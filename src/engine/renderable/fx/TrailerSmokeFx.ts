import { AnimProps } from "@/engine/AnimProps";
import { ImageUtils } from "@/engine/gfx/ImageUtils";
import * as THREE from "three";
import * as SPELib from "shader-particle-engine";
import { patchSpeGroup } from "./speCompat";
interface SmokeArt {
    art: {
        getBool(key: string): boolean;
    };
    translucent: boolean;
    translucency: number;
}
interface ShpFile {
    numImages: number;
    height: number;
    width: number;
}
interface GameSpeed {
    value: number;
}
interface Container {
    remove(item: TrailerSmokeFx): void;
}
declare namespace SPE {
    interface GroupConfig {
        texture: {
            value: THREE.Texture;
            frames: THREE.Vector2;
            frameCount: number;
            loop: number;
        };
        maxParticleCount: number;
        hasPerspective: boolean;
        transparent: boolean;
        alphaTest: number;
        blending: THREE.Blending;
    }
    interface EmitterConfig {
        particleCount: number;
        maxAge: {
            value: number;
        };
        activeMultiplier: number;
        position: {
            value: THREE.Vector3;
        };
        acceleration: {
            value: THREE.Vector3;
        };
        velocity: {
            value: THREE.Vector3;
        };
        opacity: {
            value: number | number[];
        };
        size: {
            value: number;
        };
    }
    class Group {
        mesh: THREE.Mesh;
        constructor(config: GroupConfig);
        addEmitter(emitter: Emitter): void;
        tick(deltaTime: number): void;
    }
    class Emitter {
        position: {
            value: THREE.Vector3;
        };
        alive: boolean;
        constructor(config: EmitterConfig);
        disable(): void;
        enable(): void;
    }
}
const MAX_PARTICLES = 1000;
const PARTICLE_COUNT = 1000;
export class TrailerSmokeFx {
    private static textureCache: Map<ShpFile, THREE.Texture> = new Map();
    private pos: THREE.Vector3;
    private spawnDelayFrames: number;
    private smokeArt: SmokeArt;
    private shpFile: ShpFile;
    private palette: any;
    private gameSpeed: GameSpeed;
    private lifetimeSeconds: number;
    private finishRequested: boolean;
    private finishProcessed: boolean;
    private container?: Container;
    private particleGroup?: SPE.Group;
    private particleEmitter?: SPE.Emitter;
    private particleMaxAge?: number;
    private lastUpdateMillis?: number;
    private firstUpdateMillis?: number;
    private timeLeft?: number;
    static clearTextureCache(): void {
        this.textureCache.forEach((texture) => texture.dispose());
        this.textureCache.clear();
    }
    constructor(pos: THREE.Vector3, spawnDelayFrames: number, smokeArt: SmokeArt, shpFile: ShpFile, palette: any, gameSpeed: GameSpeed) {
        this.pos = pos;
        this.spawnDelayFrames = spawnDelayFrames;
        this.smokeArt = smokeArt;
        this.shpFile = shpFile;
        this.palette = palette;
        this.gameSpeed = gameSpeed;
        this.lifetimeSeconds = Number.POSITIVE_INFINITY;
        this.finishRequested = false;
        this.finishProcessed = false;
    }
    setContainer(container: Container): void {
        this.container = container;
    }
    create3DObject(): void {
        if (!this.particleGroup) {
            let texture = TrailerSmokeFx.textureCache.get(this.shpFile);
            if (!texture) {
                const canvas = ImageUtils.convertShpToCanvas(this.shpFile, this.palette, true);
                texture = new THREE.Texture(canvas);
                texture.minFilter = THREE.NearestFilter;
                texture.magFilter = THREE.NearestFilter;
                texture.needsUpdate = true;
                texture.flipY = true;
                TrailerSmokeFx.textureCache.set(this.shpFile, texture);
            }
            this.particleGroup = new SPELib.Group({
                texture: {
                    value: texture,
                    frames: new THREE.Vector2(this.shpFile.numImages, 1),
                    frameCount: this.shpFile.numImages,
                    loop: 1,
                },
                maxParticleCount: MAX_PARTICLES,
                hasPerspective: false,
                transparent: true,
                alphaTest: 0,
                blending: THREE.NormalBlending,
            });
            patchSpeGroup(this.particleGroup);
            this.particleGroup.mesh.name = "fx_trailer_smoke";
            this.particleGroup.mesh.frustumCulled = false;
            const animProps = new AnimProps(this.smokeArt.art, this.shpFile);
            const activeMultiplier = ((this.smokeArt.art.getBool("Normalized") ? 2 : 1) * animProps.rate) /
                this.spawnDelayFrames;
            this.particleMaxAge = this.shpFile.numImages / animProps.rate;
            this.particleEmitter = new SPELib.Emitter({
                particleCount: PARTICLE_COUNT,
                maxAge: { value: this.particleMaxAge },
                activeMultiplier: activeMultiplier / (PARTICLE_COUNT / this.particleMaxAge),
                position: { value: this.pos },
                acceleration: { value: new THREE.Vector3() },
                velocity: { value: new THREE.Vector3() },
                opacity: {
                    value: this.smokeArt.translucent
                        ? [1, 0]
                        : 1 - this.smokeArt.translucency,
                },
                size: {
                    value: Math.max(this.shpFile.height, this.shpFile.width),
                },
            });
            this.particleGroup.addEmitter(this.particleEmitter);
        }
    }
    get3DObject(): THREE.Mesh | undefined {
        return this.particleGroup?.mesh;
    }
    update(currentTime: number): void {
        if (!this.particleEmitter || !this.particleGroup)
            return;
        this.particleEmitter.position.value = this.pos;
        if (this.lastUpdateMillis) {
            const deltaTime = currentTime - this.lastUpdateMillis;
            this.particleGroup.tick((deltaTime / 1000) * this.gameSpeed.value);
        }
        else {
            this.firstUpdateMillis = currentTime;
            this.particleGroup.tick(0);
        }
        this.lastUpdateMillis = currentTime;
        if (this.finishRequested) {
            this.finishRequested = false;
            if (!this.finishProcessed) {
                this.finishProcessed = true;
                const elapsedSeconds = ((currentTime - (this.firstUpdateMillis || 0)) / 1000) *
                    this.gameSpeed.value;
                this.lifetimeSeconds = elapsedSeconds + (this.particleMaxAge || 0);
            }
            if (this.particleEmitter.alive) {
                this.particleEmitter.disable();
            }
        }
        this.timeLeft = Math.max(0, 1 -
            (currentTime - (this.firstUpdateMillis || 0)) /
                ((1000 * this.lifetimeSeconds) / this.gameSpeed.value));
        if (!this.timeLeft) {
            this.container?.remove(this);
            this.dispose();
        }
    }
    finishAndRemove(): void {
        this.finishRequested = true;
    }
    disable(): void {
        this.particleEmitter?.disable();
    }
    enable(): void {
        this.particleEmitter?.enable();
    }
    dispose(): void {
        this.particleGroup?.mesh.geometry.dispose();
        if (this.particleGroup?.mesh.material instanceof THREE.Material) {
            this.particleGroup.mesh.material.dispose();
        }
    }
}
