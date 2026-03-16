export class CrewRules {
  public alliedCrew: string = '';
  private alliedSurvivorDivisor: number = 0;
  private crewEscape: number = 0;
  public sovietCrew: string = '';
  private sovietSurvivorDivisor: number = 0;
  private survivorRate: number = 0;

  readIni(ini: any): CrewRules {
    this.alliedCrew = ini.getString("AlliedCrew");
    this.alliedSurvivorDivisor = ini.getNumber("AlliedSurvivorDivisor");
    this.crewEscape = ini.getNumber("CrewEscape");
    this.sovietCrew = ini.getString("SovietCrew");
    this.sovietSurvivorDivisor = ini.getNumber("SovietSurvivorDivisor");
    this.survivorRate = ini.getNumber("SurvivorRate");
    return this;
  }
}
  
