export class CrateRules {
  private crateMaximum: number = 0;
  private crateMinimum: number = 0;
  private crateRadius: number = 0;
  private crateRegen: number = 0;
  private unitCrateType?: string;
  private healCrateSound: string = '';
  public crateImg: string = '';
  public waterCrateImg: string = '';
  private freeMCV: boolean = false;

  readIni(ini: any): CrateRules {
    this.crateMaximum = ini.getNumber("CrateMaximum");
    this.crateMinimum = ini.getNumber("CrateMinimum");
    this.crateRadius = ini.getNumber("CrateRadius");
    this.crateRegen = ini.getNumber("CrateRegen");

    const unitCrateType = ini.getString("UnitCrateType");
    this.unitCrateType = unitCrateType.toLowerCase() !== "none" ? unitCrateType : undefined;
    
    this.healCrateSound = ini.getString("HealCrateSound");
    this.crateImg = ini.getString("CrateImg");
    this.waterCrateImg = ini.getString("WaterCrateImg");
    this.freeMCV = ini.getBool("FreeMCV");

    return this;
  }
}
