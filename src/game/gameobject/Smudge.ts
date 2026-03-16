import { ObjectType } from '@/engine/type/ObjectType';
import { GameObject } from '@/game/gameobject/GameObject';
export class Smudge extends GameObject {
    static factory(id: string, rules: any, owner: any): Smudge {
        return new this(id, rules, owner);
    }
    constructor(id: string, rules: any, owner: any) {
        super(ObjectType.Smudge, id, rules, owner);
    }
    getFoundation(): {
        width: number;
        height: number;
    } {
        return { width: this.rules.width, height: this.rules.height };
    }
}
