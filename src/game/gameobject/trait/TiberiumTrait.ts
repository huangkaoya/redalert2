import { OreOverlayTypes } from '@/game/map/OreOverlayTypes';
import { OverlayTibType } from '@/engine/type/OverlayTibType';
import { TiberiumType } from '@/engine/type/TiberiumType';
import { LandType } from '@/game/type/LandType';
import { GameObject } from '@/game/gameobject/GameObject';
import { World } from '@/game/World';
export class TiberiumTrait {
    static maxBails: number = 11;
    private gameObject: GameObject;
    constructor(gameObject: GameObject) {
        this.gameObject = gameObject;
    }
    static canBePlacedOn(tile: any, world: World): boolean {
        return ([LandType.Clear, LandType.Road, LandType.Rough].includes(tile.landType) &&
            !world
                .getGroundObjectsOnTile(tile)
                .find((obj) => !obj.isSmudge() && !obj.isUnit()));
    }
    getTiberiumType(): TiberiumType {
        const overlayTibType = OreOverlayTypes.getOverlayTibType(this.gameObject.overlayId);
        switch (overlayTibType) {
            case OverlayTibType.Ore:
                return TiberiumType.Ore;
            case OverlayTibType.Gems:
                return TiberiumType.Gems;
            case OverlayTibType.Vinifera:
                return TiberiumType.Ore;
            default:
                throw new Error(`Unsupported tiberium type ${overlayTibType}`);
        }
    }
    collectBail(): TiberiumType | undefined {
        const bailCount = this.getBailCount();
        if (bailCount <= 0) {
            throw new Error('Attempted to collect an ore bail, but there are none left');
        }
        this.gameObject.value--;
        return bailCount > 1 ? this.getTiberiumType() : undefined;
    }
    spawnBails(count: number): void {
        this.gameObject.value = Math.min(TiberiumTrait.maxBails, this.gameObject.value + count);
    }
    removeBails(count: number): void {
        this.gameObject.value = Math.max(-1, this.gameObject.value - count);
    }
    getBailCount(): number {
        return this.gameObject.value + 1;
    }
    dispose(): void {
        this.gameObject = undefined;
    }
}
