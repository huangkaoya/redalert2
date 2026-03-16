import { LandType } from '@/game/type/LandType';
import { ObjectRules } from '@/game/rules/ObjectRules';
import { ArmorType } from '@/game/type/ArmorType';
import { ObjectType } from '@/engine/type/ObjectType';
export class OverlayRules extends ObjectRules {
    public armor!: ArmorType;
    public crate!: boolean;
    public isARock!: boolean;
    public isRubble!: boolean;
    public isVeinholeMonster!: boolean;
    public isVeins!: boolean;
    public land!: LandType;
    public noUseTileLandType!: boolean;
    public strength!: number;
    public tiberium!: boolean;
    public wall!: boolean;
    public radarInvisible!: boolean;
    constructor(type: ObjectType, ini: any, index: number = -1, generalRules?: any) {
        super(type, ini, index, generalRules);
        this.parse();
    }
    protected parse(): void {
        super.parse();
        this.armor = this.ini.getEnum("Armor", ArmorType, ArmorType.None, true);
        this.crate = this.ini.getBool("Crate");
        const isARock = this.ini.getBool("IsARock");
        this.isARock = isARock;
        this.isRubble = this.ini.getBool("IsRubble");
        this.isVeinholeMonster = this.ini.getBool("IsVeinholeMonster");
        this.isVeins = this.ini.getBool("IsVeins");
        this.land = this.ini.getEnum("Land", LandType, LandType.Clear);
        this.noUseTileLandType = !!this.ini.getString("NoUseTileLandType");
        this.strength = this.ini.getNumber("Strength");
        this.tiberium = this.ini.getBool("Tiberium");
        const isWall = this.ini.getBool("Wall");
        this.wall = isWall;
        this.radarInvisible = this.ini.getBool("RadarInvisible", !isWall && !isARock);
    }
}
