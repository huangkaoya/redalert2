import { GameObject } from '@/game/gameobject/GameObject';
import { TechnoRules } from '@/game/rules/TechnoRules';
import { VeteranLevel } from '@/game/gameobject/unit/VeteranLevel';
import { NotifyTick } from '@/game/gameobject/trait/interface/NotifyTick';
export class Techno extends GameObject {
    explodes: boolean;
    radarInvisible: boolean;
    c4: boolean;
    crusher: boolean;
    defaultToGuardArea: boolean;
    guardMode: boolean;
    purchaseValue: number;
    guardArea?: any;
    get primaryWeapon() {
        return this.armedTrait?.primaryWeapon;
    }
    get secondaryWeapon() {
        return this.armedTrait?.secondaryWeapon;
    }
    get ammo() {
        return this.ammoTrait?.ammo;
    }
    get sight() {
        return Math.min(TechnoRules.MAX_SIGHT, this.rules.sight * (this.veteranTrait?.getVeteranSightMultiplier() ?? 1));
    }
    get veteranLevel() {
        return this.veteranTrait?.veteranLevel ?? VeteranLevel.None;
    }
    constructor(id: string, rules: any, owner: any, general: any) {
        super(id, rules, owner, general);
        this.explodes = this.rules.explodes;
        this.radarInvisible = this.rules.radarInvisible;
        this.c4 = this.rules.c4;
        this.crusher = this.rules.crusher;
        this.defaultToGuardArea = this.rules.defaultToGuardArea;
        this.guardMode = this.rules.defaultToGuardArea;
        this.purchaseValue = this.rules.cost;
    }
    resetGuardModeToIdle() {
        this.guardMode = this.defaultToGuardArea;
        this.guardArea = undefined;
    }
    update(delta: number) {
        if (this.warpedOutTrait.isActive()) {
            for (const trait of this.cachedTraits.tick) {
                if (trait.ticksWhenWarpedOut) {
                    trait[NotifyTick.onTick](this, delta);
                }
            }
        }
        else {
            super.update(delta);
        }
    }
    isTechno(): boolean {
        return true;
    }
}
