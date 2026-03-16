export class IniSection {
    public entries: Map<string, string | string[]>;
    public sections: Map<string, IniSection>;
    public name: string;
    constructor(name: string) {
        this.entries = new Map();
        this.sections = new Map();
        this.name = name;
    }
    public fromJson(json: Record<string, any>): this {
        for (const key in json) {
            if (json.hasOwnProperty(key)) {
                const value = json[key];
                if (Array.isArray(value) || typeof value !== 'object') {
                    this.set(key, value);
                }
                else {
                    this.sections.set(key, new IniSection(key).fromJson(value));
                }
            }
        }
        return this;
    }
    public clone(): IniSection {
        const newSection = new IniSection(this.name);
        this.entries.forEach((value, key) => {
            newSection.set(key, Array.isArray(value) ? [...value] : value);
        });
        this.sections.forEach((section, key) => {
            newSection.sections.set(key, section.clone());
        });
        return newSection;
    }
    public set(key: string, value: string | string[]): void {
        this.entries.set(key, value);
    }
    public get(key: string): string | string[] | undefined {
        return this.entries.get(key);
    }
    public has(key: string): boolean {
        return this.entries.has(key);
    }
    public getString(key: string, defaultValue: string = ""): string {
        const value = this.get(key);
        return typeof value === 'string' ? value : defaultValue;
    }
    private parseNumber(valueStr: string): number | undefined {
        let num;
        if (valueStr.endsWith('%')) {
            num = Number(valueStr.replace('%', '')) / 100;
        }
        else {
            num = Number(valueStr);
        }
        return isNaN(num) ? undefined : num;
    }
    public getNumber(key: string, defaultValue: number = 0): number {
        const value = this.getString(key);
        if (value === "") {
            return defaultValue;
        }
        const parsedNum = this.parseNumber(value);
        if (parsedNum === undefined) {
            console.warn(`[IniSection: ${this.name}] Invalid value for key "${key}". "${value}" is not a valid number or percentage string.`);
            return defaultValue;
        }
        return parsedNum;
    }
    private toFixedPointPrecision(num: number): number {
        return ((65536 * num) | 0) / 65536;
    }
    public getFixed(key: string, defaultValue: number = 0): number {
        return this.toFixedPointPrecision(this.getNumber(key, defaultValue));
    }
    public getBool(key: string, defaultValue: boolean = false): boolean {
        let valueStr = this.getString(key).trim().toLowerCase();
        if (!valueStr) {
            return defaultValue;
        }
        if (["yes", "1", "true", "on"].includes(valueStr)) {
            return true;
        }
        if (["no", "0", "false", "off"].includes(valueStr)) {
            return false;
        }
        return defaultValue;
    }
    public getKeyArray(key: string, defaultValue: string[] = []): string[] {
        const value = this.get(key);
        return Array.isArray(value) ? value : defaultValue;
    }
    public getArray(key: string, separator: RegExp = /,\s*/, defaultValue: string[] = []): string[] {
        let valueStr = this.getString(key).trim();
        valueStr = valueStr.replace(/,$/, "").replace(/,+/g, ",");
        return valueStr ? valueStr.split(separator) : defaultValue;
    }
    public getNumberArray(key: string, separator: RegExp = /,\s*/, defaultValue: number[] = []): number[] {
        const valueStr = this.getString(key).trim();
        if (!valueStr)
            return defaultValue;
        const parts = valueStr.replace(/,$/, "").replace(/,+/g, ",").split(separator);
        const numbers: number[] = [];
        for (const part of parts) {
            if (!part && parts.length > 1) {
                console.warn(`[IniSection: ${this.name}] Invalid empty value in array for key "${key}". Original string: "${valueStr}"`);
                return defaultValue;
            }
            if (!part && parts.length === 1) {
                return defaultValue;
            }
            const num = this.parseNumber(part);
            if (num === undefined) {
                console.warn(`[IniSection: ${this.name}] Invalid value in array for key "${key}". "${part}" is not a valid number. Original string: "${valueStr}"`);
                return defaultValue;
            }
            numbers.push(num);
        }
        return numbers;
    }
    public getFixedArray(key: string, separator: RegExp = /,\s*/, defaultValue: number[] = []): number[] {
        const numArray = this.getNumberArray(key, separator, defaultValue);
        return numArray.map((n) => this.toFixedPointPrecision(n));
    }
    public getEnum<T extends object>(key: string, enumObject: T, defaultValue: T[keyof T], caseInsensitive: boolean = false): T[keyof T] {
        let valueStr = this.getString(key).trim();
        if (!valueStr)
            return defaultValue;
        let foundValue: T[keyof T] | undefined = undefined;
        if (caseInsensitive) {
            const lowerValueStr = valueStr.toLowerCase();
            for (const enumKey in enumObject) {
                if (enumObject.hasOwnProperty(enumKey) && String(enumKey).toLowerCase() === lowerValueStr) {
                    foundValue = enumObject[enumKey as keyof T];
                    break;
                }
            }
        }
        else {
            if (enumObject.hasOwnProperty(valueStr)) {
                foundValue = enumObject[valueStr as keyof T];
            }
        }
        if (foundValue === undefined) {
            console.warn(`[IniSection: ${this.name}] Invalid value for key "${key}". "${valueStr}" is not an accepted enum value.`);
            return defaultValue;
        }
        return foundValue;
    }
    public getEnumNumeric<T extends object>(key: string, enumObject: T, defaultValue: number): number {
        const valueStr = this.getString(key).trim();
        if (!valueStr)
            return defaultValue;
        if (enumObject.hasOwnProperty(valueStr)) {
            const enumVal = (enumObject as any)[valueStr];
            if (typeof enumVal === 'number') {
                return enumVal;
            }
            const parsedKey = parseInt(valueStr, 10);
            if (Number.isInteger(parsedKey) && String(parsedKey) === valueStr) {
                return parsedKey;
            }
        }
        console.warn(`[IniSection: ${this.name}] Invalid value for key "${key}". "${valueStr}" is not an accepted numeric enum value.`);
        return defaultValue;
    }
    public getEnumArray<T extends object>(key: string, enumObject: T, separator: RegExp = /,\s*/, defaultValue: Array<T[keyof T]> = [], caseInsensitive: boolean = false): Array<T[keyof T]> {
        const valueStr = this.getString(key).trim();
        if (!valueStr)
            return defaultValue;
        const parts = valueStr.replace(/,$/, "").replace(/,+/g, ",").split(separator);
        const results: Array<T[keyof T]> = [];
        for (const part of parts) {
            if (!part && parts.length > 1) {
                console.warn(`[IniSection: ${this.name}] Invalid empty value in enum array for key "${key}". Original string: "${valueStr}"`);
                return defaultValue;
            }
            if (!part && parts.length === 1)
                return defaultValue;
            let found = false;
            let foundValue: T[keyof T] | undefined = undefined;
            if (caseInsensitive) {
                const lowerPart = part.toLowerCase();
                for (const enumKey in enumObject) {
                    if (enumObject.hasOwnProperty(enumKey) && String(enumKey).toLowerCase() === lowerPart) {
                        foundValue = enumObject[enumKey as keyof T];
                        found = true;
                        break;
                    }
                }
            }
            else {
                if (enumObject.hasOwnProperty(part)) {
                    foundValue = enumObject[part as keyof T];
                    found = true;
                }
            }
            if (found && foundValue !== undefined) {
                results.push(foundValue);
            }
            else {
                console.warn(`[IniSection: ${this.name}] Invalid value "${part}" in enum array for key "${key}". Original: "${valueStr}"`);
                return defaultValue;
            }
        }
        return results;
    }
    public getHighestNumericIndex(): number {
        let maxIndex = -1;
        this.entries.forEach((value, key) => {
            const numKey = parseInt(key, 10);
            if (!isNaN(numKey) && String(numKey) === key && numKey > maxIndex) {
                maxIndex = numKey;
            }
        });
        return maxIndex;
    }
    public isNumericIndexArray(): boolean {
        for (const key of this.entries.keys()) {
            if (/^\d+$/.test(key)) {
                return true;
            }
        }
        return false;
    }
    public getConcatenatedValues(): string {
        let result = "";
        for (const value of this.entries.values()) {
            if (typeof value === 'string') {
                result += value;
            }
            else if (Array.isArray(value)) {
                result += value.join('');
            }
        }
        return result;
    }
    public toString(parentPrefix?: string): string {
        const lines: string[] = [];
        const currentPrefix = (parentPrefix ? `${parentPrefix}.` : "") + this.name;
        lines.push(`[${currentPrefix}]`);
        this.entries.forEach((value, key) => {
            if (Array.isArray(value)) {
                value.forEach(v => lines.push(`${key}[]=${v}`));
            }
            else {
                lines.push(`${key}=${value}`);
            }
        });
        lines.push("");
        const sectionStrings: string[] = [];
        this.sections.forEach(section => {
            sectionStrings.push(section.toString(currentPrefix));
        });
        return lines.join("\r\n") + (sectionStrings.length > 0 ? "\r\n" + sectionStrings.join("\r\n") : "");
    }
    public mergeWith(otherSection: IniSection): void {
        if (this.isNumericIndexArray() && otherSection.isNumericIndexArray()) {
            let nextIndex = this.getHighestNumericIndex() + 1;
            otherSection.entries.forEach((value, key) => {
                if (/^\d+$/.test(key) && !Array.isArray(value)) {
                    this.set(String(nextIndex++), value as string);
                }
                else {
                    this.set(key, Array.isArray(value) ? [...value] : value);
                }
            });
        }
        else {
            otherSection.entries.forEach((value, key) => {
                this.set(key, Array.isArray(value) ? [...value] : value);
            });
        }
        otherSection.sections.forEach((sectionToMerge, sectionName) => {
            const existingSection = this.getOrCreateSection(sectionName);
            existingSection.mergeWith(sectionToMerge);
        });
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
        return [...this.sections.values()];
    }
}
