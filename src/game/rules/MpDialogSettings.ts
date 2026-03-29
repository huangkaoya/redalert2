import type { IniSection } from '../../data/IniSection';
export class MpDialogSettings {
    public minMoney?: number;
    public money?: number;
    public maxMoney?: number;
    public moneyIncrement?: number;
    public minUnitCount?: number;
    public unitCount?: number;
    public maxUnitCount?: number;
    public crates?: boolean;
    public gameSpeed?: number;
    public mcvRedeploys?: boolean;
    public shortGame?: boolean;
    public superWeapons?: boolean;
    public techLevel?: number;
    public alliesAllowed?: boolean;
    public allyChangeAllowed?: boolean;
    public mustAlly?: boolean;
    public bridgeDestruction?: boolean;
    public multiEngineer?: boolean;
    private readOptionalNumber(section: IniSection, key: string): number | undefined {
        return section.has(key) ? section.getNumber(key) : undefined;
    }
    private readOptionalBool(section: IniSection, key: string, invalidDefault: boolean = false): boolean | undefined {
        return section.has(key) ? section.getBool(key, invalidDefault) : undefined;
    }
    readIni(section: IniSection): this {
        this.minMoney = this.readOptionalNumber(section, "MinMoney");
        this.money = this.readOptionalNumber(section, "Money");
        this.maxMoney = this.readOptionalNumber(section, "MaxMoney");
        this.moneyIncrement = this.readOptionalNumber(section, "MoneyIncrement");
        this.minUnitCount = this.readOptionalNumber(section, "MinUnitCount");
        this.unitCount = this.readOptionalNumber(section, "UnitCount");
        this.maxUnitCount = this.readOptionalNumber(section, "MaxUnitCount");
        this.crates = this.readOptionalBool(section, "Crates");
        this.gameSpeed = this.readOptionalNumber(section, "GameSpeed");
        this.mcvRedeploys = this.readOptionalBool(section, "MCVRedeploys");
        this.shortGame = this.readOptionalBool(section, "ShortGame");
        this.superWeapons = this.readOptionalBool(section, "SuperWeapons");
        this.techLevel = this.readOptionalNumber(section, "TechLevel");
        this.alliesAllowed = this.readOptionalBool(section, "AlliesAllowed", true);
        this.allyChangeAllowed = this.readOptionalBool(section, "AllyChangeAllowed", true);
        this.mustAlly = this.readOptionalBool(section, "MustAlly");
        this.bridgeDestruction = this.readOptionalBool(section, "BridgeDestruction", true);
        this.multiEngineer = this.readOptionalBool(section, "MultiEngineer");
        return this;
    }
}
