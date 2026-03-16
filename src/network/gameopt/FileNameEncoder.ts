import { Base64 } from '@/util/Base64';
import { binaryStringToUtf16, utf16ToBinaryString } from '@/util/string';
export class FileNameEncoder {
    encode(fileName: string): string {
        if (fileName.match(/^[a-z0-9-_]+\.[a-z]{3}$/i)) {
            return fileName;
        }
        return Base64.encode(utf16ToBinaryString(fileName));
    }
    decode(encodedFileName: string): string {
        if (encodedFileName.match(/\.[a-z]{3}$/i)) {
            return encodedFileName;
        }
        return binaryStringToUtf16(Base64.decode(encodedFileName));
    }
}
