import { WaveFile } from '@ra2web/wavefile';
import type { VirtualFile } from './vfs/VirtualFile';
import type { DataStream } from './DataStream';
export class WavFile {
    private rawData?: Uint8Array;
    private decodedData?: Uint8Array;
    constructor(source: VirtualFile | DataStream | Uint8Array) {
        if (source instanceof Uint8Array) {
            this.fromRawData(source);
        }
        else if ('stream' in source && 'getBytes' in source) {
            this.fromVirtualFileOrDataStream(source as VirtualFile | DataStream);
        }
        else {
            console.warn("WavFile constructor: Unknown source type", source);
        }
    }
    private fromRawData(data: Uint8Array): this {
        this.rawData = data;
        return this;
    }
    private fromVirtualFileOrDataStream(file: VirtualFile | DataStream): this {
        if (typeof (file as any).getBytes === 'function') {
            this.rawData = (file as VirtualFile).getBytes();
        }
        else if (file instanceof Uint8Array) {
            this.rawData = file;
        }
        else if ((file as DataStream).buffer && (file as DataStream).byteOffset !== undefined && (file as DataStream).byteLength !== undefined) {
            const ds = file as DataStream;
            this.rawData = new Uint8Array(ds.buffer, ds.byteOffset, ds.byteLength);
        }
        else {
            throw new Error('Cannot get Uint8Array from VirtualFile/DataStream for WavFile');
        }
        return this;
    }
    getRawData(): Uint8Array | undefined {
        return this.rawData;
    }
    getData(): Uint8Array {
        if (!this.decodedData) {
            if (!this.rawData) {
                throw new Error("WavFile: No data loaded to decode.");
            }
            this.decodedData = this.decodeData(this.rawData);
            this.rawData = undefined;
        }
        return this.decodedData;
    }
    setData(decodedData: Uint8Array): void {
        this.rawData = undefined;
        this.decodedData = decodedData;
    }
    private decodeData(data: Uint8Array): Uint8Array {
        const wav = new WaveFile();
        wav.fromBuffer(data as any);
        if (wav.bitDepth === '4') {
            wav.fromIMAADPCM();
        }
        return new Uint8Array(wav.toBuffer() as any);
    }
    isRawImaAdpcm(): boolean {
        if (!this.rawData)
            return false;
        const wav = new WaveFile();
        wav.fromBuffer(this.rawData as any);
        return wav.bitDepth === '4';
    }
}
