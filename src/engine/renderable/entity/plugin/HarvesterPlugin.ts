import { HarvesterStatus } from "@/game/gameobject/trait/HarvesterTrait";
import { Coords } from "@/game/Coords";
export class HarvesterPlugin {
    private gameObject: any;
    private harvesterTrait: any;
    private renderableManager?: any;
    private harvestAnim?: any;
    private lastHarvesterStatus?: HarvesterStatus;
    constructor(gameObject: any, harvesterTrait: any) {
        this.gameObject = gameObject;
        this.harvesterTrait = harvesterTrait;
    }
    onCreate(renderableManager: any): void {
        this.renderableManager = renderableManager;
    }
    update(time: number): void {
        if (this.gameObject.warpedOutTrait.isActive()) {
            this.disposeHarvAnim();
            this.lastHarvesterStatus = undefined;
            return;
        }
        if (!this.renderableManager)
            return;
        const status = this.harvesterTrait.status;
        if (status !== this.lastHarvesterStatus) {
            this.lastHarvesterStatus = status;
            this.disposeHarvAnim();
            if (status === HarvesterStatus.Harvesting) {
                this.harvestAnim = this.renderableManager.createTransientAnim("OREGATH", (anim: any) => {
                    const tile = this.gameObject.tile;
                    anim.setPosition(Coords.tile3dToWorld(tile.rx + 0.5, tile.ry + 0.5, tile.z));
                    anim.create3DObject();
                    const animProps = anim.getAnimProps();
                    const framesPerDirection = Math.floor(anim.getShpFile().numImages / 8);
                    let direction = (this.gameObject.direction - 45 + 360) % 360;
                    direction = (Math.round((direction / 360) * 8) % 8) * framesPerDirection;
                    animProps.loopStart = animProps.start = direction;
                    animProps.loopEnd = direction + framesPerDirection - 1;
                    animProps.loopCount = -1;
                });
            }
        }
    }
    private disposeHarvAnim(): void {
        this.harvestAnim?.remove();
        this.harvestAnim?.dispose();
        this.harvestAnim = undefined;
    }
    onRemove(): void {
        this.disposeHarvAnim();
    }
    dispose(): void {
        this.disposeHarvAnim();
    }
}
