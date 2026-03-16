import { IniSection } from './IniSection';
export class IniParser {
    private readonly lineRegex = /^\s*\[([^\]]+)\]\s*$|^\s*([^;=#][^=]*?)\s*(?:=\s*(.*)?)?\s*$/;
    private readonly commentRegex = /^\s*[;#]/;
    private readonly arrayKeyRegex = /^(.*)\[\]$/;
    public parse(iniString: string): Record<string, IniSection> {
        const sections: Record<string, IniSection> = {};
        let currentSectionName: string = "__ROOT__";
        sections[currentSectionName] = new IniSection(currentSectionName);
        let currentSectionObj: IniSection = sections[currentSectionName];
        const lines = iniString.split(/[\r\n]+/g);
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || this.commentRegex.test(trimmedLine)) {
                continue;
            }
            let processedLine = trimmedLine;
            if (processedLine.startsWith('[')) {
                processedLine = processedLine.replace(/]\s*(\/\/|;|#).*$/, ']');
            }
            const match = processedLine.match(this.lineRegex);
            if (match) {
                if (match[1] !== undefined) {
                    currentSectionName = this.stripQuotesAndComments(match[1]);
                    if (!sections[currentSectionName]) {
                        sections[currentSectionName] = new IniSection(currentSectionName);
                    }
                    currentSectionObj = sections[currentSectionName];
                }
                else if (match[2] !== undefined) {
                    let key = this.stripQuotesAndComments(match[2]);
                    let value = match[3] !== undefined ? this.stripQuotesAndComments(match[3]) : "";
                    const arrayKeyMatch = key.match(this.arrayKeyRegex);
                    if (arrayKeyMatch) {
                        key = arrayKeyMatch[1];
                        const existingEntry = currentSectionObj.get(key);
                        if (Array.isArray(existingEntry)) {
                            existingEntry.push(value);
                        }
                        else if (existingEntry !== undefined) {
                            currentSectionObj.set(key, [existingEntry, value]);
                        }
                        else {
                            currentSectionObj.set(key, [value]);
                        }
                    }
                    else {
                        currentSectionObj.set(key, value);
                    }
                }
            }
            else {
            }
        }
        return sections;
    }
    private stripQuotesAndComments(str: string): string {
        let currentStr = str.trim();
        if ((currentStr.startsWith('"') && currentStr.endsWith('"')) ||
            (currentStr.startsWith('\'') && currentStr.endsWith('\''))) {
            currentStr = currentStr.substring(1, currentStr.length - 1);
        }
        const commentMatch = currentStr.match(/^([^;#]*)(?:[;#]|$)/);
        if (commentMatch && commentMatch[1] !== undefined) {
            currentStr = commentMatch[1].trim();
        }
        return currentStr;
    }
}
