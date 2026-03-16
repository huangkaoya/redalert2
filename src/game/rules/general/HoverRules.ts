export class HoverRules {
    private height: number = 0;
    private dampen: number = 0;
    private bob: number = 0;
    private boost: number = 0;
    private acceleration: number = 0;
    private brake: number = 0;
    readIni(ini: any): HoverRules {
        this.height = ini.getNumber("HoverHeight");
        this.dampen = ini.getNumber("HoverDampen");
        this.bob = ini.getNumber("HoverBob");
        this.boost = ini.getNumber("HoverBoost");
        this.acceleration = ini.getNumber("HoverAcceleration");
        this.brake = ini.getNumber("HoverBrake");
        return this;
    }
}
