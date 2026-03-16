import { ObjectType } from '@/engine/type/ObjectType';
interface Unit {
    name: string;
    cost: number;
    isAvailableTo: (owner: any) => boolean;
    hasOwner: (owner: any) => boolean;
}
interface GeneratedUnit {
    name: string;
    type: ObjectType;
    count: number;
}
export class StartingUnitsGenerator {
    static generate(multiplier: number, preferredUnits: string[], availableUnits: Unit[], owner: any): GeneratedUnit[] {
        const totalCost = (availableUnits.reduce((sum, unit) => sum + unit.cost, 0) / availableUnits.length) * multiplier;
        const generatedUnits: GeneratedUnit[] = [];
        let remainingCost = totalCost;
        const filteredUnits = availableUnits.filter(unit => unit.isAvailableTo(owner) && unit.hasOwner(owner));
        const preferredUnitList = filteredUnits.filter(unit => preferredUnits.includes(unit.name));
        for (const unit of preferredUnitList) {
            if (remainingCost <= 0)
                break;
            const costPerUnit = (2 / 3) / preferredUnitList.length;
            const unitCount = Math.ceil((costPerUnit * totalCost) / unit.cost);
            remainingCost -= unitCount * unit.cost;
            generatedUnits.push({
                name: unit.name,
                type: ObjectType.Vehicle,
                count: unitCount
            });
        }
        const remainingUnits = filteredUnits.filter(unit => !preferredUnitList.includes(unit));
        const costPerRemainingUnit = remainingCost / remainingUnits.length;
        for (const unit of remainingUnits) {
            if (remainingCost <= 0)
                break;
            const unitCount = Math.ceil(costPerRemainingUnit / unit.cost);
            remainingCost -= unitCount * unit.cost;
            generatedUnits.push({
                name: unit.name,
                type: ObjectType.Infantry,
                count: unitCount
            });
        }
        return generatedUnits;
    }
}
