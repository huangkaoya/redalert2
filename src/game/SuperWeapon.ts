import { SuperWeaponReadyEvent } from './event/SuperWeaponReadyEvent';
import { GameSpeed } from './GameSpeed';
export enum SuperWeaponStatus {
    Charging = 0,
    Paused = 1,
    Ready = 2
}
export class SuperWeapon {
    public name: string;
    public rules: any;
    public owner: any;
    public oneTimeOnly: boolean;
    public status: SuperWeaponStatus;
    public isGift: boolean;
    public rechargeTicks: number;
    public chargeTicks: number;
    constructor(name: string, rules: any, owner: any, oneTimeOnly: boolean = false) {
        this.name = name;
        this.rules = rules;
        this.owner = owner;
        this.oneTimeOnly = oneTimeOnly;
        this.status = SuperWeaponStatus.Charging;
        this.isGift = false;
        this.rechargeTicks = 60 * rules.rechargeTime * GameSpeed.BASE_TICKS_PER_SECOND;
        this.chargeTicks = this.rechargeTicks;
        if (oneTimeOnly) {
            this.status = SuperWeaponStatus.Ready;
            this.chargeTicks = 0;
        }
    }
    update(game: any): void {
        if (this.chargeTicks > 0 && this.status !== SuperWeaponStatus.Paused) {
            this.chargeTicks--;
            if (this.chargeTicks === 0) {
                this.status = SuperWeaponStatus.Ready;
                game.events.dispatch(new SuperWeaponReadyEvent(this));
            }
        }
    }
    pauseTimer(): void {
        this.status = SuperWeaponStatus.Paused;
    }
    resumeTimer(): void {
        this.status = this.chargeTicks > 0 ? SuperWeaponStatus.Charging : SuperWeaponStatus.Ready;
    }
    resetTimer(): void {
        this.chargeTicks = this.rechargeTicks;
        if (this.status === SuperWeaponStatus.Ready) {
            this.status = SuperWeaponStatus.Charging;
        }
    }
    getTimerSeconds(): number {
        return this.chargeTicks / GameSpeed.BASE_TICKS_PER_SECOND;
    }
    getChargeProgress(): number {
        return (this.rechargeTicks - this.chargeTicks) / this.rechargeTicks;
    }
}
