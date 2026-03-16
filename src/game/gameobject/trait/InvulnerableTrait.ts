import { Timer } from '@/game/gameobject/unit/Timer';
import { NotifyTick } from './interface/NotifyTick';
import { GameObject } from '@/game/gameobject/GameObject';
import { World } from '@/game/World';
export class InvulnerableTrait {
    private timer: Timer;
    constructor() {
        this.timer = new Timer();
    }
    isActive(): boolean {
        return this.timer.isActive();
    }
    setActiveFor(duration: number, world: World): void {
        this.timer.setActiveFor(duration, world);
    }
    [NotifyTick.onTick](gameObject: GameObject, world: World): void {
        this.timer.tick(world.currentTick);
    }
}
