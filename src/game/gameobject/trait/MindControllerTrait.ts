import { NotifyUnspawn } from './interface/NotifyUnspawn';
import { GameObject } from '@/game/gameobject/GameObject';
import { World } from '@/game/World';
export class MindControllerTrait {
    private gameObject: GameObject;
    private maxCapacity: number;
    private targets: GameObject[];
    constructor(gameObject: GameObject, maxCapacity: number = 1) {
        this.gameObject = gameObject;
        this.maxCapacity = maxCapacity;
        this.targets = [];
    }
    isActive(): boolean {
        return this.targets.length > 0;
    }
    isAtCapacity(): boolean {
        return this.targets.length === this.maxCapacity;
    }
    getTargets(): GameObject[] {
        return this.targets;
    }
    control(target: GameObject, world: World): void {
        if (!this.gameObject) {
            throw new Error("Trait already disposed");
        }
        if (!target.mindControllableTrait) {
            throw new Error(`Target "${target.name}" cannot be mind controlled`);
        }
        if (target.isDisposed) {
            throw new Error(`Target "${target.name}" is disposed`);
        }
        target.mindControllableTrait.controlBy(this.gameObject, world);
        this.targets.push(target);
        while (this.targets.length > this.maxCapacity) {
            const oldestTarget = this.targets.shift();
            oldestTarget.mindControllableTrait.restore(world);
        }
    }
    cleanTarget(target: GameObject): void {
        const index = this.targets.indexOf(target);
        if (index !== -1) {
            this.targets.splice(index, 1);
        }
    }
    [NotifyUnspawn.onUnspawn](gameObject: GameObject, world: World): void {
        for (const target of this.targets) {
            target.mindControllableTrait.restore(world);
        }
        this.targets.length = 0;
    }
    dispose(): void {
        this.gameObject = undefined;
    }
}
