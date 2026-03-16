import { SideType } from "../../game/SideType";
export enum EvaPriority {
    Low = 0,
    Normal = 1,
    Important = 2,
    Critical = 3
}
interface EvaSpec {
    text: string;
    sound: string;
    priority: EvaPriority;
    queue: boolean;
}
export class EvaSpecs {
    private sideType: SideType;
    private specs = new Map<string, EvaSpec>();
    constructor(sideType: SideType) {
        this.sideType = sideType;
    }
    readIni(ini: any): EvaSpecs {
        let dialogListSection = ini.getSection("DialogList");
        if (!dialogListSection) {
            throw new Error("Missing eva.ini [DialogList] section");
        }
        const dialogNames = new Set(dialogListSection.entries.values());
        const sidePrefix = this.sideType === SideType.GDI ? "Allied" : "Russian";
        for (let dialogName of dialogNames) {
            if (dialogName) {
                let dialogSection = ini.getSection(dialogName);
                if (dialogSection) {
                    const spec: EvaSpec = {
                        text: dialogSection.getString("Text"),
                        sound: dialogSection.getString(sidePrefix),
                        priority: dialogSection.getEnum("Priority", EvaPriority, EvaPriority.Normal, true),
                        queue: dialogSection.getString("Type").trim().toLowerCase() === "queue",
                    };
                    this.specs.set(dialogName, spec);
                }
                else {
                    console.warn(`Missing eva section [${dialogName}]`);
                }
            }
        }
        return this;
    }
    getSpec(name: string): EvaSpec | undefined {
        return this.specs.get(name);
    }
}
