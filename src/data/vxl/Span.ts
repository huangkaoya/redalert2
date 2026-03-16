import type { Voxel } from './Voxel';
export interface Span {
    voxels: Voxel[];
    startIndex: number;
    endIndex: number;
}
