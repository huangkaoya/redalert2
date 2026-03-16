import { MapSpriteTranslation } from "@/engine/renderable/MapSpriteTranslation";
import { ShpRenderable } from "@/engine/renderable/ShpRenderable";
import { ObjectType } from "@/engine/type/ObjectType";
import * as THREE from "three";
export class VehicleDisguisePlugin {
    private gameObject: any;
    private disguiseTrait: any;
    private localPlayer: any;
    private alliances: any;
    private renderable: any;
    private art: any;
    private imageFinder: any;
    private theater: any;
    private camera: any;
    private lighting: any;
    private gameSpeed: any;
    private useSpriteBatching: boolean;
    private lastRenderDisguised: boolean = false;
    private canSeeThroughDisguise: boolean = false;
    private lastDisguised?: boolean;
    private disguisedAt?: number;
    private disguiseObj?: THREE.Object3D;
    private disguiseRenderable?: ShpRenderable;
    constructor(gameObject: any, disguiseTrait: any, localPlayer: any, alliances: any, renderable: any, art: any, imageFinder: any, theater: any, camera: any, lighting: any, gameSpeed: any, useSpriteBatching: boolean) {
        this.gameObject = gameObject;
        this.disguiseTrait = disguiseTrait;
        this.localPlayer = localPlayer;
        this.alliances = alliances;
        this.renderable = renderable;
        this.art = art;
        this.imageFinder = imageFinder;
        this.theater = theater;
        this.camera = camera;
        this.lighting = lighting;
        this.gameSpeed = gameSpeed;
        this.useSpriteBatching = useSpriteBatching;
    }
    onCreate(): void { }
    update(time: number): void {
        if (!this.gameObject.isDestroyed &&
            !this.gameObject.warpedOutTrait.isActive()) {
            let isDisguised = this.disguiseTrait.isDisguised();
            if (isDisguised !== this.lastDisguised) {
                this.lastDisguised = isDisguised;
                this.disguisedAt = isDisguised ? time : undefined;
            }
            let localPlayer = this.localPlayer.value;
            if (isDisguised) {
                this.canSeeThroughDisguise =
                    !localPlayer ||
                        this.alliances.haveSharedIntel(localPlayer, this.gameObject.owner) ||
                        !!localPlayer.sharedDetectDisguiseTrait?.has(this.gameObject);
                if (isDisguised && this.canSeeThroughDisguise) {
                    isDisguised =
                        !localPlayer?.sharedDetectDisguiseTrait?.has(this.gameObject) &&
                            Math.floor(((time - this.disguisedAt!) * this.gameSpeed.value) / 1000) % 16 <= 3;
                }
                if (this.lastRenderDisguised !== isDisguised) {
                    this.lastRenderDisguised = isDisguised;
                    this.renderable.mainObj.visible = !isDisguised;
                    this.renderable.posObj.visible = !isDisguised || this.canSeeThroughDisguise;
                    if (this.disguiseObj) {
                        this.disguiseObj.visible = false;
                    }
                    if (isDisguised) {
                        let disguise = this.disguiseTrait.getDisguise();
                        if (disguise.rules.type !== ObjectType.Terrain) {
                            throw new Error("Unsupported disguise type " + ObjectType[disguise.rules.type]);
                        }
                        disguise = this.art.getObject(disguise.rules.name, ObjectType.Terrain);
                        if (!this.disguiseObj) {
                            this.disguiseObj = this.createDisguiseObj(disguise);
                            this.renderable.get3DObject().add(this.disguiseObj);
                        }
                        this.disguiseObj.visible = true;
                        const extraLight = this.lighting
                            .compute(disguise.lightingType, this.gameObject.tile, this.gameObject.tileElevation)
                            .addScalar(-1);
                        this.disguiseRenderable!.setExtraLight(extraLight);
                    }
                }
            }
        }
    }
    private createDisguiseObj(disguise: any): THREE.Object3D {
        const obj = new THREE.Object3D();
        obj.matrixAutoUpdate = false;
        const width = 1;
        const height = 1;
        const translation = new MapSpriteTranslation(width, height);
        const { spriteOffset, anchorPointWorld } = translation.compute();
        obj.position.x = anchorPointWorld.x;
        obj.position.z = anchorPointWorld.y;
        obj.updateMatrix();
        const images = this.imageFinder.findByObjectArt(disguise);
        const palette = this.theater.getPalette(disguise.paletteType, disguise.customPaletteName);
        const renderable = ShpRenderable.factory(images, palette, this.camera, spriteOffset, disguise.hasShadow);
        renderable.setBatched(this.useSpriteBatching);
        if (this.useSpriteBatching) {
            renderable.setBatchPalettes([palette]);
        }
        renderable.setFrame(0);
        renderable.create3DObject();
        obj.add(renderable.get3DObject());
        this.disguiseRenderable = renderable;
        return obj;
    }
    updateLighting(): void {
        if (this.disguiseObj?.visible && this.disguiseRenderable) {
            const disguise = this.disguiseTrait.getDisguise();
            if (disguise) {
                if (disguise.rules.type !== ObjectType.Terrain) {
                    throw new Error("Unsupported disguise type " + ObjectType[disguise.rules.type]);
                }
                const terrainObj = this.art.getObject(disguise.rules.name, ObjectType.Terrain);
                this.disguiseRenderable.setExtraLight(this.lighting
                    .compute(terrainObj.lightingType, this.gameObject.tile, this.gameObject.tileElevation)
                    .addScalar(-1));
            }
        }
    }
    onRemove(): void {
        if (this.disguiseObj) {
            this.renderable.get3DObject().remove(this.disguiseObj);
            this.disguiseObj = undefined;
        }
    }
    getUiNameOverride(): string | undefined {
        if (this.gameObject.disguiseTrait?.hasTerrainDisguise() &&
            !this.canSeeThroughDisguise) {
            return "";
        }
    }
    shouldDisableHighlight(): boolean {
        return (!!this.gameObject.disguiseTrait?.hasTerrainDisguise() &&
            !this.canSeeThroughDisguise);
    }
    dispose(): void {
        this.disguiseRenderable?.dispose();
    }
}
