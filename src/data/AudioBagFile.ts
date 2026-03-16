import { DataStream } from "./DataStream";
import { VirtualFile } from "./vfs/VirtualFile";
import type { IdxFile } from "./IdxFile";
import type { IdxEntry } from "./IdxEntry";
export class AudioBagFile {
    private fileData: Map<string, DataStream>;
    constructor() {
        this.fileData = new Map<string, DataStream>();
    }
    public async fromVirtualFile(bagFile: VirtualFile, idx: IdxFile): Promise<this> {
        for (const [filename, entry] of idx.entries) {
            const wavDataStream = this.buildWavData(bagFile.stream, entry);
            wavDataStream.dynamicSize = false;
            this.fileData.set(filename, wavDataStream);
        }
        return this;
    }
    public getFileList(): string[] {
        return [...this.fileData.keys()];
    }
    public containsFile(filename: string): boolean {
        return this.fileData.has(filename);
    }
    public openFile(filename: string): VirtualFile {
        if (!this.containsFile(filename)) {
            throw new Error(`File "${filename}" not found in AudioBagFile`);
        }
        const dataStream = this.fileData.get(filename)!;
        dataStream.seek(0);
        return new VirtualFile(dataStream, filename);
    }
    private buildWavData(sourceStream: DataStream, idxEntry: IdxEntry): DataStream {
        const outStream = new DataStream();
        outStream.littleEndian();
        const channels = (idxEntry.flags & 0x01) > 0 ? 2 : 1;
        let paddingBytes = 0;
        if ((idxEntry.flags & 0x02) > 0) {
            outStream.writeString("RIFF");
            outStream.writeUint32(idxEntry.length + 36);
            outStream.writeString("WAVE");
            outStream.writeString("fmt ");
            outStream.writeUint32(16);
            outStream.writeUint16(1);
            outStream.writeUint16(channels);
            outStream.writeUint32(idxEntry.sampleRate);
            outStream.writeUint32(idxEntry.sampleRate * channels * 2);
            outStream.writeUint16(channels * 2);
            outStream.writeUint16(16);
            outStream.writeString("data");
            outStream.writeUint32(idxEntry.length);
        }
        else if ((idxEntry.flags & 0x08) > 0) {
            const byteRate = 11100 * channels * Math.floor(idxEntry.sampleRate / 22050);
            const blockAlign = idxEntry.chunkSize;
            const samplesPerBlock = 1017;
            const numBlocks = Math.max(2, Math.ceil(idxEntry.length / blockAlign));
            const totalDataBytesInAdpcm = numBlocks * blockAlign;
            paddingBytes = totalDataBytesInAdpcm - idxEntry.length;
            outStream.writeString("RIFF");
            outStream.writeUint32(52 + totalDataBytesInAdpcm);
            outStream.writeString("WAVE");
            outStream.writeString("fmt ");
            outStream.writeUint32(20);
            outStream.writeUint16(17);
            outStream.writeUint16(channels);
            outStream.writeUint32(idxEntry.sampleRate);
            outStream.writeUint32(byteRate);
            outStream.writeUint16(blockAlign);
            outStream.writeUint16(4);
            outStream.writeUint16(2);
            outStream.writeUint16(samplesPerBlock);
            outStream.writeString("fact");
            outStream.writeUint32(4);
            outStream.writeUint32(samplesPerBlock * numBlocks);
            outStream.writeString("data");
            outStream.writeUint32(totalDataBytesInAdpcm);
        }
        else {
            console.warn(`AudioBagFile: Unknown flags ${idxEntry.flags} for WAV header generation for entry referencing offset ${idxEntry.offset}.`);
        }
        sourceStream.seek(idxEntry.offset);
        const audioData = sourceStream.readUint8Array(idxEntry.length);
        outStream.writeUint8Array(audioData);
        for (let i = 0; i < paddingBytes; i++) {
            outStream.writeUint8(0);
        }
        outStream.seek(0);
        return outStream;
    }
}
