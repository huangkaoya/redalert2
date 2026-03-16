import { ObjectType } from '@/engine/type/ObjectType';
import { Traits } from '@/game/Traits';
import { NotifyTick } from '@/game/gameobject/trait/interface/NotifyTick';
import { NotifyDestroy } from '@/game/gameobject/trait/interface/NotifyDestroy';
import { fnv32a } from '@/util/math';
import { NotifyOwnerChange } from '@/game/gameobject/trait/interface/NotifyOwnerChange';
import { NotifySpawn } from '@/game/gameobject/trait/interface/NotifySpawn';
import { NotifyUnspawn } from '@/game/gameobject/trait/interface/NotifyUnspawn';
import { NotifyAttack } from '@/game/gameobject/trait/interface/NotifyAttack';
import { DeathType } from '@/game/gameobject/common/DeathType';
export class GameObject {
    public traits: Traits;
    public cachedTraits: {
        tick: any[];
    };
    public isCrashing: boolean;
    public isDestroyed: boolean;
    public deathType: DeathType;
    public isDisposed: boolean;
    public isSpawned: boolean;
    public type: ObjectType;
    public name: string;
    public rules: any;
    public art: any;
    public id: number;
    public position: any;
    get tile() {
        return this.position.tile;
    }
    get tileElevation() {
        return this.position.tileElevation;
    }
    constructor(type: ObjectType, name: string, rules: any, art: any) {
        this.traits = new Traits();
        this.cachedTraits = { tick: [] };
        this.isCrashing = false;
        this.isDestroyed = false;
        this.deathType = DeathType.Normal;
        this.isDisposed = false;
        this.isSpawned = false;
        this.type = type;
        this.name = name;
        this.rules = rules;
        this.art = art;
    }
    getFoundation() {
        return { width: 1, height: 1 };
    }
    isSmudge() {
        return this.type === ObjectType.Smudge;
    }
    isOverlay() {
        return this.type === ObjectType.Overlay;
    }
    isTerrain() {
        return this.type === ObjectType.Terrain;
    }
    isProjectile() {
        return this.type === ObjectType.Projectile;
    }
    isDebris() {
        return this.type === ObjectType.Debris;
    }
    isBuilding() {
        return false;
    }
    isInfantry() {
        return false;
    }
    isVehicle() {
        return false;
    }
    isAircraft() {
        return false;
    }
    isUnit() {
        return false;
    }
    isTechno() {
        return false;
    }
    update(deltaTime: number) {
        for (const trait of this.cachedTraits.tick) {
            trait[NotifyTick.onTick](this, deltaTime);
        }
    }
    onSpawn(data: any) {
        this.isSpawned = true;
        this.traits.filter(NotifySpawn).forEach((trait) => {
            trait[NotifySpawn.onSpawn](this, data);
        });
    }
    onUnspawn(data: any) {
        this.isSpawned = false;
        this.traits.filter(NotifyUnspawn).forEach((trait) => {
            trait[NotifyUnspawn.onUnspawn](this, data);
        });
    }
    onDestroy(data: any, type: any, reason: any) {
        this.traits.filter(NotifyDestroy).forEach((trait) => {
            trait[NotifyDestroy.onDestroy](this, data, type, reason);
        });
    }
    onOwnerChange(data: any, owner: any) {
        this.traits.filter(NotifyOwnerChange).forEach((trait) => {
            trait[NotifyOwnerChange.onChange](this, data, owner);
        });
    }
    onAttack(data: any, target: any) {
        this.traits.filter(NotifyAttack).forEach((trait) => {
            trait[NotifyAttack.onAttack](this, target, data);
        });
    }
    addTrait(trait: any) {
        this.traits.add(trait);
        if (trait[NotifyTick.onTick]) {
            this.cachedTraits.tick.push(trait);
        }
    }
    getUiName() {
        return this.rules.uiName;
    }
    getHash() {
        const pos = this.position.worldPosition;
        return fnv32a([
            this.id,
            ...new Uint8Array(new Float64Array([pos.x, pos.y, pos.z]).buffer),
            ...this.traits.getAll().map((trait) => trait.getHash?.() ?? 0),
        ]);
    }
    debugGetState() {
        return {
            id: this.id,
            position: this.position.worldPosition.toArray(),
            traits: this.traits.getAll().reduce((acc, trait) => {
                const state = trait.debugGetState?.();
                if (state !== undefined) {
                    acc[trait.constructor.name] = state;
                }
                return acc;
            }, {}),
        };
    }
    dispose() {
        this.isDisposed = true;
        this.traits.dispose();
        this.cachedTraits.tick.length = 0;
    }
}
