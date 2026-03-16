export class LightningStormRules {
    private deferment: number = 0;
    private damage: number = 0;
    private duration: number = 0;
    private warhead: string = '';
    private hitDelay: number = 0;
    private scatterDelay: number = 0;
    private cellSpread: number = 0;
    private separation: number = 0;
    readIni(ini: any): LightningStormRules {
        this.deferment = ini.getNumber("LightningDeferment");
        this.damage = ini.getNumber("LightningDamage");
        this.duration = ini.getNumber("LightningStormDuration");
        this.warhead = ini.getString("LightningWarhead");
        this.hitDelay = ini.getNumber("LightningHitDelay");
        this.scatterDelay = ini.getNumber("LightningScatterDelay");
        this.cellSpread = ini.getNumber("LightningCellSpread");
        this.separation = ini.getNumber("LightningSeparation");
        return this;
    }
}
