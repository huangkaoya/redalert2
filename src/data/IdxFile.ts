import { DataStream } from "./DataStream";
import { IdxEntry } from "./IdxEntry";
export class IdxFile {
    public entries: Map<string, IdxEntry>;
    constructor(stream: DataStream) {
        this.entries = new Map<string, IdxEntry>();
        this.parse(stream);
    }
    private parse(stream: DataStream): void {
        const magicId = stream.readCString(4);
        if (magicId !== "GABA") {
            throw new Error(`Unable to load Idx file, did not find magic id "GABA", found "${magicId}" instead`);
        }
        const magicNumber = stream.readInt32();
        if (magicNumber !== 2) {
            throw new Error(`Unable to load Idx file, did not find magic number 2, found ${magicNumber} instead`);
        }
        const numEntries = stream.readInt32();
        for (let i = 0; i < numEntries; i++) {
            const entry = new IdxEntry();
            let rawFilenameBytes = stream.readUint8Array(16);
            let firstNull = rawFilenameBytes.indexOf(0);
            if (firstNull === -1)
                firstNull = 16;
            let filename = "";
            for (let k = 0; k < firstNull; k++) {
                filename += String.fromCharCode(rawFilenameBytes[k]);
            }
            entry.filename = filename + ".wav";
            entry.offset = stream.readUint32();
            entry.length = stream.readUint32();
            entry.sampleRate = stream.readUint32();
            entry.flags = stream.readUint32();
            entry.chunkSize = stream.readUint32();
            this.entries.set(entry.filename, entry);
        }
    }
}
