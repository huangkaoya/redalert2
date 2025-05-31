import { VirtualFile } from '@/data/vfs/VirtualFile';
import { Section } from '@/data/vxl/Section';
import { VxlHeader } from '@/data/vxl/VxlHeader';
import * as THREE from 'three';
import { DataStream } from './DataStream';

interface Voxel {
  x: number;
  y: number;
  z: number;
  colorIndex: number;
  normalIndex: number;
}

interface Span {
  x: number;
  y: number;
  voxels: Voxel[];
}

interface SectionTailer {
  startingSpanOffset: number;
  endingSpanOffset: number;
  dataSpanOffset: number;
}

interface PlainVxlFile {
  sections: any[];
  voxelCount: number;
}

export class VxlFile {
  public filename?: string;
  public sections: Section[] = [];
  public voxelCount: number = 0;

  constructor(virtualFile?: VirtualFile) {
    if (virtualFile instanceof VirtualFile) {
      this.fromVirtualFile(virtualFile);
    }
  }

  fromVirtualFile(virtualFile: VirtualFile): void {
    this.filename = virtualFile.filename;
    const stream: DataStream = virtualFile.stream;
    
    this.sections = [];
    
    if (stream.byteLength < VxlHeader.size) {
      return;
    }

    const header = new VxlHeader();
    header.read(stream);
    
    if (!header.headerCount || !header.tailerCount || header.tailerCount !== header.headerCount) {
      return;
    }

    // Read section headers
    for (let i = 0; i < header.headerCount; ++i) {
      const section = new Section();
      this.readSectionHeader(section, stream);
      
      if (this.sections.find(s => s.name === section.name)) {
        console.warn(`Duplicate section name "${section.name}" found in VXL "${this.filename}".`);
      }
      
      this.sections.push(section);
    }

    // Save current position and skip body
    const bodyStartPosition = stream.position;
    stream.seek(stream.position + header.bodySize);

    // Read section tailers
    const tailers: SectionTailer[] = [];
    for (let i = 0; i < header.tailerCount; ++i) {
      tailers[i] = this.readSectionTailer(this.sections[i], stream);
    }

    // Read section body spans
    let totalVoxelCount = 0;
    for (let i = 0; i < header.headerCount; ++i) {
      stream.seek(bodyStartPosition);
      totalVoxelCount += this.readSectionBodySpans(this.sections[i], tailers[i], stream);
    }
    
    this.voxelCount = totalVoxelCount;
  }

  private readSectionHeader(section: Section, stream: DataStream): void {
    section.name = stream.readCString(16);
    stream.readUint32(); // Skip 3 uint32 values
    stream.readUint32();
    stream.readUint32();
  }

  private readSectionTailer(section: Section, stream: DataStream): SectionTailer {
    const startingSpanOffset = stream.readUint32();
    const endingSpanOffset = stream.readUint32();
    const dataSpanOffset = stream.readUint32();
    
    section.hvaMultiplier = stream.readFloat32();
    section.transfMatrix = this.readTransfMatrix(stream);
    section.minBounds = new THREE.Vector3(
      stream.readFloat32(),
      stream.readFloat32(),
      stream.readFloat32()
    );
    section.maxBounds = new THREE.Vector3(
      stream.readFloat32(),
      stream.readFloat32(),
      stream.readFloat32()
    );
    section.sizeX = stream.readUint8();
    section.sizeY = stream.readUint8();
    section.sizeZ = stream.readUint8();
    section.normalsMode = stream.readUint8();

    return {
      startingSpanOffset,
      endingSpanOffset,
      dataSpanOffset
    };
  }

  private readTransfMatrix(stream: DataStream): THREE.Matrix4 {
    const matrix: number[] = [];
    for (let i = 0; i < 3; ++i) {
      matrix.push(
        stream.readFloat32(),
        stream.readFloat32(),
        stream.readFloat32(),
        stream.readFloat32()
      );
    }
    matrix.push(0, 0, 0, 1);
    return new THREE.Matrix4().fromArray(matrix).transpose();
  }

  private readSectionBodySpans(section: Section, tailer: SectionTailer, stream: DataStream): number {
    stream.seek(stream.position + tailer.startingSpanOffset);
    
    const { sizeX, sizeY, sizeZ } = section;
    
    // Read starting offsets
    const startingOffsets: number[][] = new Array(sizeY);
    for (let y = 0; y < sizeY; ++y) {
      startingOffsets[y] = new Array(sizeX);
      for (let x = 0; x < sizeX; ++x) {
        startingOffsets[y][x] = stream.readInt32();
      }
    }

    // Read ending offsets
    const endingOffsets: number[][] = new Array(sizeY);
    for (let y = 0; y < sizeY; ++y) {
      endingOffsets[y] = new Array(sizeX);
      for (let x = 0; x < sizeX; ++x) {
        endingOffsets[y][x] = stream.readInt32();
      }
    }

    // Read spans
    const spans: Span[] = section.spans = [];
    let voxelCount = 0;
    
    for (let y = 0; y < sizeY; ++y) {
      for (let x = 0; x < sizeX; ++x) {
        const span: Span = {
          x: x,
          y: y,
          voxels: this.readSpanVoxels(
            startingOffsets[y][x],
            endingOffsets[y][x],
            x,
            y,
            sizeZ,
            stream
          )
        };
        spans.push(span);
        voxelCount += span.voxels.length;
      }
    }

    return voxelCount;
  }

  private readSpanVoxels(
    startOffset: number,
    endOffset: number,
    x: number,
    y: number,
    sizeZ: number,
    stream: DataStream
  ): Voxel[] {
    if (startOffset === -1 || endOffset === -1) {
      return [];
    }

    const voxels: Voxel[] = [];
    
    for (let z = 0; z < sizeZ; ) {
      z += stream.readUint8(); // Skip count
      const voxelCount = stream.readUint8();
      
      for (let i = 0; i < voxelCount; ++i) {
        const voxel: Voxel = {
          x: x,
          y: y,
          z: z++,
          colorIndex: stream.readUint8(),
          normalIndex: stream.readUint8()
        };
        voxels.push(voxel);
      }
      
      stream.readUint8(); // Skip end count
    }

    return voxels;
  }

  fromPlain(plainObject: PlainVxlFile): VxlFile {
    this.sections = plainObject.sections.map(sectionData => 
      new Section().fromPlain(sectionData)
    );
    this.voxelCount = plainObject.voxelCount;
    return this;
  }

  toPlain(): PlainVxlFile {
    return {
      sections: this.sections.map(section => section.toPlain()),
      voxelCount: this.voxelCount
    };
  }

  getSection(index: number): Section | undefined {
    return this.sections[index];
  }
}