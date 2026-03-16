import type { Matrix4 } from 'three';
export class Section {
    public name: string = "";
    public matrices: Matrix4[] = [];
    constructor() {
    }
    public getMatrix(index: number): Matrix4 {
        return this.matrices[index];
    }
}
