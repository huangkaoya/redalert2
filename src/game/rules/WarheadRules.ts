import { InfDeathType } from '../gameobject/infantry/InfDeathType';
export class WarheadRules {
    private rules: any;
    private verses: Map<number, number>;
    public affectsAllies!: boolean;
    public animList!: string[];
    public bombDisarm!: boolean;
    public bullets!: boolean;
    public causesDelayKill!: boolean;
    public cellSpread!: number;
    public conventional!: boolean;
    public culling!: boolean;
    public delayKillAtMax!: number;
    public delayKillFrames!: number;
    public electricAssault!: boolean;
    public emEffect!: boolean;
    public infDeath!: InfDeathType;
    public ivanBomb!: boolean;
    public makesDisguise!: boolean;
    public mindControl!: boolean;
    public nukeMaker!: boolean;
    public paralyzes!: number;
    public parasite!: boolean;
    public percentAtMax!: number;
    public proneDamage!: number;
    public psychicDamage!: boolean;
    public radiation!: boolean;
    public rocker!: boolean;
    public sonic!: boolean;
    public temporal!: boolean;
    public wallAbsoluteDestroyer!: boolean;
    public wall!: boolean;
    public wood!: boolean;
    constructor(rules: any) {
        this.rules = rules;
        this.verses = new Map();
        this.parse();
    }
    get name(): string {
        return this.rules.name;
    }
    private parse(): void {
        this.affectsAllies = this.rules.getBool("AffectsAllies", true);
        this.animList = this.rules.getArray("AnimList");
        this.bombDisarm = this.rules.getBool("BombDisarm");
        this.bullets = this.rules.getBool("Bullets");
        this.causesDelayKill = this.rules.getBool("CausesDelayKill");
        this.cellSpread = this.rules.getNumber("CellSpread");
        this.conventional = this.rules.getBool("Conventional");
        this.culling = this.rules.getBool("Culling");
        this.delayKillAtMax = this.rules.getNumber("DelayKillAtMax");
        this.delayKillFrames = this.rules.getNumber("DelayKillFrames");
        this.electricAssault = this.rules.getBool("ElectricAssault");
        this.emEffect = this.rules.getBool("EMEffect");
        this.infDeath = this.rules.getEnumNumeric("InfDeath", InfDeathType, InfDeathType.None);
        this.ivanBomb = this.rules.getBool("IvanBomb");
        this.makesDisguise = this.rules.getBool("MakesDisguise");
        this.mindControl = this.rules.getBool("MindControl");
        this.nukeMaker = this.rules.getBool("NukeMaker");
        this.paralyzes = this.rules.getNumber("Paralyzes");
        this.parasite = this.rules.getBool("Parasite");
        this.percentAtMax = this.rules.getNumber("PercentAtMax", 1);
        this.proneDamage = this.rules.getFixed("ProneDamage", 1);
        this.psychicDamage = this.rules.getBool("PsychicDamage");
        this.radiation = this.rules.getBool("Radiation");
        this.rocker = this.rules.getBool("Rocker");
        this.sonic = this.rules.getBool("Sonic");
        this.temporal = this.rules.getBool("Temporal");
        const verses = this.rules.getFixedArray("Verses");
        verses.forEach((value: number, index: number) => this.verses.set(index, value));
        this.wallAbsoluteDestroyer = this.rules.getBool("WallAbsoluteDestroyer");
        this.wall = this.rules.getBool("Wall");
        this.wood = this.rules.getBool("Wood");
    }
}
