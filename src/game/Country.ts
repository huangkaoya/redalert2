import { ObjectType } from '@/engine/type/ObjectType';
interface CountryRules {
    id: string;
    side: string;
    name: string;
    multiplay: boolean;
    multiplayPassive: boolean;
    veteranAircraft: string[];
    veteranInfantry: string[];
    veteranUnits: string[];
    getCountry(id: string): CountryRules;
}
export class Country {
    private rules: CountryRules;
    static factory(id: string, rules: CountryRules): Country {
        return new this(rules.getCountry(id));
    }
    constructor(rules: CountryRules) {
        this.rules = rules;
    }
    get id(): string {
        return this.rules.id;
    }
    get side(): string {
        return this.rules.side;
    }
    get name(): string {
        return this.rules.name;
    }
    isPlayable(): boolean {
        return this.rules.multiplay && !this.rules.multiplayPassive;
    }
    hasVeteranUnit(type: ObjectType, name: string): boolean {
        let veteranUnits: string[];
        switch (type) {
            case ObjectType.Aircraft:
                veteranUnits = this.rules.veteranAircraft;
                break;
            case ObjectType.Infantry:
                veteranUnits = this.rules.veteranInfantry;
                break;
            case ObjectType.Vehicle:
                veteranUnits = this.rules.veteranUnits;
                break;
            default:
                throw new Error(`Unsupported object type "${ObjectType[type]}"`);
        }
        return veteranUnits.includes(name);
    }
}
