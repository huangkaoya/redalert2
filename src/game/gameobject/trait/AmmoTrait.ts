import { clamp } from "@/util/math";
export class AmmoTrait {
    private _ammo: number;
    private maxAmmo: number;
    constructor(maxAmmo: number, ammo: number = maxAmmo) {
        this.maxAmmo = maxAmmo;
        this.ammo = ammo;
    }
    get ammo(): number {
        return this._ammo;
    }
    set ammo(value: number) {
        this._ammo = clamp(value, 0, this.maxAmmo);
    }
    isFull(): boolean {
        return this.ammo === this.maxAmmo;
    }
}
