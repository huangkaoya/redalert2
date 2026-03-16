export class PrismRules {
    private type: string = '';
    private supportHeight: number = 0;
    private supportMax: number = 0;
    private supportModifier: number = 1;
    readIni(ini: any): PrismRules {
        this.type = ini.getString("PrismType");
        this.supportHeight = ini.getNumber("PrismSupportHeight");
        this.supportMax = ini.getNumber("PrismSupportMax");
        this.supportModifier = ini.getNumber("PrismSupportModifier", 1);
        return this;
    }
}
