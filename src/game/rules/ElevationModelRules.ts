export class ElevationModelRules {
    private increment: number = 0;
    private incrementBonus: number = 1;
    private bonusCap: number = 0;
    readIni(ini: any): ElevationModelRules {
        this.increment = ini.getNumber("ElevationIncrement");
        this.incrementBonus = ini.getNumber("ElevationIncrementBonus", 1);
        this.bonusCap = ini.getNumber("ElevationBonusCap");
        return this;
    }
    getBonus(elevation: number, targetElevation: number): number {
        if (elevation <= targetElevation) {
            return 0;
        }
        return Math.min(this.bonusCap, Math.floor((elevation - targetElevation) / this.increment)) * this.incrementBonus;
    }
}
