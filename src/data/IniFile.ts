import { IniSection } from './IniSection';
import { IniParser } from './IniParser';
import { VirtualFile } from './vfs/VirtualFile';
export { IniSection } from './IniSection';
export class IniFile {
    public sections: Map<string, IniSection>;
    constructor(source?: VirtualFile | Record<string, any> | string) {
        this.sections = new Map();
        if (source instanceof VirtualFile) {
            this.fromVirtualFile(source);
        }
        else if (typeof source === 'string') {
            this.fromString(source);
        }
        else if (typeof source === 'object' && source !== null) {
            this.fromJson(source);
        }
        else if (source === undefined) {
        }
        else {
            console.warn("IniFile: Constructor called with unknown source type.");
        }
    }
    public fromVirtualFile(virtualFile: VirtualFile): this {
        return this.fromString(virtualFile.readAsString());
    }
    public fromString(iniString: string): this {
        const parser = new IniParser();
        const parsedSectionsObject = parser.parse(iniString);
        return this.fromJson(parsedSectionsObject);
    }
    public fromJson(sectionsObject: Record<string, any>): this {
        this.sections.clear();
        for (const sectionName in sectionsObject) {
            if (sectionsObject.hasOwnProperty(sectionName)) {
                const sectionData = sectionsObject[sectionName];
                if (sectionData instanceof IniSection) {
                    this.sections.set(sectionName, sectionData);
                }
                else if (typeof sectionData === 'object' && sectionData !== null) {
                    const newSection = new IniSection(sectionName);
                    newSection.fromJson(sectionData);
                    this.sections.set(sectionName, newSection);
                }
                else {
                    console.warn(`IniFile.fromJson: Section data for "${sectionName}" is not a valid object or IniSection instance.`);
                }
            }
        }
        return this;
    }
    public toString(): string {
        const sectionStrings: string[] = [];
        this.sections.forEach(section => {
            sectionStrings.push(section.toString());
        });
        return sectionStrings.join("\r\n");
    }
    public clone(): IniFile {
        const newIniFile = new IniFile();
        this.sections.forEach((section, sectionName) => {
            newIniFile.sections.set(sectionName, section.clone());
        });
        return newIniFile;
    }
    public getOrCreateSection(sectionName: string): IniSection {
        let section = this.sections.get(sectionName);
        if (!section) {
            section = new IniSection(sectionName);
            this.sections.set(sectionName, section);
        }
        return section;
    }
    public getSection(sectionName: string): IniSection | undefined {
        return this.sections.get(sectionName);
    }
    public getOrderedSections(): IniSection[] {
        return Array.from(this.sections.values());
    }
    public mergeWith(otherIniFile: IniFile): this {
        otherIniFile.sections.forEach((otherSection, sectionName) => {
            const localSection = this.getOrCreateSection(sectionName);
            localSection.mergeWith(otherSection);
        });
        return this;
    }
}
