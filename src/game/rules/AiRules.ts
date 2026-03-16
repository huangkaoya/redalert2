export class AiRules {
    private buildPower: string[] = [];
    private buildRefinery: string[] = [];
    private buildTech: string[] = [];
    private tiberiumFarScan: number = 50;
    private tiberiumNearScan: number = 5;
    readIni(ini: any): AiRules {
        this.buildPower = ini.getArray("BuildPower");
        this.buildRefinery = ini.getArray("BuildRefinery");
        this.buildTech = ini.getArray("BuildTech");
        this.tiberiumFarScan = ini.getNumber("TiberiumFarScan", 50);
        this.tiberiumNearScan = ini.getNumber("TiberiumNearScan", 5);
        return this;
    }
}
