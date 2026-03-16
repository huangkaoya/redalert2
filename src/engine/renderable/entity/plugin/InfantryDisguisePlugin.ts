import { ObjectType } from "@/engine/type/ObjectType";
export class InfantryDisguisePlugin {
    private gameObject: any;
    private disguiseTrait: any;
    private localPlayer: any;
    private alliances: any;
    private renderable: any;
    private art: any;
    private gameSpeed: any;
    private canSeeThroughDisguise: boolean = false;
    private lastDisguise?: any;
    private disguisedAt?: number;
    private lastRenderDisguise?: any;
    constructor(gameObject: any, disguiseTrait: any, localPlayer: any, alliances: any, renderable: any, art: any, gameSpeed: any) {
        this.gameObject = gameObject;
        this.disguiseTrait = disguiseTrait;
        this.localPlayer = localPlayer;
        this.alliances = alliances;
        this.renderable = renderable;
        this.art = art;
        this.gameSpeed = gameSpeed;
    }
    onCreate(): void { }
    update(time: number): void {
        if (!this.gameObject.isDestroyed &&
            !this.gameObject.warpedOutTrait.isActive()) {
            let disguise = this.disguiseTrait.getDisguise();
            let objectArt: any;
            if (disguise !== this.lastDisguise) {
                this.lastDisguise = disguise;
                this.disguisedAt = disguise ? time : undefined;
            }
            const player = this.localPlayer.value;
            if (disguise) {
                this.canSeeThroughDisguise =
                    !player ||
                        this.alliances.haveSharedIntel(player, this.gameObject.owner) ||
                        !!player.sharedDetectDisguiseTrait?.has(this.gameObject);
                if (disguise && this.canSeeThroughDisguise) {
                    disguise = player?.sharedDetectDisguiseTrait?.has(this.gameObject)
                        ? undefined
                        : Math.floor((time - this.disguisedAt!) * this.gameSpeed.value) / 1000 % 16 <= 3
                            ? disguise
                            : undefined;
                }
            }
            if (this.lastRenderDisguise !== disguise) {
                this.lastRenderDisguise = disguise;
                if (disguise) {
                    objectArt = this.art.getObject(disguise.rules.name, ObjectType.Infantry);
                    this.renderable.setDisguise({
                        objectArt,
                        owner: disguise.owner,
                    });
                }
                else {
                    this.renderable.setDisguise(undefined);
                }
            }
        }
    }
    onRemove(): void { }
    getUiNameOverride(): string | undefined {
        const disguise = this.gameObject.disguiseTrait?.getDisguise();
        if (disguise && !this.canSeeThroughDisguise) {
            return disguise.rules.uiName;
        }
        return undefined;
    }
    dispose(): void { }
}
