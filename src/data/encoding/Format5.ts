import { Format80 } from './Format80';
import { MiniLzo } from './MiniLzo';
export class Format5 {
    static decode(input: Uint8Array, outputSize: number, format: number = 5): Uint8Array {
        const output = new Uint8Array(outputSize);
        this.decodeInto(input, output, format);
        return output;
    }
    static decodeInto(input: Uint8Array, output: Uint8Array, format: number = 5): void {
        const outputLength = output.length;
        let inputPos = 0;
        let outputPos = 0;
        while (outputPos < outputLength) {
            const compressedSize = (input[inputPos + 1] << 8) | input[inputPos];
            inputPos += 2;
            const decompressedSize = (input[inputPos + 1] << 8) | input[inputPos];
            inputPos += 2;
            if (!compressedSize || !decompressedSize)
                break;
            let decompressed: Uint8Array;
            if (format === 80) {
                decompressed = Format80.decode(input.subarray(inputPos, inputPos + compressedSize), decompressedSize);
            }
            else {
                decompressed = MiniLzo.decompress(input.subarray(inputPos, inputPos + compressedSize), decompressedSize);
            }
            for (let i = 0; i < decompressedSize; ++i) {
                output[outputPos + i] = decompressed[i];
            }
            inputPos += compressedSize;
            outputPos += decompressedSize;
        }
    }
}
