export class RadiationRules {
    public radDurationMultiple!: number;
    public radApplicationDelay!: number;
    public radLevelMax!: number;
    public radLevelDelay!: number;
    public radLightDelay!: number;
    public radLevelFactor!: number;
    public radLightFactor!: number;
    public radTintFactor!: number;
    public radColor!: number[];
    public radSiteWarhead!: string;
    readIni(ini: any): this {
        this.radDurationMultiple = ini.getNumber("RadDurationMultiple");
        this.radApplicationDelay = ini.getNumber("RadApplicationDelay");
        this.radLevelMax = ini.getNumber("RadLevelMax");
        this.radLevelDelay = ini.getNumber("RadLevelDelay");
        this.radLightDelay = ini.getNumber("RadLightDelay");
        this.radLevelFactor = ini.getNumber("RadLevelFactor");
        this.radLightFactor = ini.getNumber("RadLightFactor");
        this.radTintFactor = ini.getNumber("RadTintFactor");
        this.radColor = ini.getNumberArray("RadColor");
        this.radSiteWarhead = ini.getString("RadSiteWarhead");
        return this;
    }
}
