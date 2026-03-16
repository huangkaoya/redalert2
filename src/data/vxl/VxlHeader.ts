import type { DataStream } from "../DataStream";
export class VxlHeader {
    public static readonly size = 32;
    public fileName: string = "";
    public paletteCount: number = 0;
    public headerCount: number = 0;
    public tailerCount: number = 0;
    public bodySize: number = 0;
    public paletteRemapStart: number = 0;
    public paletteRemapEnd: number = 0;
    read(stream: DataStream): void {
        this.fileName = stream.readCString(16);
        this.paletteCount = stream.readUint32();
        this.headerCount = stream.readUint32();
        this.tailerCount = stream.readUint32();
        this.bodySize = stream.readUint32();
        this.paletteRemapStart = stream.readUint8();
        this.paletteRemapEnd = stream.readUint8();
        stream.seek(stream.position + 768);
    }
}
