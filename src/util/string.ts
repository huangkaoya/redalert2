import { Base64 } from './Base64';
export function pad(value: string | number, formatPattern: string = "0000"): string {
    const strValue = String(value);
    if (strValue.length >= formatPattern.length) {
        return strValue;
    }
    return formatPattern.substring(0, formatPattern.length - strValue.length) + strValue;
}
export function equalsIgnoreCase(strA: string, strB: string): boolean {
    if (strA === null || strA === undefined || strB === null || strB === undefined) {
        return strA === strB;
    }
    return strA.toLowerCase() === strB.toLowerCase();
}
export function binaryStringToUint8Array(binaryStr: string): Uint8Array {
    const length = binaryStr.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        const charCode = binaryStr.charCodeAt(i);
        if (charCode > 255) {
            console.warn(`Invalid character in binaryStringToUint8Array at index ${i}: ${binaryStr[i]} (charCode ${charCode})`);
            bytes[i] = charCode & 0xFF;
        }
        else {
            bytes[i] = charCode;
        }
    }
    return bytes;
}
export function base64StringToUint8Array(base64Str: string): Uint8Array {
    const decodedString = Base64.decode(base64Str);
    return binaryStringToUint8Array(decodedString);
}
export function uint8ArrayToBinaryString(bytes: Uint8Array | ReadonlyArray<number>): string {
    let result = "";
    for (let i = 0; i < bytes.length; i++) {
        result += String.fromCharCode(bytes[i]);
    }
    return result;
}
export function uint8ArrayToBase64String(bytes: Uint8Array | ReadonlyArray<number>): string {
    const binaryString = uint8ArrayToBinaryString(bytes);
    return Base64.encode(binaryString);
}
export function utf16ToBinaryString(str: string): string {
    const length = str.length;
    let binary = "";
    for (let i = 0; i < length; i++) {
        const charCode = str.charCodeAt(i);
        binary += String.fromCharCode(charCode >> 8);
        binary += String.fromCharCode(charCode & 0xFF);
    }
    return binary;
}
export function binaryStringToUtf16(binaryStr: string): string {
    const length = binaryStr.length;
    let utf16 = "";
    if (length % 2 !== 0) {
        console.warn("binaryStringToUtf16: Input binary string length is odd. Last byte will be ignored.");
    }
    for (let i = 0; i < Math.floor(length / 2) * 2; i += 2) {
        const highByte = binaryStr.charCodeAt(i);
        const lowByte = binaryStr.charCodeAt(i + 1);
        if (highByte > 255 || lowByte > 255) {
            console.warn(`Invalid byte sequence in binaryStringToUtf16 at index ${i}`);
        }
        utf16 += String.fromCharCode((highByte << 8) | lowByte);
    }
    return utf16;
}
export function bufferToHexString(buffer: ArrayBuffer): string {
    const hexChars: string[] = [];
    const dataView = new DataView(buffer);
    const bytePattern = "00000000";
    const numUint32 = Math.floor(dataView.byteLength / 4);
    for (let i = 0; i < numUint32; i++) {
        const uint32Value = dataView.getUint32(i * 4, false);
        const hexString = uint32Value.toString(16);
        hexChars.push((bytePattern + hexString).slice(-8));
    }
    const remainingBytes = dataView.byteLength % 4;
    if (remainingBytes > 0) {
        let lastChunkHex = "";
        for (let i = 0; i < remainingBytes; i++) {
            const byte = dataView.getUint8(numUint32 * 4 + i);
            lastChunkHex += (byte < 16 ? '0' : '') + byte.toString(16);
        }
        hexChars.push(lastChunkHex);
        console.warn(`bufferToHexString: Buffer length ${dataView.byteLength} is not a multiple of 4. Remaining ${remainingBytes} bytes processed individually.`);
    }
    return hexChars.join("").toUpperCase();
}
