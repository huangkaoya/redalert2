import { WithPosition } from "@/engine/renderable/WithPosition";
import { ShpRenderable } from "@/engine/renderable/ShpRenderable";
import { Projectile as GameProjectile, ProjectileState } from "@/game/gameobject/Projectile";
import { Coords } from "@/game/Coords";
import { LaserFx } from "@/engine/renderable/fx/LaserFx";
import { WeaponType } from "@/game/WeaponType";
import { TeslaFx } from "@/engine/renderable/fx/TeslaFx";
import { GameSpeed } from "@/game/GameSpeed";
import { LineTrailFx } from "@/engine/renderable/fx/LineTrailFx";
import { SparkFx } from "@/engine/renderable/fx/SparkFx";
import { RadBeamFx } from "@/engine/renderable/fx/RadBeamFx";
import { BlobShadow } from "@/engine/renderable/entity/unit/BlobShadow";
import { NukeLightingFx } from "@/engine/gfx/lighting/NukeLightingFx";
import { BatchedMesh } from "@/engine/gfx/batch/BatchedMesh";
import { ObjectRules } from "@/game/rules/ObjectRules";
import { quaternionFromVec3 } from "@/game/math/geometry";
import { PaletteType } from "@/engine/type/PaletteType";
import * as THREE from "three";
export class Projectile {
    private static sonicWaveGeometry?: THREE.PlaneBufferGeometry;
    private static sonicWaveMaterial?: THREE.MeshBasicMaterial;
    public gameObject: any;
    public rules: any;
    public imageFinder: any;
    public voxels: any;
    public voxelAnims: any;
    public theater: any;
    public palette: any;
    public specialPalette: any;
    public camera: any;
    public gameSpeed: any;
    public lighting: any;
    public lightingDirector: any;
    public vxlBuilderFactory: any;
    public useSpriteBatching: boolean;
    public useMeshInstancing: boolean;
    public plugins: any[] = [];
    public objectArt: any;
    public label: string;
    public withPosition: WithPosition;
    public extraLight: THREE.Vector3;
    public paletteRemaps: any[];
    public target?: THREE.Object3D;
    public blobShadow?: BlobShadow;
    public vxlRotWrapper?: THREE.Object3D;
    public lastDirection?: number;
    public shpRenderable?: ShpRenderable;
    public sonicWaveMesh?: THREE.Mesh | BatchedMesh;
    public lastState?: any;
    public renderableManager?: any;
    public vxlBuilder?: any;
    public lineTrailFx?: LineTrailFx;
    constructor(gameObject: any, rules: any, imageFinder: any, voxels: any, voxelAnims: any, theater: any, palette: any, specialPalette: any, camera: any, gameSpeed: any, lighting: any, lightingDirector: any, vxlBuilderFactory: any, useSpriteBatching: boolean, useMeshInstancing: boolean) {
        this.gameObject = gameObject;
        this.rules = rules;
        this.imageFinder = imageFinder;
        this.voxels = voxels;
        this.voxelAnims = voxelAnims;
        this.theater = theater;
        this.palette = palette;
        this.specialPalette = specialPalette;
        this.camera = camera;
        this.gameSpeed = gameSpeed;
        this.lighting = lighting;
        this.lightingDirector = lightingDirector;
        this.vxlBuilderFactory = vxlBuilderFactory;
        this.useSpriteBatching = useSpriteBatching;
        this.useMeshInstancing = useMeshInstancing;
        this.plugins = [];
        this.objectArt = gameObject.art;
        this.label = "projectile_" + gameObject.rules.name;
        this.withPosition = new WithPosition();
        this.extraLight = new THREE.Vector3();
        this.updateLighting();
        if (this.gameObject.rules.firersPalette) {
            const paletteType = this.gameObject.fromObject?.art.paletteType ?? PaletteType.Unit;
            const customPaletteName = this.gameObject.fromObject?.art.customPaletteName;
            this.palette = this.theater.getPalette(paletteType, customPaletteName);
            if (this.gameObject.art.remapable) {
                this.palette = this.palette.clone();
                this.palette.remap(this.gameObject.fromPlayer.color);
            }
        }
        if (this.gameObject.rules.firersPalette && this.objectArt.remapable) {
            this.paletteRemaps = [...this.rules.colors.values()].map((color: any) => this.palette.clone().remap(color));
        }
        else {
            this.paletteRemaps = [this.palette];
        }
    }
    registerPlugin(plugin: any): void {
        this.plugins.push(plugin);
    }
    updateLighting(): void {
        this.plugins.forEach((plugin) => plugin.updateLighting?.());
        if (this.objectArt.isVoxel) {
            this.extraLight.setScalar(1 + this.lighting.computeNoAmbient(this.objectArt.lightingType, this.gameObject.tile, this.gameObject.tileElevation));
        }
        else {
            this.extraLight
                .copy(this.lighting.compute(this.objectArt.lightingType, this.gameObject.tile, this.gameObject.tileElevation))
                .addScalar(-1);
        }
    }
    getIntersectTarget(): any { }
    get3DObject(): THREE.Object3D | undefined {
        return this.target;
    }
    create3DObject(): void {
        let obj = this.get3DObject();
        if (!obj) {
            obj = new THREE.Object3D();
            obj.name = this.label;
            this.target = obj;
            obj.matrixAutoUpdate = false;
            this.withPosition.matrixUpdate = true;
            this.withPosition.applyTo(this);
            this.createObjects(obj);
        }
    }
    setPosition(position: {
        x: number;
        y: number;
        z: number;
    }): void {
        this.withPosition.setPosition(position.x, position.y, position.z);
    }
    getPosition(): THREE.Vector3 {
        return this.withPosition.getPosition();
    }
    update(time: number, deltaTime: number): void {
        this.plugins.forEach((plugin) => plugin.update(time));
        if (deltaTime > 0 && !this.gameObject.isDestroyed) {
            const velocity = this.gameObject.velocity.clone();
            const movement = velocity.multiplyScalar(deltaTime);
            const newPosition = movement.add(this.gameObject.position.worldPosition);
            this.setPosition(newPosition);
        }
        this.blobShadow?.update(time, deltaTime);
        const direction = this.gameObject.direction;
        if (!this.vxlRotWrapper &&
            this.lastDirection !== undefined &&
            this.lastDirection === direction) {
        }
        else {
            if (this.shpRenderable && this.shpRenderable.frameCount > 2) {
                this.lastDirection = direction;
                this.updateShapeFrame(direction);
            }
            else if (this.vxlRotWrapper) {
                const quaternion = quaternionFromVec3(this.gameObject.velocity.clone().negate());
                this.vxlRotWrapper.rotation.setFromQuaternion(quaternion, "YXZ");
                if (this.gameObject.rules.vertical) {
                    this.vxlRotWrapper.rotation.y = THREE.MathUtils.degToRad(180 + direction);
                }
                this.vxlRotWrapper.updateMatrix();
            }
            else if (this.sonicWaveMesh) {
                this.sonicWaveMesh.rotation.y = THREE.MathUtils.degToRad(direction);
                this.sonicWaveMesh.updateMatrix();
            }
        }
        if (this.gameObject.state !== this.lastState) {
            this.lastState = this.gameObject.state;
            if (this.gameObject.state === ProjectileState.Impact) {
                this.target!.visible = false;
                this.renderableManager.createTransientAnim(this.gameObject.impactAnim, (anim: any) => {
                    anim.setPosition(this.withPosition.getPosition());
                });
                if (this.gameObject.isNuke) {
                    this.lightingDirector.addEffect(new NukeLightingFx());
                }
            }
        }
    }
    updateShapeFrame(direction: number): void {
        let frame = 0;
        if (this.objectArt.rotates) {
            frame = Math.round((((direction - 45 + 360) % 360) / 360) * 32) % 32;
        }
        this.shpRenderable!.setFrame(frame);
    }
    createObjects(parent: THREE.Object3D): void {
        if (this.gameObject.fromWeapon.rules.isSonic) {
            if (!Projectile.sonicWaveGeometry) {
                Projectile.sonicWaveGeometry = this.createSonicWaveGeometry();
            }
            if (!Projectile.sonicWaveMaterial) {
                Projectile.sonicWaveMaterial = new THREE.MeshBasicMaterial({
                    color: 0xbcbc,
                    blending: THREE.CustomBlending,
                    blendEquation: THREE.AddEquation,
                    blendSrc: THREE.DstColorFactor,
                    blendDst: THREE.OneFactor,
                    transparent: true,
                    opacity: 0.25,
                    alphaTest: 0.01,
                    depthTest: false,
                    depthWrite: false,
                });
            }
            const mesh = new (this.useMeshInstancing ? BatchedMesh : THREE.Mesh)(Projectile.sonicWaveGeometry, Projectile.sonicWaveMaterial);
            mesh.rotation.order = "YXZ";
            mesh.rotation.x = -Math.PI / 2;
            mesh.rotation.y = THREE.MathUtils.degToRad(this.gameObject.direction);
            mesh.updateMatrix();
            mesh.matrixAutoUpdate = false;
            parent.add(mesh);
            this.sonicWaveMesh = mesh;
            return;
        }
        if (!this.gameObject.rules.inviso &&
            this.gameObject.rules.imageName !== ObjectRules.IMAGE_NONE) {
            if (this.gameObject.art.isVoxel) {
                const imageName = this.objectArt.imageName.toLowerCase();
                const vxlFile = imageName + ".vxl";
                const vxlData = this.voxels.get(vxlFile);
                if (!vxlData) {
                    throw new Error(`VXL missing for projectile ${this.gameObject.rules.name}. Vxl file ${vxlFile} not found.`);
                }
                const hvaData = this.objectArt.noHva
                    ? undefined
                    : this.voxelAnims.get(imageName + ".hva");
                const builder = this.vxlBuilder = this.vxlBuilderFactory.create(vxlData, hvaData, this.paletteRemaps, this.palette);
                builder.setExtraLight(this.extraLight);
                const vxlObject = builder.build();
                const rotWrapper = this.vxlRotWrapper = new THREE.Object3D();
                rotWrapper.rotation.order = "YXZ";
                rotWrapper.matrixAutoUpdate = false;
                rotWrapper.add(vxlObject);
                parent.add(rotWrapper);
            }
            else {
                const imageData = this.imageFinder.findByObjectArt(this.objectArt);
                const drawOffset = this.objectArt.getDrawOffset();
                const isArcing = this.gameObject.rules.arcing;
                const hasShadow = this.gameObject.rules.shadow && !isArcing && imageData.numImages > 1;
                const renderable = ShpRenderable.factory(imageData, this.palette, this.camera, drawOffset, hasShadow);
                renderable.setBatched(this.useSpriteBatching);
                if (this.useSpriteBatching) {
                    renderable.setBatchPalettes(this.paletteRemaps);
                }
                renderable.setExtraLight(this.extraLight);
                renderable.create3DObject();
                this.shpRenderable = renderable;
                parent.add(renderable.get3DObject());
                if (isArcing) {
                    this.blobShadow = new BlobShadow(this.gameObject, 1.5, this.useMeshInstancing);
                    this.blobShadow.create3DObject();
                    parent.add(this.blobShadow.get3DObject());
                }
            }
            if (this.gameObject.fromWeapon.type === WeaponType.DeathWeapon) {
                parent.visible = false;
            }
        }
    }
    createSonicWaveGeometry(): THREE.PlaneGeometry {
        const geometry = new THREE.PlaneGeometry(Coords.LEPTONS_PER_TILE, Coords.LEPTONS_PER_TILE / 3, 10, 10);
        const positionAttribute = geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < positionAttribute.count; i++) {
            const x = positionAttribute.getX(i);
            const y = positionAttribute.getY(i);
            const newY = y + Math.cos((x * Math.PI) / Coords.LEPTONS_PER_TILE) * Coords.ISO_WORLD_SCALE;
            positionAttribute.setY(i, newY);
        }
        return geometry;
    }
    onCreate(renderableManager: any): void {
        this.renderableManager = renderableManager;
        this.plugins.forEach((plugin) => plugin.onCreate(renderableManager));
        const isPrismSecondary = this.gameObject.fromObject?.name === this.rules.general.prism.type &&
            this.gameObject.fromWeapon.type === WeaponType.Secondary;
        let fireOffset: number[];
        if (this.gameObject.fromObject) {
            if (this.gameObject.fromWeapon.type === WeaponType.Primary ||
                this.gameObject.fromWeapon.type === WeaponType.DeathWeapon ||
                isPrismSecondary) {
                fireOffset = this.gameObject.fromObject.art.primaryFirePixelOffset;
            }
            else {
                fireOffset = this.gameObject.fromObject.art.secondaryFirePixelOffset;
            }
        }
        else {
            fireOffset = [];
        }
        const weaponRules = this.gameObject.fromWeapon.rules;
        if (this.gameObject.fromWeapon.type !== WeaponType.DeathWeapon &&
            !weaponRules.limboLaunch) {
            const animList = this.gameObject.fromWeapon.rules.anim;
            let animName: string | undefined;
            if (animList.length) {
                if (animList.length === 1) {
                    animName = animList[0];
                }
                else {
                    const direction = this.gameObject.direction;
                    const index = Math.round((((45 - direction + 360) % 360) / 360) * 8) % 8;
                    animName = animList[index];
                }
            }
            else if (this.gameObject.fromWeapon.warhead.rules.nukeMaker) {
                animName = this.rules.audioVisual.nukeTakeOff;
            }
            if (animName) {
                renderableManager.createTransientAnim(animName, (anim: any) => {
                    anim.setPosition(this.gameObject.position.worldPosition);
                    if (fireOffset.length) {
                        anim.extraOffset = { x: fireOffset[0], y: -fireOffset[1] / 2 };
                    }
                });
            }
        }
        if (weaponRules.isLaser) {
            const startPos = this.gameObject.position.worldPosition.clone();
            const offsetVector = new THREE.Vector3();
            if (fireOffset.length) {
                const screenDistance = Coords.screenDistanceToWorld(fireOffset[0], 0);
                offsetVector.x = 4 * screenDistance.x;
                offsetVector.z = 4 * screenDistance.y;
                offsetVector.y = 4 * Coords.tileHeightToWorld(-fireOffset[1] / (Coords.ISO_TILE_SIZE / 2));
            }
            const endPos = this.gameObject.target.getWorldCoords().clone();
            if (this.gameObject.fromObject?.name === this.rules.general.prism.type &&
                this.gameObject.fromWeapon.type === WeaponType.Secondary) {
                offsetVector.y += this.gameObject.fromObject.art.primaryFireFlh.vertical;
                endPos.add(offsetVector);
            }
            startPos.add(offsetVector);
            const color = new THREE.Color(weaponRules.isHouseColor
                ? this.gameObject.fromPlayer.color.asHex()
                : 0xff0000);
            const duration = weaponRules.laserDuration /
                GameSpeed.BASE_TICKS_PER_SECOND /
                this.gameSpeed.value;
            const thickness = 2 * (this.gameObject.baseDamageMultiplier > 1 ? 2 : 1);
            const laserFx = new LaserFx(this.camera, startPos, endPos, color, duration, thickness);
            renderableManager.addEffect(laserFx);
        }
        if (weaponRules.isElectricBolt) {
            const startPos = this.gameObject.position.worldPosition.clone();
            if (this.gameObject.fromObject?.isBuilding()) {
                startPos.y += Coords.tileHeightToWorld(1);
            }
            const endPos = this.gameObject.target.getWorldCoords();
            const palette = this.specialPalette;
            const innerColor = new THREE.Color(palette.getColorAsHex(weaponRules.isAlternateColor ? 5 : 10));
            const outerColor = new THREE.Color(palette.getColorAsHex(15));
            const duration = 1 / this.gameSpeed.value;
            const teslaFx = new TeslaFx(startPos, endPos, innerColor, outerColor, duration);
            renderableManager.addEffect(teslaFx);
        }
        if (weaponRules.isRadBeam) {
            const startPos = this.gameObject.position.worldPosition.clone();
            const endPos = this.gameObject.target.getWorldCoords().clone();
            const color = this.gameObject.fromWeapon.warhead.rules.temporal
                ? new THREE.Color(...this.rules.audioVisual.chronoBeamColor.map((c: number) => c / 255))
                : new THREE.Color(...this.rules.radiation.radColor.map((c: number) => c / 255));
            const duration = 1 / this.gameSpeed.value;
            const radBeamFx = new RadBeamFx(this.camera, startPos, endPos, color, duration, 1);
            renderableManager.addEffect(radBeamFx);
        }
        if (this.objectArt.useLineTrail) {
            const color = new THREE.Color().fromArray(this.objectArt.lineTrailColor.map((c: number) => c / 255));
            const colorDecrement = this.objectArt.lineTrailColorDecrement;
            const lineTrailFx = new LineTrailFx(() => this.target, color, colorDecrement, this.gameSpeed, this.camera);
            renderableManager.addEffect(lineTrailFx);
            this.lineTrailFx = lineTrailFx;
        }
        if (weaponRules.useSparkParticles) {
            const position = this.gameObject.position.worldPosition.clone();
            const duration = 20 / GameSpeed.BASE_TICKS_PER_SECOND;
            const sparkFx = new SparkFx(position, new THREE.Color(1, 1, 1), duration, this.gameSpeed);
            renderableManager.addEffect(sparkFx);
        }
    }
    onRemove(renderableManager: any): void {
        this.renderableManager = undefined;
        this.plugins.forEach((plugin) => plugin.onRemove(renderableManager));
        if (this.gameObject.overshootTiles) {
            this.lineTrailFx?.stopTracking();
        }
        this.lineTrailFx?.requestFinishAndDispose();
    }
    dispose(): void {
        this.plugins.forEach((plugin) => plugin.dispose());
        this.shpRenderable?.dispose();
        this.vxlBuilder?.dispose();
        this.blobShadow?.dispose();
    }
}
