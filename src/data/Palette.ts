import { Color } from "../util/Color";
import { fnv32a } from "../util/math";
import { VirtualFile } from "./vfs/VirtualFile";
import { DataStream } from "./DataStream";
export class Palette {
    public static REMAP_START_IDX = 16;
    public colors: Color[] = [];
    private _hash: number = 0;
    static fromVirtualFile(file: VirtualFile): Palette {
        const palette = new Palette({ colors: [] });
        palette.fromVirtualFile(file);
        return palette;
    }
    constructor(source?: VirtualFile | Uint8Array | number[] | {
        colors: Color[];
        hashVal?: number;
    }) {
        if (source instanceof VirtualFile) {
            this.fromVirtualFile(source);
        }
        else if (source instanceof Uint8Array || Array.isArray(source)) {
            this.fromJsonCompatible(source as Uint8Array | number[]);
        }
        else if (typeof source === 'object' && source !== null && 'colors' in source) {
            this.colors = source.colors.map(c => new Color(c.r, c.g, c.b));
            this._hash = source.hashVal ?? this.computeHash(this.colors);
        }
        else {
        }
    }
    private fromVirtualFile(vf: VirtualFile): void {
        const rawData = (vf.stream as DataStream).readUint8Array(768);
        this.fromJsonCompatible(rawData);
    }
    private fromJsonCompatible(data: Uint8Array | number[]): void {
        this.colors = [];
        for (let i = 0; i < data.length / 3; ++i) {
            this.colors.push(Color.fromRgb(data[3 * i] * 4, data[3 * i + 1] * 4, data[3 * i + 2] * 4));
        }
        if (this.colors.length > 256) {
            this.colors.length = 256;
        }
        this._hash = this.computeHash(this.colors);
    }
    getColor(index: number): Color {
        return this.colors[index] ?? Color.fromRgb(0, 0, 0);
    }
    getColorAsHex(index: number): number {
        return this.getColor(index).asHex();
    }
    setColors(newColors: Color[]): void {
        this.colors = newColors.map(c => c.clone());
        if (this.colors.length > 256) {
            this.colors.length = 256;
        }
        this._hash = this.computeHash(this.colors);
    }
    get size(): number {
        return this.colors.length;
    }
    get hash(): number {
        return this._hash;
    }
    private computeHash(colorArray: Color[]): number {
        const buffer = new Uint8Array(3 * colorArray.length);
        let j = 0;
        for (const color of colorArray) {
            buffer[j++] = color.r;
            buffer[j++] = color.g;
            buffer[j++] = color.b;
        }
        return fnv32a(buffer);
    }
    clone(): Palette {
        return new Palette({ colors: this.colors.map((c) => c.clone()), hashVal: this._hash });
    }
    remap(baseColor: Color): Palette {
        const remapFactors = [
            63, 59, 55, 52, 48, 44, 41, 37, 33, 30, 26, 22, 19, 15, 11, 8,
        ];
        if (this.colors.length < Palette.REMAP_START_IDX + remapFactors.length) {
            console.warn("Palette too small to remap fully.");
        }
        for (let i = 0; i < remapFactors.length; ++i) {
            const targetIndex = Palette.REMAP_START_IDX + i;
            if (targetIndex < this.colors.length) {
                const factor = remapFactors[i];
                this.colors[targetIndex].r = Math.floor((baseColor.r / 255) * factor * 4);
                this.colors[targetIndex].g = Math.floor((baseColor.g / 255) * factor * 4);
                this.colors[targetIndex].b = Math.floor((baseColor.b / 255) * factor * 4);
            }
            else {
                break;
            }
        }
        this._hash = this.computeHash(this.colors);
        return this;
    }
}
