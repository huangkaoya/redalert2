import { clamp } from "@/util/math";
import { ObjectRules } from "./ObjectRules";
import { ObjectType } from "@/engine/type/ObjectType";
export class DebrisRules extends ObjectRules {
    private damage: number = 0;
    private damageRadius: number = 0;
    private duration: number = 0;
    private elasticity: number = 0.75;
    private expireAnim?: string;
    private minAngularVelocity: number = 0;
    private maxAngularVelocity: number = 0;
    private maxXYVel: number = 0;
    private minZVel: number = 0;
    private maxZVel: number = 0;
    private shareTurretData: boolean = false;
    private shareBodyData: boolean = false;
    private shareBarrelData: boolean = false;
    private shareSource?: string;
    private trailerAnim?: string;
    private trailerSeparation: number = 0;
    private warhead?: string;
    constructor(type: ObjectType, ini: any, index: number = -1, generalRules?: any) {
        super(type, ini, index, generalRules);
        this.parse();
    }
    protected parse(): void {
        super.parse();
        this.damage = this.ini.getNumber("Damage");
        this.damageRadius = this.ini.getNumber("DamageRadius");
        this.duration = this.ini.getNumber("Duration");
        this.elasticity = clamp(this.ini.getNumber("Elasticity", 0.75), 0, 1);
        this.expireAnim = this.ini.getString("ExpireAnim") || undefined;
        this.minAngularVelocity = this.ini.getNumber("MinAngularVelocity");
        this.maxAngularVelocity = this.ini.getNumber("MaxAngularVelocity");
        this.maxXYVel = this.ini.getNumber("MaxXYVel");
        this.minZVel = this.ini.getNumber("MinZVel");
        this.maxZVel = this.ini.getNumber("MaxZVel");
        this.shareTurretData = this.ini.getBool("ShareTurretData");
        this.shareBodyData = this.ini.getBool("ShareBodyData");
        this.shareBarrelData = this.ini.getBool("ShareBarrelData");
        this.shareSource = this.ini.getString("ShareSource") || undefined;
        this.trailerAnim = this.ini.getString("TrailerAnim") || undefined;
        this.trailerSeparation = this.ini.getNumber("TrailerSeperation");
        this.warhead = this.ini.getString("Warhead") || undefined;
    }
}
