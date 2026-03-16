import { MissileRules } from './MissileRules';
export class V3RocketRules extends MissileRules {
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
    readIni(ini: any): V3RocketRules {
        this.pauseFrames = ini.getNumber("V3RocketPauseFrames");
        this.tiltFrames = ini.getNumber("V3RocketTiltFrames");
        this.pitchInitial = ini.getNumber("V3RocketPitchInitial");
        this.pitchFinal = ini.getNumber("V3RocketPitchFinal");
        this.turnRate = ini.getNumber("V3RocketTurnRate");
        this.acceleration = ini.getNumber("V3RocketAcceleration");
        this.altitude = ini.getNumber("V3RocketAltitude");
        this.damage = ini.getNumber("V3RocketDamage");
        this.eliteDamage = ini.getNumber("V3RocketEliteDamage");
        this.bodyLength = ini.getNumber("V3RocketBodyLength");
        this.lazyCurve = ini.getBool("V3RocketLazyCurve");
        this.type = ini.getString("V3RocketType");
        return this;
    }
}
