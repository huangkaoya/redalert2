export class VeteranRules {
    public veteranRatio: number = 3;
    private veteranCombat: number = 1;
    private veteranSpeed: number = 1;
    private veteranSight: number = 1;
    private veteranArmor: number = 1;
    private veteranROF: number = 1;
    private veteranCap: number = 2;
    public initialVeteran: boolean = false;
    readIni(ini: any): VeteranRules {
        this.veteranRatio = ini.getNumber("VeteranRatio", 3);
        this.veteranCombat = ini.getNumber("VeteranCombat", 1);
        this.veteranSpeed = ini.getNumber("VeteranSpeed", 1);
        this.veteranSight = Math.max(1, ini.getNumber("VeteranSight", 1));
        this.veteranArmor = ini.getNumber("VeteranArmor", 1);
        this.veteranROF = ini.getNumber("VeteranROF", 1);
        this.veteranCap = ini.getNumber("VeteranCap", 2);
        this.initialVeteran = ini.getBool("InitialVeteran");
        return this;
    }
}
