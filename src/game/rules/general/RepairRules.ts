export class RepairRules {
    private reloadRate: number = 0;
    private repairPercent: number = 0;
    private repairRate: number = 0;
    private repairStep: number = 0;
    private uRepairRate: number = 0;
    private iRepairRate: number = 0;
    private iRepairStep: number = 0;
    readIni(ini: any): RepairRules {
        this.reloadRate = ini.getNumber("ReloadRate");
        this.repairPercent = ini.getNumber("RepairPercent");
        this.repairRate = ini.getNumber("RepairRate");
        this.repairStep = ini.getNumber("RepairStep");
        this.uRepairRate = ini.getNumber("URepairRate");
        this.iRepairRate = ini.getNumber("IRepairRate");
        this.iRepairStep = ini.getNumber("IRepairStep");
        return this;
    }
}
