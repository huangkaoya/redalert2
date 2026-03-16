import { IniSection } from '@/data/IniSection';
export class CellTagsReader {
    read(section: IniSection, version: number): Array<{
        tagId: number;
        coords: {
            x: number;
            y: number;
        };
    }> {
        const result: Array<{
            tagId: number;
            coords: {
                x: number;
                y: number;
            };
        }> = [];
        for (const [key, rawValue] of section.entries) {
            const tagId = typeof rawValue === 'string' ? Number(rawValue) : Number(rawValue as any);
            const coords = this.readCoords(Number(key), version);
            result.push({ tagId, coords });
        }
        return result;
    }
    readCoords(key: number, version: number): {
        x: number;
        y: number;
    } {
        const divisor = version < 4 ? 128 : 1000;
        return {
            x: key % divisor,
            y: Math.floor(key / divisor)
        };
    }
}
