import { VxlBatchedBuilder } from "./VxlBatchedBuilder";
import { VxlNonBatchedBuilder } from "./VxlNonBatchedBuilder";
import { VxlGeometryPool } from "./vxlGeometry/VxlGeometryPool";
import { Camera } from "three";
import { VxlFile } from "@/data/VxlFile";
import { HvaFile } from "@/data/HvaFile";
import { Palette } from "@/data/Palette";
import { VxlBuilder } from "./VxlBuilder";
export class VxlBuilderFactory {
    constructor(private vxlGeometryPool: VxlGeometryPool, private useBatching: boolean, private camera: Camera) { }
    create(vxlData: VxlFile, hvaData: HvaFile | undefined, palettes: Palette[], palette: Palette): VxlBuilder {
        return this.useBatching
            ? new VxlBatchedBuilder(vxlData, hvaData, palettes, palette, this.vxlGeometryPool, this.camera)
            : new VxlNonBatchedBuilder(vxlData, palette, hvaData ?? null, this.vxlGeometryPool, this.camera);
    }
}
