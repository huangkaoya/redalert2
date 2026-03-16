import { Section } from './hva/Section';
import type { VirtualFile } from './vfs/VirtualFile';
import type { DataStream } from './DataStream';
import { Matrix4 } from 'three';
export class HvaFile {
    public filename?: string;
    public sections: Section[] = [];
    constructor(source: VirtualFile | DataStream) {
        if (typeof (source as VirtualFile).filename === 'string' && typeof (source as VirtualFile).stream === 'object') {
            this.fromVirtualFile(source as VirtualFile);
        }
        else if (typeof (source as DataStream).readInt32 === 'function') {
            this.parseHvaData(source as DataStream, (source as any).filename || 'unknown.hva');
        }
        else {
            throw new Error('Unsupported source type for HvaFile');
        }
    }
    private fromVirtualFile(file: VirtualFile): void {
        this.filename = file.filename;
        this.parseHvaData(file.stream as DataStream, file.filename);
    }
    private parseHvaData(stream: DataStream, filename: string): void {
        this.filename = filename;
        this.sections = [];
        stream.readCString(16);
        const numFrames = stream.readInt32();
        const numSections = stream.readInt32();
        for (let i = 0; i < numSections; ++i) {
            const section = new Section();
            section.name = stream.readCString(16);
            section.matrices = new Array(numFrames);
            this.sections.push(section);
        }
        for (let frameIndex = 0; frameIndex < numFrames; ++frameIndex) {
            for (let sectionIndex = 0; sectionIndex < numSections; ++sectionIndex) {
                this.sections[sectionIndex].matrices[frameIndex] = this.readMatrix(stream);
            }
        }
    }
    private readMatrix(stream: DataStream): Matrix4 {
        const matrixElements: number[] = [];
        for (let i = 0; i < 3; ++i) {
            matrixElements.push(stream.readFloat32(), stream.readFloat32(), stream.readFloat32(), stream.readFloat32());
        }
        matrixElements.push(0, 0, 0, 1);
        const matrix = new Matrix4();
        matrix.fromArray(matrixElements);
        matrix.transpose();
        return matrix;
    }
}
