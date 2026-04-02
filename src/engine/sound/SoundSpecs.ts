import { SoundSpec } from "./SoundSpec";
export enum SoundType {
    Global = 0,
    Normal = 1,
    Screen = 2,
    Local = 3,
    Player = 4,
    Unshroud = 5,
    Shroud = 6
}
export enum SoundPriority {
    Lowest = 0,
    Low = 1,
    Normal = 2,
    High = 3,
    Critical = 4
}
export enum SoundControl {
    All = 0,
    Loop = 1,
    Random = 2,
    Predelay = 3,
    Interrupt = 4,
    Attack = 5,
    Decay = 6,
    Ambient = 7
}
export class SoundSpecs {
    private ini: any;
    private specs: Map<string, SoundSpec>;
    private defaults: any;
    constructor(ini: any) {
        this.ini = ini;
        this.specs = new Map();
        this.parse();
    }
    private parse(): void {
        let defaultsSection = this.ini.getSection("Defaults");
        if (defaultsSection) {
            this.defaults = {
                minVolume: defaultsSection.getNumber("MinVolume"),
                range: defaultsSection.getNumber("Range"),
                volume: defaultsSection.getNumber("Volume"),
                limit: defaultsSection.getNumber("Limit"),
                type: defaultsSection.getEnumArray("Type", SoundType, /\s+/, [], true),
                priority: defaultsSection.getEnum("Priority", SoundPriority, SoundPriority.Normal, true),
            };
            let soundListSection = this.ini.getSection("SoundList");
            if (soundListSection) {
                for (let soundName of new Set(soundListSection.entries.values())) {
                    if (soundName) {
                        let soundSection = this.ini.getSection(soundName);
                        if (soundSection) {
                            this.specs.set(soundName as string, new SoundSpec().read(soundSection, this.defaults));
                        }
                        else {
                            console.warn(`Missing sound section [${soundName}]`);
                        }
                    }
                }
            }
            else {
                console.warn("Missing sound [SoundList] section. Sounds will not be played.");
            }
        }
        else {
            console.warn("Missing sound [Defaults] section. Sounds will not be played.");
        }
    }
    getSpec(name: string): SoundSpec | undefined {
        return this.specs.get(name);
    }
    getAll(): SoundSpec[] {
        return [...this.specs.values()];
    }
}
