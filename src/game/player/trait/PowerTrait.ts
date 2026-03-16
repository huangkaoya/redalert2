import { PowerLowEvent } from '../../event/PowerLowEvent';
import { PowerRestoreEvent } from '../../event/PowerRestoreEvent';
import { PowerChangeEvent } from '../../event/PowerChangeEvent';
import { NotifyPower } from '../../trait/interface/NotifyPower';
import { fnv32a } from '@/util/math';
export enum PowerLevel {
    Low = 0,
    Normal = 1
}
export class PowerTrait {
    private player: any;
    private power: number;
    private drain: number;
    private level: PowerLevel;
    private blackoutFrames: number;
    private powerByObject: Map<any, number>;
    constructor(player: any) {
        this.player = player;
        this.power = 0;
        this.drain = 0;
        this.level = PowerLevel.Normal;
        this.blackoutFrames = 0;
        this.powerByObject = new Map();
    }
    isLowPower(): boolean {
        return this.level === PowerLevel.Low;
    }
    setBlackoutFor(frames: number, world: any) {
        const wasBlackedOut = this.blackoutFrames > 0;
        this.blackoutFrames = frames;
        if (!wasBlackedOut) {
            this.updateLevel(world);
        }
    }
    updateBlackout(world: any) {
        if (this.blackoutFrames > 0) {
            this.blackoutFrames--;
            if (this.blackoutFrames <= 0) {
                this.updateLevel(world);
            }
        }
    }
    getBlackoutDuration(): number {
        return this.blackoutFrames;
    }
    updateFrom(object: any, action: 'add' | 'update' | 'remove', world: any) {
        const power = object.rules.power;
        if (!power)
            return;
        if (power < 0) {
            if (action === 'add' || action === 'remove') {
                this.drain += action === 'add' ? -power : power;
            }
        }
        else {
            let powerDelta = 0;
            if (action === 'add') {
                const powerValue = Math.ceil((power * object.healthTrait.health) / 100);
                this.powerByObject.set(object, powerValue);
                powerDelta = powerValue;
            }
            else if (action === 'update' || action === 'remove') {
                const oldPowerValue = this.powerByObject.get(object);
                if (oldPowerValue === undefined) {
                    throw new Error("Cannot update power before add.");
                }
                if (action === 'update') {
                    const newPowerValue = Math.ceil((power * object.healthTrait.health) / 100);
                    this.powerByObject.set(object, newPowerValue);
                    powerDelta = newPowerValue - oldPowerValue;
                }
                else {
                    this.powerByObject.delete(object);
                    powerDelta = -oldPowerValue;
                }
            }
            this.power += powerDelta;
        }
        this.updateLevel(world);
        world.traits.filter(NotifyPower).forEach((trait: any) => {
            trait[NotifyPower.onPowerChange](this.player, world);
        });
        world.events.dispatch(new PowerChangeEvent(this.player, this.power, this.drain));
    }
    private updateLevel(world: any) {
        const oldLevel = this.level;
        this.level = this.power >= this.drain && !this.blackoutFrames
            ? PowerLevel.Normal
            : PowerLevel.Low;
        if (this.level !== oldLevel) {
            if (oldLevel === PowerLevel.Normal && this.level === PowerLevel.Low) {
                world.traits.filter(NotifyPower).forEach((trait: any) => {
                    trait[NotifyPower.onPowerLow](this.player, world);
                });
                world.events.dispatch(new PowerLowEvent(this.player));
            }
            if (oldLevel === PowerLevel.Low && this.level === PowerLevel.Normal) {
                world.traits.filter(NotifyPower).forEach((trait: any) => {
                    trait[NotifyPower.onPowerRestore](this.player, world);
                });
                world.events.dispatch(new PowerRestoreEvent(this.player));
            }
        }
    }
    getHash(): number {
        return fnv32a([this.power, this.drain]);
    }
    debugGetState() {
        return { power: this.power, drain: this.drain };
    }
    dispose() {
        this.player = undefined;
        this.powerByObject.clear();
    }
}
