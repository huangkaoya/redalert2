export class MapNameLegacyEncoder {
    encode(mapName: string): string {
        const bytes: number[] = [];
        let extraIndex = 0;
        mapName.split('').forEach((char, index) => {
            const code = char.charCodeAt(0) << (2 * index - 7 * extraIndex);
            const byte1 = code & 127;
            const byte2 = (code >> 7) & 127;
            const byte3 = (code >> 14) & 127;
            if (byte3) {
                extraIndex++;
            }
            bytes.push(byte1, byte2);
            if (byte3) {
                bytes.push(byte3);
            }
        });
        bytes.push(0, 0);
        if (mapName.length >= 2) {
            bytes.push(0);
        }
        const xorBytes = bytes.map(byte => byte ^ 128);
        return xorBytes.map(byte => String.fromCharCode(byte)).join('');
    }
    decode(encodedMapName: string): string {
        let bytes = encodedMapName.split('').map(char => char.charCodeAt(0));
        bytes = bytes.map(byte => byte ^ 128);
        while (bytes.length > 0 && bytes[bytes.length - 1] === 0) {
            bytes.pop();
        }
        const result: number[] = [];
        let extraCount = 0;
        let charIndex = 0;
        while (bytes.length > 0) {
            const currentPos = result.length;
            const byte1 = bytes.shift()!;
            const byte2 = bytes.shift()!;
            let byte3 = 0;
            let hasExtra = false;
            if ((bytes.length > 0 && [1, 2, 3].includes(bytes[0])) || currentPos > extraCount + 3) {
                byte3 = bytes.shift()!;
                extraCount = currentPos;
                hasExtra = true;
            }
            const combined = ((byte3 << 14) | (byte2 << 7) | byte1) >> (2 * currentPos - 7 * extraCount);
            result.push(combined & 127);
            if (hasExtra) {
                charIndex++;
            }
        }
        return result.map(code => String.fromCharCode(code)).join('');
    }
}
