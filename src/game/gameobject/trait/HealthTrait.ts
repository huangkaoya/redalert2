import { clamp } from '@/util/math';
import { NotifyDamage } from './interface/NotifyDamage';
import { NotifyHealthChange } from './interface/NotifyHealthChange';
import { InflictDamageEvent } from '@/game/event/InflictDamageEvent';
import { NotifyHeal } from './interface/NotifyHeal';
import { HealthLevel } from '@/game/gameobject/unit/HealthLevel';
import { NotifyTick } from './interface/NotifyTick';
import { HealthChangeEvent } from '@/game/event/HealthChangeEvent';
import { GameObject } from '@/game/gameobject/GameObject';
import { World } from '@/game/World';
export class HealthTrait {
    private maxHitPoints: number;
    private hitPoints: number;
    private _computedHealth: number;
    private projectedHitPoints: number;
    private gameObject: GameObject;
    private conditionYellow: number;
    private conditionRed: number;
    get health(): number {
        return this._computedHealth;
    }
    set health(value: number) {
        this.setHitPoints(value > 0 ? Math.max(1, Math.floor((value * this.maxHitPoints) / 100)) : 0);
        this.projectedHitPoints = this.hitPoints;
    }
    get level(): HealthLevel {
        return this.health > 100 * this.conditionYellow
            ? HealthLevel.Green
            : this.health > 100 * this.conditionRed
                ? HealthLevel.Yellow
                : HealthLevel.Red;
    }
    constructor(maxHitPoints: number, gameObject: GameObject, conditionYellow: number, conditionRed: number) {
        this.maxHitPoints = maxHitPoints;
        this.gameObject = gameObject;
        this.conditionYellow = conditionYellow;
        this.conditionRed = conditionRed;
        this.setHitPoints(maxHitPoints);
        this.projectedHitPoints = this.hitPoints;
    }
    setHitPoints(value: number): void {
        if (value !== Math.floor(value)) {
            throw new Error(`Value ${value} is not an integer`);
        }
        this.hitPoints = clamp(value, 0, this.maxHitPoints);
        this._computedHealth = (this.hitPoints / this.maxHitPoints) * 100;
    }
    getHitPoints(): number {
        return this.hitPoints;
    }
    getProjectedHitPoints(): number {
        return this.projectedHitPoints;
    }
    inflictDamage(amount: number, source: GameObject, world: World): void {
        const oldHitPoints = this.hitPoints;
        const oldHealth = this.health;
        this.applyHitPoints(oldHitPoints - amount, world);
        if (oldHitPoints !== this.hitPoints && amount > 0) {
            this.gameObject.traits
                .filter(NotifyDamage)
                .forEach((trait) => {
                trait[NotifyDamage.onDamage](this.gameObject, world, amount, source);
            });
            world.events.dispatch(new InflictDamageEvent(this.gameObject, source, amount, this.health, oldHealth));
        }
    }
    healBy(amount: number, source: GameObject, world: World): void {
        if (amount < 0) {
            throw new Error("Can't heal by negative value " + amount);
        }
        if (this.hitPoints < this.maxHitPoints) {
            const oldHitPoints = this.hitPoints;
            this.applyHitPoints(this.hitPoints + amount, world);
            this.projectedHitPoints = this.hitPoints;
            const healedAmount = this.hitPoints - oldHitPoints;
            this.gameObject.traits
                .filter(NotifyHeal)
                .forEach((trait) => {
                trait[NotifyHeal.onHeal]?.(this.gameObject, world, healedAmount, source);
            });
        }
    }
    healToFull(source: GameObject, world: World): void {
        if (this.hitPoints < this.maxHitPoints) {
            const oldHitPoints = this.hitPoints;
            this.applyHitPoints(this.maxHitPoints, world);
            this.projectedHitPoints = this.hitPoints;
            const healedAmount = this.hitPoints - oldHitPoints;
            this.gameObject.traits
                .filter(NotifyHeal)
                .forEach((trait) => {
                trait[NotifyHeal.onHeal]?.(this.gameObject, world, healedAmount, source);
            });
        }
    }
    applyHitPoints(value: number, world: World): void {
        const oldHealth = this.health;
        this.setHitPoints(value);
        if (oldHealth !== this.health) {
            world.traits
                .filter(NotifyHealthChange)
                .forEach((trait) => {
                trait[NotifyHealthChange.onChange](this.gameObject, world, oldHealth);
            });
            this.gameObject.traits
                .filter(NotifyHealthChange)
                .forEach((trait) => {
                trait[NotifyHealthChange.onChange](this.gameObject, world, oldHealth);
            });
            world.events.dispatch(new HealthChangeEvent(this.gameObject, this.health, oldHealth));
        }
    }
    projectDamage(amount: number): void {
        if (amount < 0) {
            throw new Error("Projected damage must be positive");
        }
        this.projectedHitPoints = Math.max(-30, this.projectedHitPoints - amount);
    }
    [NotifyTick.onTick](gameObject: GameObject, world: World): void {
        if (world.currentTick % 4 === 0) {
            this.projectedHitPoints = Math.min(this.projectedHitPoints + 1, this.hitPoints);
        }
    }
    getHash(): number {
        return this.hitPoints;
    }
    debugGetState(): {
        hitPoints: number;
    } {
        return { hitPoints: this.hitPoints };
    }
    dispose(): void {
        this.gameObject = undefined;
    }
}
