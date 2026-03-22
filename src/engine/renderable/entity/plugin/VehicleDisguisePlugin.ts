import { MapSpriteTranslation } from "@/engine/renderable/MapSpriteTranslation";
import { ShpRenderable } from "@/engine/renderable/ShpRenderable";
import { ObjectType } from "@/engine/type/ObjectType";
import * as THREE from "three";

// Fade out/in duration in milliseconds
const FADE_OUT_MS = 200;
const FADE_IN_MS = 200;
// Allied blink: show tree then show tank, repeating
const BLINK_TREE_MS = 3000;
const BLINK_TANK_MS = 1500;

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

    private canSeeThroughDisguise: boolean = false;
    private lastDisguised?: boolean;
    private disguisedAt?: number;
    private disguiseObj?: THREE.Object3D;
    private disguiseRenderable?: ShpRenderable;

    // Sequential fade state:
    // showingTree = which form is currently rendered
    // wantTree    = which form we want to show
    // opacity     = current opacity of the displayed form (0..1)
    // When showingTree !== wantTree, we fade out; at 0 we swap; then fade in.
    private showingTree: boolean = false;
    private wantTree: boolean = false;
    private opacity: number = 1;
    private lastTime: number = 0;

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
        if (this.gameObject.isDestroyed ||
            this.gameObject.warpedOutTrait.isActive()) {
            return;
        }

        const dt = this.lastTime > 0 ? time - this.lastTime : 16;
        this.lastTime = time;

        const isTraitDisguised = this.disguiseTrait.isDisguised();

        // Track trait state transitions
        if (isTraitDisguised !== this.lastDisguised) {
            this.lastDisguised = isTraitDisguised;
            this.disguisedAt = isTraitDisguised ? time : undefined;
        }

        const localPlayer = this.localPlayer.value;

        // Update detection status
        if (isTraitDisguised) {
            this.canSeeThroughDisguise =
                !localPlayer ||
                this.alliances.haveSharedIntel(localPlayer, this.gameObject.owner) ||
                !!localPlayer.sharedDetectDisguiseTrait?.has(this.gameObject);
        }

        // --- Decide desired form ---
        if (!isTraitDisguised) {
            // Moving / firing / cooldown → tank
            this.wantTree = false;
        } else if (!this.canSeeThroughDisguise) {
            // Enemy view → always tree
            this.wantTree = true;
        } else if (localPlayer?.sharedDetectDisguiseTrait?.has(this.gameObject)) {
            // Detected by detector → always tank
            this.wantTree = false;
        } else {
            // Allied / own view → blink
            const elapsed = time - (this.disguisedAt ?? time);
            const phase = elapsed % (BLINK_TREE_MS + BLINK_TANK_MS);
            this.wantTree = phase < BLINK_TREE_MS;
        }

        // --- Animate sequential fade ---
        if (this.showingTree !== this.wantTree) {
            if (this.showingTree) {
                // Tree → Tank: fade out tree, then instantly show tank
                this.opacity -= dt / FADE_OUT_MS;
                if (this.opacity <= 0) {
                    this.opacity = 1; // tank appears instantly
                    this.showingTree = false;
                }
            } else {
                // Tank → Tree: fade out tank, then fade in tree
                this.opacity -= dt / FADE_OUT_MS;
                if (this.opacity <= 0) {
                    this.opacity = 0;
                    this.showingTree = true;
                }
            }
        } else if (this.opacity < 1) {
            // Fading in (only for tree appearing)
            this.opacity += dt / FADE_IN_MS;
            if (this.opacity > 1) this.opacity = 1;
        }

        // --- Apply visuals ---
        // Ensure disguise 3D object exists when needed
        if (this.showingTree && isTraitDisguised) {
            this.ensureDisguiseObj();
        }

        if (this.showingTree) {
            // Tree form active
            if (this.renderable.mainObj) {
                this.renderable.mainObj.visible = false;
            }
            this.renderable.posObj.visible = this.canSeeThroughDisguise;
            if (this.disguiseObj) {
                this.disguiseObj.visible = true;
                this.disguiseRenderable?.setOpacity(this.opacity);
            }
            // Restore vehicle opacity in case it was faded
            this.setMainVehicleOpacity(1);
        } else {
            // Tank form active
            if (this.renderable.mainObj) {
                this.renderable.mainObj.visible = true;
            }
            this.renderable.posObj.visible = true;
            if (this.disguiseObj) {
                this.disguiseObj.visible = false;
            }
            this.setMainVehicleOpacity(this.opacity);
        }

        // Update disguise lighting
        if (this.disguiseObj?.visible && this.disguiseRenderable && isTraitDisguised) {
            const disguise = this.disguiseTrait.getDisguise();
            if (disguise?.rules.type === ObjectType.Terrain) {
                const terrainArt = this.art.getObject(disguise.rules.name, ObjectType.Terrain);
                const extraLight = this.lighting
                    .compute(terrainArt.lightingType, this.gameObject.tile, this.gameObject.tileElevation)
                    .addScalar(-1);
                this.disguiseRenderable.setExtraLight(extraLight);
            }
        }
    }

    private ensureDisguiseObj(): void {
        if (this.disguiseObj) return;
        const disguise = this.disguiseTrait.getDisguise();
        if (!disguise || disguise.rules.type !== ObjectType.Terrain) return;
        const terrainArt = this.art.getObject(disguise.rules.name, ObjectType.Terrain);
        this.disguiseObj = this.createDisguiseObj(terrainArt);
        this.renderable.get3DObject().add(this.disguiseObj);
    }

    private setMainVehicleOpacity(opacity: number): void {
        if (this.renderable.vxlBuilders) {
            for (const builder of this.renderable.vxlBuilders) {
                builder.setOpacity(opacity);
            }
        }
        if (this.renderable.shpRenderable) {
            this.renderable.shpRenderable.setOpacity(opacity);
        }
        if (this.renderable.placeholder) {
            this.renderable.placeholder.setOpacity(opacity);
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
        this.setMainVehicleOpacity(1);
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
