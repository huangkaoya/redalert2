import { paletteShaderLib } from "./paletteShaderLib";
import * as THREE from 'three';
const PaletteLambertShader = {
    uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib.lambert.uniforms,
        paletteShaderLib.uniforms,
    ]),
    vertexShader: THREE.ShaderChunk.meshlambert_vert
        .replace("#include <common>", "#include <common>\n" + paletteShaderLib.instanceParsVertex)
        .replace("void main() {", "void main() {\n" + paletteShaderLib.instanceVertex),
    fragmentShader: THREE.ShaderChunk.meshlambert_frag
        .replace("#include <common>", "#include <common>\n" + paletteShaderLib.paletteColorParsFrag)
        .replace("#include <color_fragment>", "#include <color_fragment>\n" + paletteShaderLib.paletteColorFrag)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + paletteShaderLib.paletteFullLightFragment),
};
export class PaletteLambertMaterial extends THREE.MeshLambertMaterial {
    uniforms: any;
    vertexShader: string;
    fragmentShader: string;
    get palette() {
        return this.uniforms.palette.value;
    }
    set palette(value) {
        this.uniforms.palette.value = value;
    }
    get paletteOffset() {
        return this.uniforms.paletteOffsetCount.value[0];
    }
    set paletteOffset(value) {
        this.uniforms.paletteOffsetCount.value[0] = value;
    }
    get paletteCount() {
        return this.uniforms.paletteOffsetCount.value[1];
    }
    set paletteCount(value) {
        this.uniforms.paletteOffsetCount.value[1] = value;
    }
    get extraLight() {
        return this.uniforms?.extraLight.value;
    }
    set extraLight(value) {
        this.uniforms.extraLight.value = value;
    }
    constructor({ palette, paletteCount, paletteOffset, extraLight, ...options } = {}) {
        super(options);
        this.uniforms = THREE.UniformsUtils.clone(PaletteLambertShader.uniforms);
        if (palette)
            this.palette = palette;
        if (paletteCount)
            this.paletteCount = paletteCount;
        if (paletteOffset)
            this.paletteOffset = paletteOffset;
        if (extraLight)
            this.extraLight.copy(extraLight);
        this.vertexShader = PaletteLambertShader.vertexShader;
        this.fragmentShader = PaletteLambertShader.fragmentShader;
        this.type = "PaletteLambertMaterial";
    }
    copy(source: PaletteLambertMaterial): this {
        super.copy(source);
        this.fragmentShader = source.fragmentShader;
        this.vertexShader = source.vertexShader;
        this.uniforms = THREE.UniformsUtils.clone(source.uniforms);
        this.palette = source.palette;
        return this;
    }
}
