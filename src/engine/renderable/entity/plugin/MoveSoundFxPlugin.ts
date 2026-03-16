import { ZoneType } from "@/game/gameobject/unit/ZoneType";
export class MoveSoundFxPlugin {
    private gameObject: any;
    private moveSound: any;
    private worldSound: any;
    private lastMovingOrRotating: boolean = false;
    private soundHandle?: any;
    constructor(gameObject: any, moveSound: any, worldSound: any) {
        this.gameObject = gameObject;
        this.moveSound = moveSound;
        this.worldSound = worldSound;
    }
    onCreate(): void { }
    update(): void {
        if (this.gameObject.isDestroyed || this.gameObject.isCrashing) {
            return;
        }
        const isMovingOrRotating = !this.gameObject.warpedOutTrait.isActive() &&
            !!((!this.gameObject.rules.balloonHover &&
                this.gameObject.rules.hoverAttack &&
                this.gameObject.zone === ZoneType.Air) ||
                this.gameObject.spinVelocity ||
                (!this.gameObject.moveTrait.isIdle() &&
                    !this.gameObject.moveTrait.isWaiting()));
        if (isMovingOrRotating !== this.lastMovingOrRotating) {
            this.lastMovingOrRotating = isMovingOrRotating;
            if (isMovingOrRotating) {
                if (!this.soundHandle?.isPlaying()) {
                    this.soundHandle = this.worldSound.playEffect(this.moveSound, this.gameObject, this.gameObject.owner, 0.35);
                }
            }
            else if (this.soundHandle?.isLoop) {
                this.soundHandle.stop();
                this.soundHandle = undefined;
            }
        }
    }
    onRemove(): void {
        this.soundHandle?.stop();
    }
    dispose(): void {
        this.soundHandle?.stop();
    }
}
