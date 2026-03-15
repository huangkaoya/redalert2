import { ObjectRules } from './ObjectRules';
import { ObjectType } from '@/engine/type/ObjectType';

export class ProjectileRules extends ObjectRules {
  public acceleration!: number;
  public arcing!: boolean;
  public courseLockDuration!: number;
  public detonationAltitude!: number;
  public firersPalette!: boolean;
  public flakScatter!: boolean;
  public inaccurate!: boolean;
  public inviso!: boolean;
  public isAntiAir!: boolean;
  public isAntiGround!: boolean;
  public level!: boolean;
  public rot!: number;
  public iniRot!: number;
  public shadow!: boolean;
  public shrapnelWeapon?: string;
  public shrapnelCount!: number;
  public subjectToCliffs!: boolean;
  public subjectToElevation!: boolean;
  public subjectToWalls!: boolean;
  public vertical!: boolean;

  constructor(type: ObjectType, ini: any, index: number = -1, generalRules?: any) {
    super(type, ini, index, generalRules);
    this.parse();
  }

  protected parse(): void {
    super.parse();
    
    const rot = this.ini.getNumber("ROT", 0);
    let acceleration = this.ini.getNumber("Acceleration");
    
    if (rot === 1 && !acceleration) {
      acceleration = Number.POSITIVE_INFINITY;
    }
    acceleration = acceleration || 3;
    
    this.acceleration = acceleration;
    this.arcing = this.ini.getBool("Arcing");
    this.courseLockDuration = this.ini.getNumber("CourseLockDuration");
    this.detonationAltitude = this.ini.getNumber("DetonationAltitude");
    this.firersPalette = this.ini.getBool("FirersPalette");
    this.flakScatter = this.ini.getBool("FlakScatter");
    this.inaccurate = this.ini.getBool("Inaccurate");
    this.inviso = this.ini.getBool("Inviso");
    this.isAntiAir = this.ini.getBool("AA");
    this.isAntiGround = this.ini.getBool("AG", true);
    this.level = this.ini.getBool("Level");
    this.rot = ObjectRules.iniRotToDegsPerTick(rot);
    this.iniRot = rot;
    this.shadow = this.ini.getBool("Shadow", true);
    this.shrapnelWeapon = this.ini.getString("ShrapnelWeapon") || undefined;
    this.shrapnelCount = this.ini.getNumber("ShrapnelCount");
    this.subjectToCliffs = this.ini.getBool("SubjectToCliffs");
    this.subjectToElevation = this.ini.getBool("SubjectToElevation");
    this.subjectToWalls = this.ini.getBool("SubjectToWalls");
    this.vertical = this.ini.getBool("Vertical");
  }
}
