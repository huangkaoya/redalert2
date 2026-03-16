declare const lzo1x: {
    decompress(state: {
        inputBuffer: Uint8Array;
        outputBuffer: Uint8Array | null;
    }, cfg: {
        outputSize: number;
    }): number;
};
export class MiniLzo {
    static decompress(input: Uint8Array, outputSize: number): Uint8Array {
        const buffer = { inputBuffer: input, outputBuffer: null };
        const result = lzo1x.decompress(buffer, { outputSize });
        if (result !== 0) {
            throw new Error(`MiniLzo decode failed with code ${result}`);
        }
        return buffer.outputBuffer;
    }
}
