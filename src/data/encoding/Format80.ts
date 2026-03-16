import { DataStream } from '../DataStream';
export class Format80 {
    static decode(input: Uint8Array, outputSize: number): Uint8Array {
        const output = new Uint8Array(outputSize);
        this.decodeInto(input, output);
        return output;
    }
    static decodeInto(input: Uint8Array, output: Uint8Array): number {
        const stream = new DataStream(new DataView(input.buffer, input.byteOffset, input.byteLength));
        let outputPos = 0;
        while (true) {
            const cmd = stream.readUint8();
            if ((cmd & 128) === 0) {
                const byte = stream.readUint8();
                const count = 3 + ((cmd & 112) >> 4);
                this.replicatePrevious(output, outputPos, outputPos - (((cmd & 15) << 8) + byte), count);
                outputPos += count;
            }
            else if ((cmd & 64) === 0) {
                const count = cmd & 63;
                if (count === 0)
                    return outputPos;
                output.set(stream.readUint8Array(count), outputPos);
                outputPos += count;
            }
            else {
                const count = cmd & 63;
                if (count === 62) {
                    const length = stream.readInt16();
                    const value = stream.readUint8();
                    const end = outputPos + length;
                    while (outputPos < end) {
                        output[outputPos++] = value;
                    }
                }
                else if (count === 63) {
                    const length = stream.readInt16();
                    let srcIndex = stream.readInt16();
                    if (srcIndex >= outputPos) {
                        throw new Error(`srcIndex >= destIndex ${srcIndex} ${outputPos}`);
                    }
                    const end = outputPos + length;
                    while (outputPos < end) {
                        output[outputPos++] = output[srcIndex++];
                    }
                }
                else {
                    const count2 = 3 + count;
                    let srcIndex = stream.readInt16();
                    if (srcIndex >= outputPos) {
                        throw new Error(`srcIndex >= destIndex ${srcIndex} ${outputPos}`);
                    }
                    const end = outputPos + count2;
                    while (outputPos < end) {
                        output[outputPos++] = output[srcIndex++];
                    }
                }
            }
        }
    }
    private static replicatePrevious(output: Uint8Array, destIndex: number, srcIndex: number, count: number): void {
        if (destIndex < srcIndex) {
            throw new Error(`srcIndex > destIndex ${srcIndex} ${destIndex}`);
        }
        if (destIndex - srcIndex === 1) {
            for (let i = 0; i < count; i++) {
                output[destIndex + i] = output[destIndex - 1];
            }
        }
        else {
            for (let i = 0; i < count; i++) {
                output[destIndex + i] = output[srcIndex + i];
            }
        }
    }
}
