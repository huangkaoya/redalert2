import { SoundControl, SoundPriority, SoundType } from "./SoundSpecs";
interface MinMaxPair {
    min: number;
    max: number;
}
interface SoundDefaults {
    minVolume: number;
    range: number;
    volume: number;
    limit: number;
    type: SoundType[];
    priority: SoundPriority;
}
export class SoundSpec {
    name!: string;
    control!: Set<SoundControl>;
    sounds!: string[];
    volume!: number;
    delay?: MinMaxPair;
    priority!: SoundPriority;
    type!: SoundType[];
    fShift?: MinMaxPair;
    limit!: number;
    loop?: number;
    range!: number;
    minVolume!: number;
    vShift?: MinMaxPair;
    attack?: number;
    decay?: number;
    read(section: any, defaults: SoundDefaults): SoundSpec {
        let range = section.getNumber("Range", defaults.range);
        if (range === -2) {
            range = Number.POSITIVE_INFINITY;
        }
        this.name = section.name;
        this.control = new Set(section.getEnumArray("Control", SoundControl, /\s+/, [], true));
        this.sounds = section
            .getArray("Sounds", /\s+/)
            .map((sound: string) => sound.replace(/^\$/, ""));
        this.volume = section.has("Volume")
            ? section.getNumber("Volume", defaults.volume)
            : section.getNumber("volume", defaults.volume);
        this.delay = this.createMinMaxPair(section.getNumberArray("Delay", /\s+/, []));
        this.priority = section.getEnum("Priority", SoundPriority, defaults.priority, true);
        this.type = section.getEnumArray("Type", SoundType, /\s+/, defaults.type, true);
        if (!this.type.some((type) => [SoundType.Screen, SoundType.Local, SoundType.Global].includes(type))) {
            const fallbackType = defaults.type.find((type) => [SoundType.Screen, SoundType.Local, SoundType.Global].includes(type));
            if (fallbackType) {
                this.type.push(fallbackType);
            }
        }
        this.fShift = this.createMinMaxPair(section.getNumberArray("FShift", /\s+/, []));
        this.limit = section.getNumber("Limit", defaults.limit);
        this.loop = section.getNumber("Loop");
        this.range = range;
        this.minVolume = section.getNumber("MinVolume", defaults.minVolume);
        this.vShift = this.createMinMaxPair(section.getNumberArray(section.has("Vshift") ? "Vshift" : "VShift", /\s+/, []));
        this.attack = section.getNumber("Attack");
        this.decay = section.getNumber("Decay");
        return this;
    }
    private createMinMaxPair(values: number[]): MinMaxPair | undefined {
        if (values.length) {
            let [min, max] = values;
            if (max === undefined) {
                max = min;
            }
            return { min, max };
        }
    }
}
