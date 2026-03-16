import { Coords } from "@/game/Coords";
import { TrailerSmokeFx } from "@/engine/renderable/fx/TrailerSmokeFx";
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
import { LandType } from "@/game/type/LandType";
import { LocomotorType } from "@/game/type/LocomotorType";
import * as THREE from "three";
export class ShipWakeTrailPlugin {
    private gameObject: any;
    private rules: any;
    private art: any;
    private theater: any;
    private imageFinder: any;
    private gameSpeed: any;
    private trailPos: THREE.Vector3;
    private renderableManager?: any;
    private trailerFx?: TrailerSmokeFx;
    private lastMoving?: boolean;
    private lastSubmerged?: boolean;
    private lastInWater?: boolean;
    constructor(gameObject: any, rules: any, art: any, theater: any, imageFinder: any, gameSpeed: any) {
        this.gameObject = gameObject;
        this.rules = rules;
        this.art = art;
        this.theater = theater;
        this.imageFinder = imageFinder;
        this.gameSpeed = gameSpeed;
        this.trailPos = new THREE.Vector3();
    }
    onCreate(renderableManager: any): void {
        this.renderableManager = renderableManager;
    }
    update(time: number): void {
        if (!this.renderableManager)
            return;
        this.trailPos.copy(this.gameObject.position.worldPosition);
        this.trailPos.y = Coords.tileHeightToWorld(this.gameObject.tile.z);
        if (this.gameObject.rules.locomotor === LocomotorType.Hover) {
            const hoverHeight = this.rules.general.hover.height;
            this.trailPos.x -= hoverHeight;
            this.trailPos.z -= hoverHeight;
        }
        const isMoving = this.gameObject.moveTrait.isMoving();
        const isSubmerged = this.gameObject.submergibleTrait?.isSubmerged();
        const isInWater = this.gameObject.zone === ZoneType.Water &&
            this.gameObject.tile.landType === LandType.Water;
        const movingChanged = isMoving !== this.lastMoving;
        const submergedChanged = isSubmerged !== this.lastSubmerged;
        const waterChanged = isInWater !== this.lastInWater;
        if (movingChanged || submergedChanged || waterChanged) {
            this.lastMoving = isMoving;
            this.lastSubmerged = isSubmerged;
            this.lastInWater = isInWater;
            if (isMoving && !isSubmerged && isInWater) {
                if (this.trailerFx) {
                    this.trailerFx.enable();
                }
                else {
                    const wakeAnim = this.art.getAnimation(this.rules.audioVisual.wake);
                    if (wakeAnim) {
                        const images = this.imageFinder.findByObjectArt(wakeAnim);
                        const palette = this.theater.getPalette(wakeAnim.paletteType);
                        const spawnDelay = this.gameObject.art.spawnDelay;
                        this.trailerFx = new TrailerSmokeFx(this.trailPos, spawnDelay, wakeAnim, images, palette, this.gameSpeed);
                        this.renderableManager.addEffect(this.trailerFx);
                    }
                }
            }
            else {
                this.trailerFx?.disable();
            }
        }
    }
    onRemove(): void {
        this.renderableManager = undefined;
        this.trailerFx?.finishAndRemove();
    }
    dispose(): void {
        this.trailerFx?.finishAndRemove();
    }
}
