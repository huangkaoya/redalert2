import { TrailerSmokeFx } from "@/engine/renderable/fx/TrailerSmokeFx";
import * as THREE from "three";
export class TrailerSmokePlugin {
    private gameObject: any;
    private art: any;
    private theater: any;
    private imageFinder: any;
    private gameSpeed: any;
    private initialPosition: THREE.Vector3;
    private renderableManager?: any;
    private trailerFx?: TrailerSmokeFx;
    constructor(gameObject: any, art: any, theater: any, imageFinder: any, gameSpeed: any) {
        this.gameObject = gameObject;
        this.art = art;
        this.theater = theater;
        this.imageFinder = imageFinder;
        this.gameSpeed = gameSpeed;
    }
    onCreate(renderableManager: any): void {
        this.initialPosition = this.gameObject.position.worldPosition.clone();
        this.renderableManager = renderableManager;
    }
    update(time: number): void {
        if (this.renderableManager &&
            !this.trailerFx &&
            !this.gameObject.position.worldPosition.equals(this.initialPosition)) {
            if (this.gameObject.isAircraft()) {
                let anim;
                if (this.gameObject.rules.missileSpawn) {
                    anim = this.art.getAnimation("V3TRAIL");
                }
                else if (this.gameObject.isCrashing) {
                    anim = this.art.getAnimation("SGRYSMK1");
                }
                if (anim) {
                    const images = this.imageFinder.findByObjectArt(anim);
                    const palette = this.theater.getPalette(anim.paletteType);
                    const spawnDelay = this.gameObject.art.spawnDelay;
                    this.trailerFx = new TrailerSmokeFx(this.gameObject.position.worldPosition, spawnDelay, anim, images, palette, this.gameSpeed);
                    this.renderableManager.addEffect(this.trailerFx);
                }
            }
            if (this.gameObject.isProjectile() || this.gameObject.isDebris()) {
                const trailerAnim = this.gameObject.isProjectile()
                    ? this.gameObject.art.trailer
                    : this.gameObject.rules.trailerAnim;
                if (trailerAnim) {
                    const anim = this.art.getAnimation(trailerAnim);
                    const images = this.imageFinder.findByObjectArt(anim);
                    const palette = this.theater.getPalette(anim.paletteType);
                    const spawnDelay = this.gameObject.isProjectile()
                        ? this.gameObject.art.spawnDelay
                        : this.gameObject.rules.trailerSeparation;
                    this.trailerFx = new TrailerSmokeFx(this.gameObject.position.worldPosition, spawnDelay, anim, images, palette, this.gameSpeed);
                    this.renderableManager.addEffect(this.trailerFx);
                }
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
