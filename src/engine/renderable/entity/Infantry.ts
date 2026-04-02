import { WithPosition } from "@/engine/renderable/WithPosition";
import * as ImageFinder from "@/engine/ImageFinder";
import { MissingImageError } from "@/engine/ImageFinder";
import { DebugUtils } from "@/engine/gfx/DebugUtils";
import { ShpRenderable } from "@/engine/renderable/ShpRenderable";
import { Coords } from "@/game/Coords";
import { SimpleRunner } from "@/engine/animation/SimpleRunner";
import { Animation, AnimationState } from "@/engine/Animation";
import { AnimProps } from "@/engine/AnimProps";
import { IniSection } from "@/data/IniSection";
import * as sequenceMap from "@/game/gameobject/infantry/sequenceMap";
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
import { StanceType } from "@/game/gameobject/infantry/StanceType";
import { SequenceType } from "@/game/art/SequenceType";
import * as math from "@/util/math";
import * as THREE from "three";
import { InfDeathType } from "@/game/gameobject/infantry/InfDeathType";
import { VeteranLevel } from "@/game/gameobject/unit/VeteranLevel";
import { HighlightAnimRunner } from "@/engine/renderable/entity/HighlightAnimRunner";
import { DeathType } from "@/game/gameobject/common/DeathType";
import { MovementZone } from "@/game/type/MovementZone";
import { BlobShadow } from "@/engine/renderable/entity/unit/BlobShadow";
import { BoxIntersectObject3D } from "@/engine/renderable/entity/BoxIntersectObject3D";
import { ExtraLightHelper } from "@/engine/renderable/entity/unit/ExtraLightHelper";
import { DebugRenderable } from "@/engine/renderable/DebugRenderable";
import { MathUtils } from "@/engine/gfx/MathUtils";
export class Infantry {
    private gameObject: any;
    private rules: any;
    private art: any;
    private imageFinder: any;
    private palette: any;
    private camera: any;
    private lighting: any;
    private debugFrame: any;
    private gameSpeed: any;
    private selectionModel: any;
    private useSpriteBatching: boolean;
    private useMeshInstancing: boolean;
    private pipOverlay: any;
    private worldSound: any;
    private crashingSequencePlaying: boolean = false;
    private deathAnimSequencePlaying: boolean = false;
    private idleActionDue: boolean = false;
    private disguiseChanged: boolean = false;
    private highlightAnimRunner: HighlightAnimRunner;
    private plugins: any[] = [];
    private objectArt: any;
    private label: string;
    private paletteRemaps: any[];
    private withPosition: WithPosition;
    private baseExtraLight: THREE.Vector3;
    private extraLight: THREE.Vector3;
    private target: THREE.Object3D;
    private posWrap: THREE.Object3D;
    private shpRenderable: ShpRenderable;
    private placeholder: DebugRenderable;
    private blobShadow: BlobShadow;
    private animRunner: SimpleRunner;
    private currentSequenceParams: any;
    private sequenceQueue: any[] = [];
    private renderableManager: any;
    private ambientSound: any;
    private deathPromiseResolve: (() => void) | undefined;
    private deathAnimRenderable: any;
    private deadBodyAnimRenderable: any;
    private paradropAnim: any;
    private disguise: any;
    private lastVeteranLevel: VeteranLevel;
    private lastElevation: number;
    private lastOwnerColor: any;
    private lastWarpedOut: boolean;
    private lastCloaked: boolean;
    private lastZone: ZoneType;
    private lastDirection: number;
    private computedDirection: number;
    private lastMoving: boolean;
    private lastFiring: boolean;
    private lastPanicked: boolean;
    private lastStance: StanceType;
    constructor(gameObject: any, rules: any, art: any, imageFinder: any, theater: any, palette: any, camera: any, lighting: any, debugFrame: any, gameSpeed: any, selectionModel: any, useSpriteBatching: boolean, useMeshInstancing: boolean, pipOverlay: any, worldSound: any) {
        this.gameObject = gameObject;
        this.rules = rules;
        this.art = art;
        this.imageFinder = imageFinder;
        this.palette = palette;
        this.camera = camera;
        this.lighting = lighting;
        this.debugFrame = debugFrame;
        this.gameSpeed = gameSpeed;
        this.selectionModel = selectionModel;
        this.useSpriteBatching = useSpriteBatching;
        this.useMeshInstancing = useMeshInstancing;
        this.pipOverlay = pipOverlay;
        this.worldSound = worldSound;
        this.highlightAnimRunner = new HighlightAnimRunner(this.gameSpeed);
        this.objectArt = gameObject.art;
        this.label = "infantry_" + gameObject.rules.name;
        this.paletteRemaps = [...this.rules.colors.values()].map((color: any) => this.palette.clone().remap(color));
        this.palette = this.palette.remap(this.gameObject.owner.color);
        this.withPosition = new WithPosition();
        this.updateBaseLight();
        this.extraLight = new THREE.Vector3().copy(this.baseExtraLight);
    }
    updateBaseLight(): void {
        this.baseExtraLight = this.lighting
            .compute(this.objectArt.lightingType, this.gameObject.tile, this.gameObject.tileElevation)
            .addScalar(-1 + this.rules.audioVisual.extraInfantryLight);
    }
    registerPlugin(plugin: any): void {
        this.plugins.push(plugin);
    }
    updateLighting(): void {
        this.plugins.forEach((plugin) => plugin.updateLighting?.());
        this.updateBaseLight();
        this.extraLight.copy(this.baseExtraLight);
    }
    get3DObject(): THREE.Object3D {
        return this.target;
    }
    getIntersectTarget(): THREE.Object3D {
        return this.target;
    }
    getUiName(): string {
        const override = this.plugins.reduce((name, plugin) => plugin.getUiNameOverride?.() ?? name, undefined);
        return override !== undefined ? override : this.gameObject.getUiName();
    }
    create3DObject(): void {
        let obj = this.get3DObject();
        if (!obj) {
            obj = new BoxIntersectObject3D(new THREE.Vector3(0.5, 2 / 3, 0.5).multiplyScalar(Coords.LEPTONS_PER_TILE));
            obj.name = this.label;
            obj.userData.id = this.gameObject.id;
            this.target = obj;
            obj.matrixAutoUpdate = false;
            this.withPosition.matrixUpdate = true;
            this.withPosition.applyTo(this);
            this.createObjects(obj);
            this.shpRenderable?.setExtraLight(this.extraLight);
            if (this.pipOverlay) {
                this.pipOverlay.create3DObject();
                this.posWrap.add(this.pipOverlay.get3DObject());
            }
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
    highlight(): void {
        if (!this.plugins.some((plugin) => plugin.shouldDisableHighlight?.())) {
            if (this.highlightAnimRunner.animation.getState() !== AnimationState.RUNNING) {
                this.highlightAnimRunner.animate(2);
            }
        }
    }
    update(deltaTime: number): void {
        this.plugins.forEach((plugin) => plugin.update(deltaTime));
        const { zone, stance, isCrashing, isMoving, isFiring, isPanicked, owner, veteranLevel, } = this.gameObject;
        this.pipOverlay?.update(deltaTime);
        this.blobShadow?.update(deltaTime, undefined as any);
        if (veteranLevel !== this.lastVeteranLevel) {
            if (veteranLevel === VeteranLevel.Elite && this.lastVeteranLevel !== undefined) {
                this.highlightAnimRunner.animate(30);
            }
            this.lastVeteranLevel = veteranLevel;
        }
        const elevation = this.gameObject.tile.z + this.gameObject.tileElevation;
        if (this.lastElevation === undefined || this.lastElevation !== elevation) {
            this.lastElevation = elevation;
            this.updateBaseLight();
            this.extraLight.copy(this.baseExtraLight);
        }
        if (this.highlightAnimRunner.shouldUpdate()) {
            this.highlightAnimRunner.tick(deltaTime);
            ExtraLightHelper.multiplyShp(this.extraLight as any, this.baseExtraLight as any, this.highlightAnimRunner.getValue());
        }
        const currentOwner = this.disguise?.owner ?? owner;
        if (this.lastOwnerColor !== currentOwner.color) {
            this.palette.remap(currentOwner.color);
            (this.shpRenderable ?? this.placeholder)?.setPalette(this.palette);
            this.lastOwnerColor = currentOwner.color;
        }
        const warpedOut = this.gameObject.warpedOutTrait.isActive();
        const warpedOutChanged = warpedOut !== this.lastWarpedOut;
        this.lastWarpedOut = warpedOut;
        const cloaked = this.gameObject.cloakableTrait?.isCloaked();
        const cloakedChanged = cloaked !== this.lastCloaked;
        this.lastCloaked = cloaked;
        if ((warpedOutChanged || cloakedChanged)) {
            (this.shpRenderable ?? this.placeholder)?.setOpacity(warpedOut || cloaked ? 0.5 : 1);
        }
        if (!isCrashing && (this.lastZone === undefined || this.lastZone !== zone)) {
            if (zone === ZoneType.Water) {
                if (this.gameObject.rules.enterWaterSound) {
                    this.worldSound?.playEffect(this.gameObject.rules.enterWaterSound, this.gameObject, owner);
                }
            }
            else if (this.lastZone === ZoneType.Water) {
                if (this.gameObject.rules.leaveWaterSound) {
                    this.worldSound?.playEffect(this.gameObject.rules.leaveWaterSound, this.gameObject, owner);
                }
            }
            if (this.blobShadow) {
                this.shpRenderable?.setShadowVisible(!this.blobShadow.get3DObject().visible);
            }
        }
        if (this.gameObject.isDestroyed && this.deathPromiseResolve) {
            if (this.deadBodyAnimRenderable) {
                (this.shpRenderable ?? this.placeholder).get3DObject().visible = false;
                this.deadBodyAnimRenderable.update(deltaTime);
                if (this.deadBodyAnimRenderable.isAnimFinished()) {
                    this.deathPromiseResolve();
                    return;
                }
            }
            else {
                if (!this.deathAnimRenderable) {
                    if (this.deathAnimSequencePlaying) {
                        if (this.animRunner && this.animRunner.animation.getState() !== AnimationState.STOPPED) {
                            this.animRunner.tick(deltaTime);
                            this.updateShapeFrame(this.computeFacingNumber(this.gameObject.direction));
                            return;
                        }
                        else {
                            if ([InfDeathType.Gunfire, InfDeathType.Explode].includes(this.gameObject.infDeathType) &&
                                this.gameObject.rules.isHuman &&
                                this.gameObject.zone === ZoneType.Ground) {
                                this.prepareDeadBodyAnim();
                            }
                            else {
                                this.deathPromiseResolve();
                            }
                            return;
                        }
                    }
                    const sequence = this.sequenceQueue.shift();
                    if (sequence) {
                        this.deathAnimSequencePlaying = true;
                        this.setAnimParams(sequence, deltaTime, false);
                        return;
                    }
                    throw new Error("We should have a death sequence scheduled right now");
                }
                (this.shpRenderable ?? this.placeholder).get3DObject().visible = false;
                this.deathAnimRenderable.update(deltaTime);
                if (this.deathAnimRenderable.isAnimFinished()) {
                    if ([InfDeathType.Gunfire, InfDeathType.Explode].includes(this.gameObject.infDeathType) &&
                        this.gameObject.rules.isHuman) {
                        this.prepareDeadBodyAnim();
                    }
                    else {
                        this.deathPromiseResolve();
                    }
                    return;
                }
            }
        }
        else {
            if (this.gameObject.warpedOutTrait.isActive())
                return;
            if (isCrashing && !this.crashingSequencePlaying) {
                this.crashingSequencePlaying = true;
                const crashingSequences = sequenceMap.getCrashingSequences(this.gameObject);
                if (crashingSequences) {
                    this.sequenceQueue = crashingSequences;
                }
            }
        }
        if (this.lastDirection === undefined || this.lastDirection !== this.gameObject.direction) {
            this.lastDirection = this.gameObject.direction;
            this.computedDirection = this.gameObject.direction;
        }
        const wasIdleActionDue = this.idleActionDue;
        this.idleActionDue = this.gameObject.idleActionTrait.actionDueThisTick();
        let shouldTriggerIdleAction = this.idleActionDue && !wasIdleActionDue;
        if (this.lastMoving === undefined || this.lastMoving !== isMoving ||
            this.lastFiring === undefined || this.lastFiring !== isFiring ||
            this.lastZone === undefined || this.lastZone !== zone ||
            this.lastPanicked === undefined || this.lastPanicked !== isPanicked ||
            this.disguiseChanged) {
            const disguiseChanged = this.disguiseChanged;
            const firingChanged = this.lastFiring !== isFiring;
            this.lastMoving = isMoving;
            this.lastFiring = isFiring;
            this.lastZone = zone;
            this.lastPanicked = isPanicked;
            this.computedDirection = this.gameObject.direction;
            this.disguiseChanged = false;
            if (!isCrashing) {
                this.sequenceQueue = [];
                if (!firingChanged || isFiring || disguiseChanged) {
                    let sequence = this.findSequenceBy(zone, stance, isMoving, isFiring, isPanicked);
                    if (sequence !== undefined) {
                        if (this.disguise && [SequenceType.FireUp, SequenceType.FireProne].includes(sequence)) {
                            sequence = SequenceType.Ready;
                        }
                        this.setAnimParams(sequence, deltaTime, !isFiring);
                    }
                }
            }
        }
        if (this.lastStance === undefined || this.lastStance !== stance) {
            this.sequenceQueue = [];
            shouldTriggerIdleAction = false;
            const transitionSequence = sequenceMap.getStanceTransitionSequenceBy(this.lastStance, stance);
            this.lastStance = stance;
            if (transitionSequence && this.objectArt.sequences.has(transitionSequence)) {
                this.sequenceQueue.push(transitionSequence);
            }
            const sequence = this.findSequenceBy(zone, stance, isMoving, isFiring, isPanicked);
            if (sequence !== undefined) {
                this.sequenceQueue.push(sequence);
            }
            if (this.currentSequenceParams?.onlyFacing !== undefined) {
                this.computedDirection = this.directionFromFacingNo(this.currentSequenceParams.onlyFacing);
            }
            const nextSequence = this.sequenceQueue.shift();
            this.setAnimParams(nextSequence, deltaTime, !transitionSequence);
            if (nextSequence === SequenceType.Paradrop) {
                const parachuteArt = this.rules.audioVisual.parachute;
                this.paradropAnim = this.renderableManager.createAnim(parachuteArt, undefined, true);
                this.paradropAnim.remapColor(owner.color);
                this.paradropAnim.create3DObject();
                this.paradropAnim.get3DObject().position.y = Coords.tileHeightToWorld(1);
                this.paradropAnim.get3DObject().updateMatrix();
                this.posWrap.add(this.paradropAnim.get3DObject());
            }
            else if (this.paradropAnim) {
                this.paradropAnim.endAnimationLoop();
                if (this.blobShadow) {
                    this.posWrap.remove(this.blobShadow.get3DObject());
                    this.blobShadow.dispose();
                    this.blobShadow = undefined;
                    this.shpRenderable?.setShadowVisible(true);
                }
            }
        }
        if (this.paradropAnim) {
            this.paradropAnim.update(deltaTime);
            if (this.paradropAnim.isAnimFinished()) {
                this.posWrap.remove(this.paradropAnim.get3DObject());
                this.paradropAnim = undefined;
            }
        }
        if (!this.sequenceQueue.length && !isMoving && !isFiring &&
            (stance === StanceType.None || stance === StanceType.Guard) &&
            zone !== ZoneType.Air && shouldTriggerIdleAction) {
            if (Math.random() >= 0.5) {
                const idleSequence = this.findIdleSequence(zone, stance, this.objectArt);
                if (idleSequence) {
                    this.setAnimParams(idleSequence, deltaTime, false);
                }
            }
            else {
                this.computedDirection = Math.floor(360 * Math.random());
            }
        }
        if (this.animRunner) {
            if (this.animRunner.animation.getState() === AnimationState.STOPPED && this.currentSequenceParams) {
                if ([SequenceType.Idle1, SequenceType.Idle2].includes(this.currentSequenceParams.type) &&
                    this.currentSequenceParams.onlyFacing !== undefined) {
                    this.computedDirection = this.directionFromFacingNo(this.currentSequenceParams.onlyFacing);
                }
                let nextSequence;
                if (this.sequenceQueue.length) {
                    nextSequence = this.sequenceQueue.shift();
                }
                else {
                    nextSequence = this.findSequenceBy(zone, stance, isMoving, isFiring, isPanicked);
                }
                if (nextSequence !== undefined) {
                    this.setAnimParams(nextSequence, deltaTime, !isFiring);
                }
            }
            this.animRunner.tick(deltaTime);
            const facingNumber = this.computeFacingNumber(this.computedDirection);
            this.updateShapeFrame(facingNumber);
        }
    }
    findIdleSequence(zone: ZoneType, stance: StanceType, art: any): SequenceType | undefined {
        let sequences = sequenceMap.getIdleSequenceBy(zone, stance);
        if (sequences?.length) {
            sequences = sequences.filter((seq) => art.sequences.has(seq));
            if (!sequences.length && zone !== ZoneType.Ground) {
                sequences = sequenceMap.getIdleSequenceBy(ZoneType.Ground, stance)?.filter((seq) => art.sequences.has(seq));
            }
        }
        if (sequences) {
            return sequences[math.getRandomInt(0, sequences.length - 1)];
        }
    }
    prepareDeadBodyAnim(): void {
        const deadBodies = this.rules.audioVisual.deadBodies;
        const deadBodyArt = deadBodies[math.getRandomInt(0, deadBodies.length - 1)];
        this.deadBodyAnimRenderable = this.renderableManager.createAnim(deadBodyArt, undefined, true);
        this.deadBodyAnimRenderable.create3DObject();
        this.posWrap.add(this.deadBodyAnimRenderable.get3DObject());
    }
    findSequenceBy(zone: ZoneType, stance: StanceType, isMoving: boolean, isFiring: boolean, isPanicked: boolean): SequenceType | undefined {
        const sequence = sequenceMap.findSequence(zone, stance, isMoving, isFiring, isPanicked, [...this.objectArt.sequences.keys()]);
        if (sequence !== undefined)
            return sequence;
        console.warn(`Couldn't find a sequence for infantry "${this.gameObject.name}" ` +
            `(moving=${isMoving}, firing=${isFiring})`);
    }
    setAnimParams(sequenceType: SequenceType, time: number, loop: boolean = true): void {
        if (this.animRunner) {
            const sequence = this.objectArt.sequences.get(sequenceType);
            if (sequence) {
                this.currentSequenceParams = sequence;
                const props = this.animRunner.animation.props;
                props.loopCount = loop ? -1 : 1;
                props.loopEnd = sequence.frameCount - 1;
                if ([SequenceType.Deploy, SequenceType.Undeploy, SequenceType.Paradrop].includes(sequenceType)) {
                    if (sequenceType === SequenceType.Paradrop) {
                        props.rate = 2 * AnimProps.defaultRate;
                    }
                    else {
                        props.rate = AnimProps.defaultRate;
                    }
                }
                else {
                    props.rate = AnimProps.defaultRate / 2;
                }
                if ([SequenceType.Walk].includes(sequenceType)) {
                    props.rate /= 1.33;
                }
                this.animRunner.animation.start(time);
            }
            else {
                console.warn(`Infantry "${this.gameObject.name}" is missing sequence "${SequenceType[sequenceType]}"`);
            }
        }
    }
    updateShapeFrame(facingNumber: number): void {
        if (this.currentSequenceParams && this.shpRenderable && this.animRunner) {
            const { startFrame, facingMult } = this.currentSequenceParams;
            const frameIndex = startFrame + facingMult * facingNumber + this.animRunner.animation.getCurrentFrame();
            if (frameIndex < this.shpRenderable.frameCount) {
                this.shpRenderable.setFrame(frameIndex);
            }
        }
    }
    computeFacingNumber(direction: number): number {
        return Math.round((((direction - 45 + 360) % 360) / 360) * 8) % 8;
    }
    directionFromFacingNo(facingNumber: number): number {
        return 45 + (360 * facingNumber) / 8;
    }
    createObjects(parent: THREE.Object3D): void {
        if (this.debugFrame.value) {
            const wireframe = DebugUtils.createWireframe({ width: 0.5, height: 0.5 }, 1);
            wireframe.translateX(-Coords.getWorldTileSize() / 4);
            wireframe.translateZ(-Coords.getWorldTileSize() / 4);
            parent.add(wireframe);
        }
        const posWrap = this.posWrap = new THREE.Object3D();
        posWrap.matrixAutoUpdate = false;
        parent.add(posWrap);
        const mainObject = this.createMainObject(this.objectArt);
        posWrap.add(mainObject);
        if ((this.gameObject.rules.movementZone !== MovementZone.Fly || this.objectArt.isVoxel) &&
            this.gameObject.stance !== StanceType.Paradrop) {
            this.blobShadow = new BlobShadow(this.gameObject, 3, this.useMeshInstancing);
            this.blobShadow.create3DObject();
            this.posWrap.add(this.blobShadow.get3DObject());
        }
    }
    createMainObject(art: any): THREE.Object3D {
        let image;
        try {
            image = this.imageFinder.findByObjectArt(art);
        }
        catch (error) {
            if (!(error instanceof MissingImageError))
                throw error;
            console.warn(`<${this.gameObject.name}>: ` + error.message);
        }
        if (!image) {
            this.placeholder = new DebugRenderable({ width: 0.25, height: 0.25 }, this.objectArt.height, this.palette, { centerFoundation: true });
            this.placeholder.setBatched(this.useSpriteBatching);
            if (this.useSpriteBatching) {
                this.placeholder.setBatchPalettes(this.paletteRemaps);
            }
            this.placeholder.create3DObject();
            return this.placeholder.get3DObject();
        }
        const drawOffset = art.getDrawOffset();
        const renderable = this.shpRenderable = ShpRenderable.factory(image, this.palette, this.camera, drawOffset, art.hasShadow);
        renderable.setBatched(this.useSpriteBatching);
        if (this.useSpriteBatching) {
            renderable.setBatchPalettes(this.paletteRemaps);
        }
        renderable.create3DObject();
        const object = renderable.get3DObject();
        MathUtils.translateTowardsCamera(object, this.camera, 15 * Coords.ISO_WORLD_SCALE);
        object.updateMatrix();
        const animProps = new AnimProps(new IniSection("dummy"), image);
        const animation = new Animation(animProps, this.gameSpeed);
        this.animRunner = new SimpleRunner();
        this.animRunner.animation = animation;
        return object;
    }
    setDisguise(disguise: any): void {
        if (this.gameObject.isDestroyed || this.gameObject.isCrashing)
            return;
        this.objectArt = disguise?.objectArt ?? this.gameObject.art;
        this.updateShpRenderableFromArt(this.objectArt);
        this.disguiseChanged = true;
        this.disguise = disguise;
    }
    updateShpRenderableFromArt(art: any): void {
        const currentObject = (this.shpRenderable ?? this.placeholder)?.get3DObject();
        if (currentObject) {
            this.posWrap.remove(currentObject);
            (this.shpRenderable ?? this.placeholder)?.dispose();
        }
        this.posWrap.add(this.createMainObject(art));
    }
    onCreate(renderableManager: any): void {
        this.renderableManager = renderableManager;
        this.plugins.forEach((plugin) => plugin.onCreate(renderableManager));
        if (this.gameObject.rules.ambientSound) {
            this.ambientSound = this.worldSound?.playEffect(this.gameObject.rules.ambientSound, this.gameObject);
        }
    }
    onRemove(renderableManager: any): Promise<void> | void {
        this.renderableManager = undefined;
        this.plugins.forEach((plugin) => plugin.onRemove(renderableManager));
        this.ambientSound?.stop();
        if (this.gameObject.isDestroyed &&
            this.gameObject.deathType !== DeathType.Temporal &&
            this.gameObject.deathType !== DeathType.Crush &&
            this.gameObject.stance !== StanceType.Paradrop) {
            const deathSequences = sequenceMap.getDeathSequence(this.gameObject, this.gameObject.infDeathType);
            if (deathSequences) {
                if (deathSequences.length > 1) {
                    const randomSequence = deathSequences[math.getRandomInt(0, deathSequences.length - 1)];
                    this.sequenceQueue = [randomSequence];
                }
                else {
                    this.sequenceQueue = [deathSequences[0]];
                }
                if (this.disguise) {
                    this.objectArt = this.gameObject.art;
                    this.updateShpRenderableFromArt(this.gameObject.art);
                }
            }
            else {
                if (!this.gameObject.rules.isHuman)
                    return;
                const deathAnim = sequenceMap.getDeathAnim(this.rules, this.gameObject.infDeathType);
                if (!deathAnim)
                    return;
                const animData = this.art.getAnimation(deathAnim);
                this.deathAnimRenderable = renderableManager.createAnim(deathAnim, undefined, true);
                this.deathAnimRenderable.create3DObject();
                this.create3DObject();
                this.posWrap.add(this.deathAnimRenderable.get3DObject());
                if (animData.isFlamingGuy) {
                    const artClone = animData.art.clone();
                    artClone.set("Shadow", "yes");
                    artClone.set("LoopCount", "0");
                    artClone.set("Start", String(8 * animData.runningFrames));
                    const animProps = this.deathAnimRenderable.getAnimProps();
                    animProps.setArt(artClone);
                }
            }
            this.renderableManager = renderableManager;
            return new Promise<void>((resolve) => {
                this.deathPromiseResolve = () => {
                    this.renderableManager = undefined;
                    resolve();
                };
            });
        }
    }
    dispose(): void {
        this.plugins.forEach((plugin) => plugin.dispose());
        this.pipOverlay?.dispose();
        this.shpRenderable?.dispose();
        this.placeholder?.dispose();
        this.deathAnimRenderable?.dispose();
        this.deadBodyAnimRenderable?.dispose();
        this.paradropAnim?.dispose();
        this.blobShadow?.dispose();
    }
}
