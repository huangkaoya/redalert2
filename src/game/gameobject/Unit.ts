import { ObjectType } from '@/engine/type/ObjectType';
import { Techno } from '@/game/gameobject/Techno';
export class Unit extends Techno {
    static factory(id: string, rules: any, owner: any, general?: any): Unit {
        return new this(id, rules, owner, general);
    }
    constructor(id: string, rules: any, owner: any, general?: any) {
        super(ObjectType.Vehicle as any, id, rules, owner);
    }
}
