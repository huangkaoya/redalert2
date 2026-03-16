import { NotifyTick } from './interface/NotifyTick';
import { GameSpeed } from '@/game/GameSpeed';
import { GameObject } from '@/game/gameobject/GameObject';
import { World } from '@/game/World';
export class SelfHealingTrait {
    private cooldownTicks: number = 0;
    [NotifyTick.onTick](gameObject: GameObject, world: World): void {
        if (gameObject.healthTrait.health !== 100) {
            if (this.cooldownTicks <= 0) {
                this.cooldownTicks +=
                    GameSpeed.BASE_TICKS_PER_SECOND *
                        world.rules.general.repair.repairRate *
                        60;
                gameObject.healthTrait.healBy(1, gameObject, world);
            }
            else {
                this.cooldownTicks--;
            }
        }
    }
}
