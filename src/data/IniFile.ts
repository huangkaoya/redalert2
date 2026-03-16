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
    } else if (typeof source === 'string') {
      this.fromString(source);
    } else if (typeof source === 'object' && source !== null) {
      // Assuming if it's an object, it's the parsed structure from IniParser
      // or a similar JSON-like structure for sections.
      this.fromJson(source);
    } else if (source === undefined) {
      // Allows creating an empty IniFile
    } else {
      console.warn("IniFile: Constructor called with unknown source type.");
    }
  }

  public fromVirtualFile(virtualFile: VirtualFile): this {
    // Assuming readAsString defaults to utf-8 or an appropriate encoding for INI files
    return this.fromString(virtualFile.readAsString());
  }

  public fromString(iniString: string): this {
    const parser = new IniParser();
    const parsedSectionsObject = parser.parse(iniString);
    return this.fromJson(parsedSectionsObject);
  }

  public fromJson(sectionsObject: Record<string, any>): this {
    this.sections.clear(); // Clear existing sections before loading from new JSON
    for (const sectionName in sectionsObject) {
      if (sectionsObject.hasOwnProperty(sectionName)) {
        // The value from IniParser is already an IniSection instance for top-level keys if parsed correctly.
        // However, the original IniFile.fromJson took a raw object and created IniSection from that.
        // Let's align with IniSection.fromJson if the input is a raw object representation.
        const sectionData = sectionsObject[sectionName];
        if (sectionData instanceof IniSection) { // If IniParser already returned IniSection objects
            this.sections.set(sectionName, sectionData); 
        } else if (typeof sectionData === 'object' && sectionData !== null) { // If it's a plain object for a section
            const newSection = new IniSection(sectionName);
            newSection.fromJson(sectionData); // IniSection.fromJson populates its entries and sub-sections
            this.sections.set(sectionName, newSection);
        } else {
            console.warn(`IniFile.fromJson: Section data for "${sectionName}" is not a valid object or IniSection instance.`);
        }
      }
    }
    return this;
  }

  public toString(): string {
    const sectionStrings: string[] = [];
    // Iterate in insertion order (if Map guarantees it, which it does)
    this.sections.forEach(section => {
      sectionStrings.push(section.toString());
    });
    return sectionStrings.join("\r\n"); // Original used \r\n between sections
  }

  public clone(): IniFile {
    const newIniFile = new IniFile(); // Create an empty IniFile
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
