import { binaryStringToUint8Array } from '../util/string';
import { Crc32 } from './Crc32';
export class MixEntry {
    public static readonly size: number = 12;
    public readonly hash: number;
    public readonly offset: number;
    public readonly length: number;
    constructor(hash: number, offset: number, length: number) {
        this.hash = hash;
        this.offset = offset;
        this.length = length;
    }
    public static hashFilename(filename: string, debugLog: boolean = false): number {
        let processedName = filename.toUpperCase();
        const originalLength = processedName.length;
        const R = originalLength >> 2;
        if (debugLog)
            console.log(`[hashFilename] Original: "${filename}", Uppercased: "${processedName}", Length: ${originalLength}`);
        if ((originalLength & 3) !== 0) {
            const appendCharCode = originalLength - (R << 2);
            processedName += String.fromCharCode(appendCharCode);
            if (debugLog)
                console.log(`[hashFilename] Appended char code: ${appendCharCode}, Name after append: "${processedName}"`);
            let numPaddingChars = 3 - (originalLength & 3);
            const paddingCharSourceIndex = R << 2;
            const charToPadCode = processedName.charCodeAt(paddingCharSourceIndex < processedName.length ? paddingCharSourceIndex : 0);
            const charToPad = String.fromCharCode(charToPadCode);
            if (debugLog)
                console.log(`[hashFilename] numPaddingChars: ${numPaddingChars}, paddingCharSourceIndex: ${paddingCharSourceIndex}, charToPad: "${charToPad}" (code ${charToPadCode})`);
            for (let i = 0; i < numPaddingChars; i++) {
                processedName += charToPad;
            }
            if (debugLog)
                console.log(`[hashFilename] Name after padding: "${processedName}", Final Length: ${processedName.length}`);
        }
        const nameBytes = binaryStringToUint8Array(processedName);
        if (debugLog)
            console.log(`[hashFilename] nameBytes for CRC:`, nameBytes);
        const crc = Crc32.calculateCrc(nameBytes);
        if (debugLog)
            console.log(`[hashFilename] Calculated CRC: ${crc} (0x${crc.toString(16).toUpperCase()})`);
        return crc;
    }
}
