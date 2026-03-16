import { ObjectRules } from './ObjectRules';
import { TheaterType } from '@/engine/TheaterType';
import { ObjectType } from '@/engine/type/ObjectType';
export enum OccupationBits {
    All = 7,
    Right = 1,
    Left = 2,
    Bottom = 4
}
function testOccupationBit(subCell: number, bits: number): boolean {
    switch (subCell) {
        case 0:
        case 1:
            return true;
        case 2:
            return (bits & OccupationBits.Right) !== 0;
        case 3:
            return (bits & OccupationBits.Left) !== 0;
        case 4:
            return (bits & OccupationBits.Bottom) !== 0;
        default:
            throw new Error(`Invalid subCell "${subCell}"`);
    }
}
export class TerrainRules extends ObjectRules {
    public animationRate!: number;
    public animationProbability!: number;
    public gate!: boolean;
    public immune!: boolean;
    public isAnimated!: boolean;
    public snowOccupationBits!: number;
    public spawnsTiberium!: boolean;
    public strength!: number;
    public radarInvisible!: boolean;
    public temperateOccupationBits!: number;
    constructor(type: ObjectType, ini: any, index: number = -1, generalRules?: any) {
        super(type, ini, index, generalRules);
        this.parse();
    }
    protected parse(): void {
        super.parse();
        this.animationRate = this.ini.getNumber("AnimationRate");
        this.animationProbability = this.ini.getNumber("AnimationProbability");
        this.gate = this.ini.getBool("Gate");
        this.immune = this.ini.getBool("Immune");
        this.isAnimated = this.ini.getBool("IsAnimated");
        this.snowOccupationBits = this.normalizeOccupationBits(this.ini.getNumber("SnowOccupationBits", OccupationBits.All));
        this.spawnsTiberium = this.ini.getBool("SpawnsTiberium");
        this.strength = this.ini.getNumber("Strength");
        this.radarInvisible = this.ini.getBool("RadarInvisible");
        this.temperateOccupationBits = this.normalizeOccupationBits(this.ini.getNumber("TemperateOccupationBits", OccupationBits.All));
    }
    private normalizeOccupationBits(bits: number): number {
        return (bits + 8 * Math.abs(Math.floor(bits / 8))) % 8;
    }
    public getOccupationBits(theaterType: TheaterType): number {
        return theaterType !== TheaterType.Snow
            ? this.temperateOccupationBits
            : this.snowOccupationBits;
    }
    public getOccupiedSubCells(theaterType: TheaterType): number[] {
        const bits = this.getOccupationBits(theaterType);
        const allSubCells = [0, 1, 2, 3, 4];
        if (bits === OccupationBits.All) {
            return allSubCells;
        }
        const occupiedSubCells: number[] = [];
        for (const subCell of allSubCells) {
            if (testOccupationBit(subCell, bits)) {
                occupiedSubCells.push(subCell);
            }
        }
        return occupiedSubCells;
    }
}
