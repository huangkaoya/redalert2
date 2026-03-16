export class ThreatRules {
    private myEffectivenessCoefficientDefault: number = 0;
    private targetEffectivenessCoefficientDefault: number = 0;
    private targetSpecialThreatCoefficientDefault: number = 0;
    private targetStrengthCoefficientDefault: number = 0;
    private targetDistanceCoefficientDefault: number = 0;
    readIni(ini: any): ThreatRules {
        this.myEffectivenessCoefficientDefault = ini.getNumber("MyEffectivenessCoefficientDefault");
        this.targetEffectivenessCoefficientDefault = ini.getNumber("TargetEffectivenessCoefficientDefault");
        this.targetSpecialThreatCoefficientDefault = ini.getNumber("TargetSpecialThreatCoefficientDefault");
        this.targetStrengthCoefficientDefault = ini.getNumber("TargetStrengthCoefficientDefault");
        this.targetDistanceCoefficientDefault = ini.getNumber("TargetDistanceCoefficientDefault");
        return this;
    }
}
