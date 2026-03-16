import { DamageSmokeFx } from "@/engine/renderable/fx/DamageSmokeFx";
export class DamageSmokePlugin {
    private gameObject: any;
    private art: any;
    private theater: any;
    private imageFinder: any;
    private gameSpeed: any;
    private renderableManager?: any;
    private smokeFx?: DamageSmokeFx;
    private lastDamaged?: boolean;
    private smokeStartTime?: number;
    constructor(gameObject: any, art: any, theater: any, imageFinder: any, gameSpeed: any) {
        this.gameObject = gameObject;
        this.art = art;
        this.theater = theater;
        this.imageFinder = imageFinder;
        this.gameSpeed = gameSpeed;
    }
    onCreate(renderableManager: any): void {
        this.renderableManager = renderableManager;
    }
    update(time: number): void {
        if (!this.renderableManager)
            return;
        const isDamaged = this.gameObject.healthTrait.health < 50;
        const isDamagedChanged = isDamaged !== this.lastDamaged;
        const isDestroyed = this.gameObject.isDestroyed;
        if (isDamagedChanged || isDestroyed) {
            this.lastDamaged = isDamaged;
            if (isDamaged) {
                if (!this.smokeFx) {
                    this.smokeStartTime = time;
                    const anim = this.art.getAnimation("SGRYSMK1");
                    if (anim) {
                        const image = this.imageFinder.findByObjectArt(anim);
                        const palette = this.theater.getPalette(anim.paletteType);
                        this.smokeFx = new DamageSmokeFx(this.gameObject, anim, image, palette, this.gameSpeed);
                        this.renderableManager.addEffect(this.smokeFx);
                    }
                }
            }
            else {
                this.disposeSmokeFx();
            }
        }
        if (this.smokeFx &&
            this.smokeStartTime &&
            time - this.smokeStartTime >= 80000 / this.gameSpeed.value) {
            this.disposeSmokeFx();
        }
    }
    private disposeSmokeFx(): void {
        if (this.smokeFx) {
            this.smokeFx.finishAndRemove();
            this.smokeFx = undefined;
        }
    }
    onRemove(): void {
        this.renderableManager = undefined;
        this.disposeSmokeFx();
    }
    dispose(): void {
        this.disposeSmokeFx();
    }
}
