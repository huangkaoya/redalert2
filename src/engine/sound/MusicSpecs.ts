interface MusicSpec {
    name: string;
    sound: string;
    normal: boolean;
    repeat: boolean;
}
export class MusicSpecs {
    private ini: any;
    private specs = new Map<string, MusicSpec>();
    constructor(ini: any) {
        this.ini = ini;
        this.parse();
    }
    private parse(): void {
        let themesSection = this.ini.getSection("Themes");
        if (themesSection) {
            for (const themeName of themesSection.entries.values()) {
                if (themeName) {
                    let themeSection = this.ini.getSection(themeName);
                    if (themeSection) {
                        const spec: MusicSpec = {
                            name: themeSection.getString("Name"),
                            sound: themeSection.getString("Sound"),
                            normal: themeSection.getBool("Normal", true),
                            repeat: themeSection.getBool("Repeat"),
                        };
                        this.specs.set(themeName, spec);
                    }
                    else {
                        console.warn(`Music section [${themeName}] not found. Skipping.`);
                    }
                }
            }
        }
        else {
            console.warn("[Themes] section missing. Music will not be played.");
        }
    }
    getSpec(name: string): MusicSpec | undefined {
        return this.specs.get(name);
    }
    getAll(): MusicSpec[] {
        return [...this.specs.values()];
    }
}
