import { DataStream } from './DataStream';
import { VirtualFile } from './vfs/VirtualFile';
const strwChars = Array.from("STRW");
const CSF_LABEL_HAS_VALUE_MAGIC = new Uint32Array(new Uint8Array(strwChars.map((e: string) => e.charCodeAt(0)).reverse()).buffer)[0];
const xorDecodeArray = (arr: Uint8Array): Uint8Array => {
    return arr.map(byte => ~byte & 0xFF);
};
const byteArrayToUnicodeString = (arr: Uint8Array): string => {
    let result = "";
    for (let i = 0; i < arr.length; i += 2) {
        result += String.fromCharCode(arr[i] | (arr[i + 1] << 8));
    }
    return result;
};
export enum CsfLanguage {
    EnglishUS = 0,
    EnglishUK = 1,
    German = 2,
    French = 3,
    Spanish = 4,
    Italian = 5,
    Japanese = 6,
    Jabberwockie = 7,
    Korean = 8,
    Unknown = 9,
    ChineseCN = 100,
    ChineseTW = 101
}
export const csfLocaleMap = new Map<CsfLanguage, string>([
    [CsfLanguage.EnglishUS, "en-US"],
    [CsfLanguage.EnglishUK, "en-GB"],
    [CsfLanguage.German, "de-DE"],
    [CsfLanguage.French, "fr-FR"],
    [CsfLanguage.Spanish, "es-ES"],
    [CsfLanguage.Italian, "it-IT"],
    [CsfLanguage.Japanese, "ja-JP"],
    [CsfLanguage.Korean, "ko-KR"],
    [CsfLanguage.ChineseCN, "zh-CN"],
    [CsfLanguage.ChineseTW, "zh-TW"],
]);
export class CsfFile {
    public language: CsfLanguage = CsfLanguage.Unknown;
    public data: {
        [key: string]: string;
    } = {};
    constructor(virtualFile?: VirtualFile) {
        if (virtualFile) {
            this.fromVirtualFile(virtualFile);
        }
    }
    public fromVirtualFile(file: VirtualFile): void {
        const stream = file.stream;
        if (!stream) {
            console.error("[CsfFile] VirtualFile does not have a valid stream.");
            return;
        }
        console.log(`[CsfFile] Parsing CSF file: ${file.filename}`);
        stream.readInt32();
        stream.readInt32();
        const numLabels = stream.readInt32();
        stream.readInt32();
        stream.readInt32();
        this.language = stream.readInt32() as CsfLanguage;
        console.log(`[CsfFile] Header parsed. Stream position: ${stream.position}, Declared labels: ${numLabels}, Declared lang ID: ${this.language}`);
        for (let i = 0; i < numLabels; i++) {
            if (stream.position + 4 > stream.byteLength) {
                console.error(`[CsfFile] Entry ${i}/${numLabels}: Not enough data for LBL magic. Stopping.`);
                break;
            }
            stream.readInt32();
            if (stream.position + 4 > stream.byteLength) {
                console.error(`[CsfFile] Entry ${i}/${numLabels}: Not enough data for numPairs. Stopping.`);
                break;
            }
            const numPairs = stream.readInt32();
            if (stream.position + 4 > stream.byteLength) {
                console.error(`[CsfFile] Entry ${i}/${numLabels}: Not enough data for labelNameLength. Stopping.`);
                break;
            }
            const labelNameLength = stream.readInt32();
            if (labelNameLength < 0) {
                console.error(`[CsfFile] Entry ${i}/${numLabels}: Invalid negative labelNameLength ${labelNameLength}. Stopping parse.`);
                break;
            }
            const MAX_REASONABLE_LABEL_LENGTH = 1024;
            if (labelNameLength > MAX_REASONABLE_LABEL_LENGTH || stream.position + labelNameLength > stream.byteLength) {
                console.error(`[CsfFile] Entry ${i}/${numLabels}: labelNameLength ${labelNameLength} is invalid or would read past EOF. Pos: ${stream.position}, Total: ${stream.byteLength}. Stopping.`);
                break;
            }
            const labelName = stream.readString(labelNameLength);
            if (numPairs !== 1) {
                console.warn(`[CsfFile] Entry ${i}/${numLabels}: Label '${labelName}' has ${numPairs} pairs (expected 1). Treating as empty string.`);
                this.data[labelName.toUpperCase()] = "";
                continue;
            }
            if (stream.position + 4 > stream.byteLength) {
                console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): Not enough data for valueFlagsOrMagic. Stopping.`);
                break;
            }
            const valueFlagsOrMagic = stream.readInt32();
            if (stream.position + 4 > stream.byteLength) {
                console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): Not enough data for charsOrPairsLength. Stopping.`);
                break;
            }
            const charsOrPairsLength = stream.readInt32();
            if (charsOrPairsLength < 0) {
                console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): Negative charsOrPairsLength ${charsOrPairsLength}. Stopping.`);
                break;
            }
            const bytesToReadForValue = charsOrPairsLength * 2;
            if (bytesToReadForValue < 0) {
                console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): Negative bytesToReadForValue ${bytesToReadForValue}. Stopping.`);
                break;
            }
            if (stream.position + bytesToReadForValue > stream.byteLength) {
                console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): bytesToReadForValue ${bytesToReadForValue} would read past EOF. Pos: ${stream.position}, Total: ${stream.byteLength}. Stopping.`);
                break;
            }
            let actualValueString = "";
            if (bytesToReadForValue > 0) {
                const valueBytesRaw = stream.readUint8Array(bytesToReadForValue);
                const valueBytesDecoded = xorDecodeArray(valueBytesRaw);
                actualValueString = byteArrayToUnicodeString(valueBytesDecoded);
            }
            this.data[labelName.toUpperCase()] = actualValueString;
            if (valueFlagsOrMagic === CSF_LABEL_HAS_VALUE_MAGIC) {
                if (stream.position + 4 > stream.byteLength) {
                    console.warn(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): Not enough data for extraWstrLenBytes field (STRW). Assuming no extra string.`);
                }
                else {
                    const extraWstrLenBytes = stream.readInt32();
                    if (extraWstrLenBytes < 0) {
                        console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): Invalid STRW extraWstrLenBytes ${extraWstrLenBytes}. Stopping.`);
                        break;
                    }
                    if (extraWstrLenBytes > 0) {
                        if (stream.position + extraWstrLenBytes > stream.byteLength) {
                            console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): STRW extraWstrLenBytes ${extraWstrLenBytes} would read past EOF. Stopping.`);
                            break;
                        }
                        stream.readString(extraWstrLenBytes);
                    }
                }
            }
        }
        if (this.language === CsfLanguage.Unknown || this.language === 0) {
            this.autoDetectLocale();
        }
        console.log(`[CsfFile] Finished parsing ${file.filename}. Loaded ${Object.keys(this.data).length} labels. Detected/Set language: ${CsfLanguage[this.language]} (${this.getIsoLocale() || 'N/A'})`);
    }
    private autoDetectLocale(): void {
        const introTheme = this.data["THEME:INTRO"];
        if (introTheme === "開場") {
            this.language = CsfLanguage.ChineseTW;
        }
        else if (introTheme === "开场") {
            this.language = CsfLanguage.ChineseCN;
        }
        else if (introTheme) {
            if (this.language === CsfLanguage.Unknown || this.language === 0) {
                this.language = CsfLanguage.EnglishUS;
            }
        }
    }
    public getIsoLocale(): string | undefined {
        return csfLocaleMap.get(this.language);
    }
}
