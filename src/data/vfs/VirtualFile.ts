import { DataStream } from '../DataStream';
import { IOError } from './IOError';
export class VirtualFile {
    public stream: DataStream;
    public filename: string;
    public static async fromRealFile(realFile: File): Promise<VirtualFile> {
        try {
            const arrayBuffer = await realFile.arrayBuffer();
            const dataStream = new DataStream(arrayBuffer);
            return new VirtualFile(dataStream, realFile.name);
        }
        catch (error) {
            if (error instanceof DOMException) {
                throw new IOError(`File "${realFile.name}" could not be read (${error.name})`);
            }
            throw error;
        }
    }
    public static fromBytes(bytes: ArrayBuffer | ArrayBufferView, filename: string): VirtualFile {
        const view = bytes instanceof ArrayBuffer
            ? new DataView(bytes)
            : new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const dataStream = new DataStream(view);
        return new VirtualFile(dataStream, filename);
    }
    public static factory(buffer: ArrayBuffer | ArrayBufferView, filename: string, byteOffset: number = 0, byteLength?: number): VirtualFile {
        let view: DataView;
        if (buffer instanceof ArrayBuffer) {
            view = new DataView(buffer, byteOffset, byteLength);
        }
        else {
            view = new DataView(buffer.buffer, buffer.byteOffset + byteOffset, byteLength ?? buffer.byteLength - byteOffset);
        }
        const dataStream = new DataStream(view);
        return new VirtualFile(dataStream, filename);
    }
    constructor(stream: DataStream, filename: string) {
        this.stream = stream;
        this.filename = filename;
    }
    readAsString(encoding?: string): string {
        this.stream.seek(0);
        return this.stream.readString(this.stream.byteLength, encoding);
    }
    getBytes(): Uint8Array {
        return new Uint8Array(this.stream.buffer, this.stream.byteOffset, this.stream.byteLength);
    }
    getSize(): number {
        return this.stream.byteLength;
    }
    asFile(mimeType?: string): File {
        return new File([this.getBytes() as any], this.filename, { type: mimeType });
    }
}
