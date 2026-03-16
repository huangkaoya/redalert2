import { MissileRules } from './MissileRules';
export class DMislRules extends MissileRules {
    private pauseFrames: number = 0;
    private tiltFrames: number = 0;
    private pitchInitial: number = 0;
    private pitchFinal: number = 0;
    private turnRate: number = 0;
    private acceleration: number = 0;
    private altitude: number = 0;
    private damage: number = 0;
    private eliteDamage: number = 0;
    private bodyLength: number = 0;
    private lazyCurve: boolean = false;
    public type: string = '';
    readIni(ini: any): DMislRules {
        this.pauseFrames = ini.getNumber("DMislPauseFrames");
        this.tiltFrames = ini.getNumber("DMislTiltFrames");
        this.pitchInitial = ini.getNumber("DMislPitchInitial");
        this.pitchFinal = ini.getNumber("DMislPitchFinal");
        this.turnRate = ini.getNumber("DMislTurnRate");
        this.acceleration = ini.getNumber("DMislAcceleration");
        this.altitude = ini.getNumber("DMislAltitude");
        this.damage = ini.getNumber("DMislDamage");
        this.eliteDamage = ini.getNumber("DMislEliteDamage");
        this.bodyLength = ini.getNumber("DMislBodyLength");
        this.lazyCurve = ini.getBool("DMislLazyCurve");
        this.type = ini.getString("DMislType");
        return this;
    }
}
