import * as Normals from "./normals";
import { VoxelField } from "./VoxelField";
import type { Voxel } from "./Voxel";
import type { Span } from "./Span";
import { Matrix4, Vector3 } from 'three';
export interface PlainSection {
    name: string;
    normalsMode: number;
    minBounds: number[];
    maxBounds: number[];
    sizeX: number;
    sizeY: number;
    sizeZ: number;
    hvaMultiplier: number;
    transfMatrix: number[];
    spans: Span[];
}
export class Section {
    public name: string = "";
    public normalsMode: number = 1;
    public minBounds: Vector3 = new Vector3();
    public maxBounds: Vector3 = new Vector3();
    public sizeX: number = 0;
    public sizeY: number = 0;
    public sizeZ: number = 0;
    public hvaMultiplier: number = 1.0;
    public transfMatrix: Matrix4 = new Matrix4();
    public spans: Span[] = [];
    get spanX(): number {
        return this.maxBounds.x - this.minBounds.x;
    }
    get spanY(): number {
        return this.maxBounds.y - this.minBounds.y;
    }
    get spanZ(): number {
        return this.maxBounds.z - this.minBounds.z;
    }
    get scaleX(): number {
        return this.sizeX === 0 ? 1 : this.spanX / this.sizeX;
    }
    get scaleY(): number {
        return this.sizeY === 0 ? 1 : this.spanY / this.sizeY;
    }
    get scaleZ(): number {
        return this.sizeZ === 0 ? 1 : this.spanZ / this.sizeZ;
    }
    get scale(): Vector3 {
        return new Vector3(this.scaleX, this.scaleY, this.scaleZ);
    }
    getAllVoxels(): {
        voxels: Voxel[];
        voxelField: VoxelField;
    } {
        const allVoxels: Voxel[] = [];
        const field = new VoxelField(this.sizeX + 1, this.sizeY + 1, this.sizeZ + 1);
        for (const span of this.spans) {
            if (span.voxels) {
                for (const voxel of span.voxels) {
                    allVoxels.push(voxel);
                    field.add(voxel);
                }
            }
        }
        return { voxels: allVoxels, voxelField: field };
    }
    getNormals(): Vector3[] {
        switch (this.normalsMode) {
            case 1: return Normals.normals1;
            case 2: return Normals.normals2;
            case 3: return Normals.normals3;
            case 4: return Normals.normals4;
            default:
                console.warn(`Invalid normalsMode ${this.normalsMode}, defaulting to normals1.`);
                return Normals.normals1;
        }
    }
    scaleHvaMatrix(matrix: Matrix4): Matrix4 {
        const newMatrix = matrix.clone ? matrix.clone() : new Matrix4().fromArray!(matrix.elements);
        if (newMatrix.elements.length >= 15) {
            newMatrix.elements[12] *= this.hvaMultiplier;
            newMatrix.elements[13] *= this.hvaMultiplier;
            newMatrix.elements[14] *= this.hvaMultiplier;
        }
        return newMatrix;
    }
    toPlain(): PlainSection {
        return {
            name: this.name,
            normalsMode: this.normalsMode,
            minBounds: this.minBounds.toArray ? this.minBounds.toArray() : [this.minBounds.x, this.minBounds.y, this.minBounds.z],
            maxBounds: this.maxBounds.toArray ? this.maxBounds.toArray() : [this.maxBounds.x, this.maxBounds.y, this.maxBounds.z],
            sizeX: this.sizeX,
            sizeY: this.sizeY,
            sizeZ: this.sizeZ,
            hvaMultiplier: this.hvaMultiplier,
            transfMatrix: this.transfMatrix.toArray ? this.transfMatrix.toArray() : [...this.transfMatrix.elements],
            spans: this.spans,
        };
    }
    fromPlain(plain: PlainSection): this {
        this.name = plain.name;
        this.normalsMode = plain.normalsMode;
        this.minBounds = new Vector3().fromArray!(plain.minBounds);
        this.maxBounds = new Vector3().fromArray!(plain.maxBounds);
        this.sizeX = plain.sizeX;
        this.sizeY = plain.sizeY;
        this.sizeZ = plain.sizeZ;
        this.hvaMultiplier = plain.hvaMultiplier;
        this.transfMatrix = new Matrix4().fromArray!(plain.transfMatrix);
        this.spans = plain.spans;
        return this;
    }
}
