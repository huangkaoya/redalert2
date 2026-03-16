import { ObjectRules } from './ObjectRules';
export class WeaponRules {
    private rules: any;
    public ambientDamage!: number;
    public anim!: string[];
    public areaFire!: boolean;
    public burst!: number;
    public cellRangefinding!: boolean;
    public damage!: number;
    public decloakToFire!: boolean;
    public fireOnce!: boolean;
    public isAlternateColor!: boolean;
    public isElectricBolt!: boolean;
    public isHouseColor!: boolean;
    public isLaser!: boolean;
    public isRadBeam!: boolean;
    public isSonic!: boolean;
    public laserDuration!: number;
    public limboLaunch!: boolean;
    public minimumRange!: number;
    public name!: string;
    public neverUse!: boolean;
    public omniFire!: boolean;
    public projectile!: string;
    public radLevel!: number;
    public range!: number;
    public report!: string[];
    public revealOnFire!: boolean;
    public rof!: number;
    public sabotageCursor!: boolean;
    public spawner!: boolean;
    public iniSpeed!: number;
    public speed!: number;
    public suicide!: boolean;
    public useSparkParticles!: boolean;
    public warhead!: string;
    constructor(rules: any) {
        this.rules = rules;
        this.parse();
    }
    private parse(): void {
        this.ambientDamage = this.rules.getNumber("AmbientDamage");
        this.anim = this.rules.getArray("Anim");
        this.areaFire = this.rules.getBool("AreaFire");
        this.burst = this.rules.getNumber("Burst", 1);
        this.cellRangefinding = this.rules.getBool("CellRangefinding");
        this.damage = this.rules.getNumber("Damage");
        this.decloakToFire = this.rules.getBool("DecloakToFire", true);
        this.fireOnce = this.rules.getBool("FireOnce");
        this.isAlternateColor = this.rules.getBool("IsAlternateColor");
        this.isElectricBolt = this.rules.getBool("IsElectricBolt");
        this.isHouseColor = this.rules.getBool("IsHouseColor");
        this.isLaser = this.rules.getBool("IsLaser");
        this.isRadBeam = this.rules.getBool("IsRadBeam");
        this.isSonic = this.rules.getBool("IsSonic");
        this.laserDuration = this.rules.getNumber("LaserDuration");
        this.limboLaunch = this.rules.getBool("LimboLaunch");
        this.minimumRange = this.rules.getNumber("MinimumRange");
        this.name = this.rules.name;
        this.neverUse = this.rules.getBool("NeverUse");
        this.omniFire = this.rules.getBool("OmniFire");
        this.projectile = this.rules.getString("Projectile");
        this.radLevel = this.rules.getNumber("RadLevel");
        this.range = this.rules.getNumber("Range");
        if (this.range === -2) {
            this.range = Number.POSITIVE_INFINITY;
        }
        this.report = this.rules.getArray("Report");
        this.revealOnFire = this.rules.getBool("RevealOnFire", true);
        this.rof = this.rules.getNumber("ROF");
        this.sabotageCursor = this.rules.getBool("SabotageCursor");
        this.spawner = this.rules.getBool("Spawner");
        const speed = this.rules.getNumber("Speed");
        this.iniSpeed = speed;
        this.speed = ObjectRules.iniSpeedToLeptonsPerTick(speed, 100);
        this.suicide = this.rules.getBool("Suicide");
        this.useSparkParticles = this.rules.getBool("UseSparkParticles");
        this.warhead = this.rules.getString("Warhead");
    }
}
