import { DataStream } from "./DataStream";
import { Blowfish } from "./encoding/Blowfish";
import { BlowfishKey } from "./encoding/BlowfishKey";
import { MixEntry } from "./MixEntry";
import { VirtualFile } from "./vfs/VirtualFile";
enum MixFileFlags {
    Checksum = 0x00010000,
    Encrypted = 0x00020000
}
export class MixFile {
    private stream: DataStream;
    private headerStart = 84;
    private index: Map<number, MixEntry>;
    private dataStart: number = 0;
    constructor(stream: DataStream) {
        this.stream = stream;
        this.index = new Map<number, MixEntry>();
        this.parseHeader();
    }
    private parseHeader(): void {
        const flags = this.stream.readUint32();
        const isWestwoodMix = (flags & ~(MixFileFlags.Checksum | MixFileFlags.Encrypted)) === 0;
        if (isWestwoodMix) {
            if ((flags & MixFileFlags.Encrypted) !== 0) {
                this.dataStart = this.parseRaHeader();
                return;
            }
        }
        else {
            this.stream.seek(0);
        }
        this.dataStart = this.parseTdHeader(this.stream);
    }
    private parseRaHeader(): number {
        const e = this.stream;
        var t: any = e.readUint8Array(80), i: any = new BlowfishKey().decryptKey(t), r: any = e.readUint32Array(2);
        const s = new Blowfish(i);
        let a = new DataStream(s.decrypt(r));
        t = a.readUint16();
        a.readUint32(), (e.position = this.headerStart);
        (i = 6 + t * MixEntry.size),
            (t = ((3 + i) / 4) | 0),
            (r = e.readUint32Array(t + (t % 2)));
        a = new DataStream(s.decrypt(r));
        i = this.headerStart + i + ((1 + (~i >>> 0)) & 7);
        this.parseTdHeader(a);
        return i;
    }
    private parseTdHeader(e: DataStream): number {
        var t = e.readUint16();
        e.readUint32();
        let successfulEntries = 0;
        let failedEntries = 0;
        let duplicateHashes = 0;
        const seenHashes = new Set<number>();
        for (let r = 0; r < t; r++) {
            try {
                if (e.position + 12 > e.byteLength) {
                    console.log(`[Our] Entry ${r + 1}: Not enough data remaining. Position: ${e.position}, Remaining: ${e.byteLength - e.position}`);
                    failedEntries++;
                    break;
                }
                var i = new MixEntry(e.readUint32(), e.readUint32(), e.readUint32());
                if (r < 5) {
                    console.log(`[Our] Entry ${r + 1}: hash=0x${i.hash.toString(16).toUpperCase()}, offset=${i.offset}, length=${i.length}`);
                    const currentPos = e.position - 12;
                    const rawBytes = new Uint8Array(e.buffer, e.byteOffset + currentPos, 12);
                    console.log(`[Our] Entry ${r + 1} raw bytes:`, Array.from(rawBytes));
                }
                if (seenHashes.has(i.hash)) {
                    duplicateHashes++;
                    if (duplicateHashes <= 10) {
                        console.log(`[Our] Duplicate hash detected at entry ${r + 1}: 0x${i.hash.toString(16).toUpperCase()}`);
                    }
                }
                else {
                    seenHashes.add(i.hash);
                }
                this.index.set(i.hash, i);
                successfulEntries++;
            }
            catch (error) {
                console.log(`[Our] Entry ${r + 1}: Error reading entry:`, error);
                failedEntries++;
                break;
            }
        }
        return e.position;
    }
    public containsFile(filename: string): boolean {
        return this.index.has(MixEntry.hashFilename(filename));
    }
    public openFile(filename: string): VirtualFile {
        const fileId = MixEntry.hashFilename(filename);
        const entry = this.index.get(fileId);
        if (!entry) {
            throw new Error(`File "${filename}" not found`);
        }
        return VirtualFile.factory(this.stream, filename, this.dataStart + entry.offset, entry.length);
    }
}
