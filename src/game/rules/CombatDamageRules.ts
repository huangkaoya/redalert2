export class CombatDamageRules {
    private ballisticScatter: number = 0;
    private bridgeStrength: number = 0;
    private c4Delay: number = 0;
    private c4Warhead: string = '';
    private deathWeapon: string = '';
    private dMislEliteWarhead: string = '';
    private dMislWarhead: string = '';
    private flameDamage: string = '';
    private ironCurtainDuration: number = 0;
    private ivanDamage: number = 0;
    private ivanIconFlickerRate: number = 0;
    private ivanTimedDelay: number = 0;
    private ivanWarhead: string = '';
    private splashList: string[] = [];
    private v3EliteWarhead: string = '';
    private v3Warhead: string = '';
    readIni(ini: any): CombatDamageRules {
        this.ballisticScatter = ini.getNumber("BallisticScatter");
        this.bridgeStrength = ini.getNumber("BridgeStrength");
        this.c4Delay = ini.getNumber("C4Delay");
        this.c4Warhead = ini.getString("C4Warhead");
        this.deathWeapon = ini.getString("DeathWeapon");
        this.dMislEliteWarhead = ini.getString("DMislEliteWarhead");
        this.dMislWarhead = ini.getString("DMislWarhead");
        this.flameDamage = ini.getString("FlameDamage");
        this.ironCurtainDuration = ini.getNumber("IronCurtainDuration");
        this.ivanDamage = ini.getNumber("IvanDamage");
        this.ivanIconFlickerRate = ini.getNumber("IvanIconFlickerRate");
        this.ivanTimedDelay = ini.getNumber("IvanTimedDelay");
        this.ivanWarhead = ini.getString("IvanWarhead");
        this.splashList = ini.getArray("SplashList");
        this.v3EliteWarhead = ini.getString("V3EliteWarhead");
        this.v3Warhead = ini.getString("V3Warhead");
        return this;
    }
}
