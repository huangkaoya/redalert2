import { SequenceType } from './SequenceType';
import { IniSection } from '@/data/IniSection';
const FACING_MAP = new Map([
    ['E', 5],
    ['S', 3],
    ['W', 1],
    ['N', 7]
]);
export class SequenceReader {
    readIni(section: IniSection | Map<string, string>): Map<SequenceType, any> {
        const entries: Map<string, string> = section instanceof IniSection ? (section.entries as Map<string, string>) : section;
        const sequences = new Map<SequenceType, any>();
        for (const [key, value] of entries) {
            const type = SequenceType[key];
            if (type !== undefined && typeof value === 'string') {
                const parts = value.split(',');
                const sequence = {
                    type,
                    startFrame: Number(parts[0]),
                    frameCount: Number(parts[1]),
                    facingMult: Number(parts[2]),
                    onlyFacing: parts[3] ? FACING_MAP.get(parts[3]) : undefined
                };
                sequences.set(type, sequence);
            }
        }
        return sequences;
    }
}
