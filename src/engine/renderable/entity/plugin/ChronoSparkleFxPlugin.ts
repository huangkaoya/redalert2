import { Coords } from "@/game/Coords";
export class ChronoSparkleFxPlugin {
    private gameObject: any;
    private sparkleAnimName: string;
    private objMoveTrait?: any;
    private renderableManager?: any;
    private chronoSparkleAnim?: any;
    private lastTeleport?: number;
    private lastWarpedOut?: boolean;
    constructor(gameObject: any, sparkleAnimName: string) {
        this.gameObject = gameObject;
        this.sparkleAnimName = sparkleAnimName;
        this.objMoveTrait = gameObject.isUnit() ? gameObject.moveTrait : undefined;
    }
    onCreate(renderableManager: any): void {
        this.renderableManager = renderableManager;
    }
    update(): void {
        if (!this.gameObject.isDestroyed &&
            !this.gameObject.isCrashing &&
            this.renderableManager) {
            const lastTeleportTick = this.objMoveTrait?.lastTeleportTick;
            const isTeleportChanged = lastTeleportTick !== this.lastTeleport;
            const isWarpedOut = this.gameObject.warpedOutTrait.isActive();
            if (isWarpedOut !== this.lastWarpedOut || isTeleportChanged) {
                this.lastTeleport = lastTeleportTick;
                this.lastWarpedOut = isWarpedOut;
                if (isWarpedOut || isTeleportChanged) {
                    this.chronoSparkleAnim?.endAnimationLoop();
                    this.chronoSparkleAnim = this.renderableManager.createTransientAnim(this.sparkleAnimName, (anim: any) => {
                        anim.extraOffset = {
                            x: 0,
                            y: Coords.ISO_TILE_SIZE / 2,
                        };
                        anim.setPosition(this.gameObject.position.worldPosition.clone());
                        anim.create3DObject();
                        anim.getAnimProps().loopCount = isWarpedOut ? -1 : 1;
                    });
                }
                else if (!isWarpedOut) {
                    this.chronoSparkleAnim?.endAnimationLoop();
                }
            }
        }
    }
    onRemove(): void {
        this.renderableManager = undefined;
        this.chronoSparkleAnim?.endAnimationLoop();
    }
    dispose(): void { }
}
