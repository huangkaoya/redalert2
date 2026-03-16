import type { DataStream } from "./DataStream";
class LocalColorImpl {
    constructor(public r: number = 0, public g: number = 0, public b: number = 0) { }
}
declare let THREE: {
    Color: typeof LocalColorImpl;
} | undefined;
const ColorImplToShow = typeof THREE !== 'undefined' ? THREE.Color : LocalColorImpl;
export enum TmpImageFlags {
    ExtraData = 1,
    ZData = 2,
    DamagedData = 4
}
const signedByteToUnsigned = (signedByte: number): number => {
    return signedByte < 0 ? signedByte + 256 : signedByte;
};
export class TmpImage {
    public x: number = 0;
    public y: number = 0;
    private dataBlockSize: number = 0;
    public extraX: number = 0;
    public extraY: number = 0;
    public extraWidth: number = 0;
    public extraHeight: number = 0;
    private flags: number = 0;
    public height: number = 0;
    public terrainType: number = 0;
    public rampType: number = 0;
    public radarLeft: InstanceType<typeof ColorImplToShow> = new ColorImplToShow();
    public radarRight: InstanceType<typeof ColorImplToShow> = new ColorImplToShow();
    public tileData: Uint8Array = new Uint8Array(0);
    public zData?: Uint8Array;
    public extraData?: Uint8Array;
    public hasZData: boolean = false;
    public hasExtraData: boolean = false;
    constructor(stream: DataStream, tileWidthCells: number, tileHeightCells: number) {
        this.fromStream(stream, tileWidthCells, tileHeightCells);
    }
    private fromStream(stream: DataStream, tileWidthCells: number, tileHeightCells: number): void {
        this.x = stream.readInt32();
        this.y = stream.readInt32();
        stream.readInt32();
        stream.readInt32();
        this.dataBlockSize = stream.readInt32();
        this.extraX = stream.readInt32();
        this.extraY = stream.readInt32();
        this.extraWidth = stream.readInt32();
        this.extraHeight = stream.readInt32();
        this.flags = stream.readUint32();
        this.height = stream.readUint8();
        this.terrainType = stream.readUint8();
        this.rampType = stream.readUint8();
        this.radarLeft = this.readRadarRgbInternal(stream.readInt8(), stream.readInt8(), stream.readInt8());
        this.radarRight = this.readRadarRgbInternal(stream.readInt8(), stream.readInt8(), stream.readInt8());
        stream.seek(stream.position + 3);
        const mainTileDataByteLength = (tileWidthCells * tileHeightCells) / 2;
        this.tileData = stream.mapUint8Array(mainTileDataByteLength);
        this.hasZData = (this.flags & TmpImageFlags.ZData) === TmpImageFlags.ZData;
        if (this.hasZData) {
            this.zData = stream.mapUint8Array(mainTileDataByteLength);
        }
        this.hasExtraData = (this.flags & TmpImageFlags.ExtraData) === TmpImageFlags.ExtraData;
        if (this.hasExtraData) {
            const extraDataByteLength = Math.abs(this.extraWidth * this.extraHeight);
            this.extraData = stream.mapUint8Array(extraDataByteLength);
            if (this.hasZData &&
                this.hasExtraData &&
                this.dataBlockSize > 0 &&
                this.dataBlockSize < stream.byteLength) {
                stream.seek(stream.position + extraDataByteLength);
            }
        }
    }
    private readRadarRgbInternal(r: number, g: number, b: number): InstanceType<typeof ColorImplToShow> {
        return new ColorImplToShow(signedByteToUnsigned(r) / 255, signedByteToUnsigned(g) / 255, signedByteToUnsigned(b) / 255);
    }
}
