import { ObjectType } from '@/engine/type/ObjectType';
import { NotifyOwnerChange } from '@/game/gameobject/trait/interface/NotifyOwnerChange';
import { NotifySpawn } from '@/game/gameobject/trait/interface/NotifySpawn';
import { NotifyUnspawn } from '@/game/gameobject/trait/interface/NotifyUnspawn';
export class SuperWeaponTrait {
    private name: string;
    constructor(name: string) {
        this.name = name;
    }
    getSuperWeapon(gameObject: any) {
        return gameObject.owner.superWeaponsTrait?.get(this.name);
    }
    [NotifySpawn.onSpawn](gameObject: any, world: any): void {
        this.addSuperWeaponToPlayerIfNeeded(gameObject.owner, world);
    }
    [NotifyUnspawn.onUnspawn](gameObject: any, world: any): void {
        this.removeSuperWeaponFromPlayerIfNeeded(gameObject.owner);
    }
    [NotifyOwnerChange.onChange](gameObject: any, oldOwner: any, newOwner: any): void {
        this.removeSuperWeaponFromPlayerIfNeeded(oldOwner);
        this.addSuperWeaponToPlayerIfNeeded(gameObject.owner, newOwner);
    }
    private addSuperWeaponToPlayerIfNeeded(player: any, world: any): void {
        if (player.superWeaponsTrait && !player.superWeaponsTrait.has(this.name)) {
            const superWeapon = world.createSuperWeapon(this.name, player);
            player.superWeaponsTrait.add(superWeapon);
            if (superWeapon.rules.isPowered && player.powerTrait?.isLowPower()) {
                superWeapon.pauseTimer();
            }
        }
    }
    private removeSuperWeaponFromPlayerIfNeeded(player: any): void {
        const superWeaponsTrait = player.superWeaponsTrait;
        if (!superWeaponsTrait)
            return;
        const hasBuildingWithSuperWeapon = player
            .getOwnedObjectsByType(ObjectType.Building)
            .some(building => building.superWeaponTrait?.name === this.name);
        if (!hasBuildingWithSuperWeapon) {
            const superWeapon = superWeaponsTrait.get(this.name);
            if (superWeapon && !superWeapon.isGift) {
                superWeaponsTrait.remove(this.name);
            }
        }
    }
}
