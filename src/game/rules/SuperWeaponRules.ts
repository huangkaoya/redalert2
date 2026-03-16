import { SuperWeaponType } from '../type/SuperWeaponType';
export class SuperWeaponRules {
    public index: number;
    public disableableFromShell: boolean;
    public isPowered: boolean;
    public name: string;
    public preClick: boolean;
    public preDependent?: SuperWeaponType;
    public postClick: boolean;
    public rechargeTime: number;
    public showTimer: boolean;
    public sidebarImage: string;
    public type?: SuperWeaponType;
    public uiName: string;
    public weaponType?: string;
    constructor(index: number) {
        this.index = index;
    }
    readIni(ini: any): this {
        this.disableableFromShell = ini.getBool("DisableableFromShell");
        this.isPowered = ini.getBool("IsPowered", true);
        this.name = ini.name;
        this.preClick = ini.getBool("PreClick");
        this.preDependent = ini.getEnum("PreDependent", SuperWeaponType, undefined);
        this.postClick = ini.getBool("PostClick");
        this.rechargeTime = ini.getNumber("RechargeTime", 5);
        this.showTimer = ini.getBool("ShowTimer");
        this.sidebarImage = ini.getString("SidebarImage").toLowerCase();
        this.type = ini.getEnum("Type", SuperWeaponType, undefined);
        this.uiName = ini.getString("UIName");
        this.weaponType = ini.getString("WeaponType") || undefined;
        return this;
    }
}
