import { paletteShaderLib } from "./paletteShaderLib";
import * as THREE from 'three';
const PaletteBasicShader = {
    uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib.basic.uniforms,
        paletteShaderLib.uniforms,
    ]),
    vertexShader: THREE.ShaderChunk.meshbasic_vert
        .replace("#include <common>", "#include <common>\n" +
        [
            paletteShaderLib.instanceParsVertex,
            paletteShaderLib.paletteColorParsVertex,
            paletteShaderLib.vertexColorMultParsVertex,
        ].join("\n"))
        .replace("void main() {", "void main() {\n" +
        [
            paletteShaderLib.instanceVertex,
            paletteShaderLib.paletteColorVertex,
            paletteShaderLib.vertexColorMultVertex,
        ].join("\n")),
    fragmentShader: THREE.ShaderChunk.meshbasic_frag
        .replace("#include <common>", "#include <common>\n" +
        [
            paletteShaderLib.paletteColorParsFrag,
            paletteShaderLib.vertexColorMultParsFrag,
        ].join("\n"))
        .replace("#include <color_fragment>", "#include <color_fragment>\n" +
        [
            paletteShaderLib.paletteColorFrag,
            paletteShaderLib.paletteBasicLightFragment,
            paletteShaderLib.vertexColorMultFrag,
        ].join("\n")),
};
export class PaletteBasicMaterial extends THREE.MeshBasicMaterial {
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
        return this.uniforms.extraLight.value;
    }
    set extraLight(value) {
        this.uniforms.extraLight.value = value;
    }
    set useVertexColorMult(value) {
        if (value) {
            this.defines = this.defines || {};
            this.defines.USE_VERTEX_COLOR_MULT = "";
        }
        else if (this.defines) {
            delete this.defines.USE_VERTEX_COLOR_MULT;
        }
    }
    constructor({ palette, paletteCount, paletteOffset, extraLight, useVertexColorMult, flatShading, useRedIndex, ...options }: any = {}) {
        if (options.side === undefined) {
            options.side = THREE.DoubleSide;
        }
        super(options);
        this.uniforms = THREE.UniformsUtils.clone(PaletteBasicShader.uniforms);
        if (palette) {
            this.palette = palette;
        }
        if (paletteCount) {
            this.paletteCount = paletteCount;
        }
        if (paletteOffset) {
            this.paletteOffset = paletteOffset;
        }
        if (extraLight) {
            this.extraLight.copy(extraLight);
        }
        if (useVertexColorMult) {
            this.useVertexColorMult = useVertexColorMult;
        }
        this.vertexShader = PaletteBasicShader.vertexShader;
        this.fragmentShader = PaletteBasicShader.fragmentShader;
        if (useRedIndex) {
            this.defines = this.defines || {};
            this.defines.USE_RED_INDEX = '';
        }
        this.type = "PaletteBasicMaterial";
        this.onBeforeCompile = (shader: any) => {
            shader.uniforms = THREE.UniformsUtils.merge([shader.uniforms, this.uniforms]);
            shader.vertexShader = this.vertexShader;
            shader.fragmentShader = this.fragmentShader;
            this.userData.lastCompiledShader = {
                vertexShader: shader.vertexShader,
                fragmentShader: shader.fragmentShader,
                uniforms: Object.keys(shader.uniforms),
            };
            console.log('[PaletteBasicMaterial] compiled', {
                type: this.type,
                hasMap: !!this.map,
                defines: this.defines,
                hasColorFragmentInclude: shader.fragmentShader.includes('#include <color_fragment>'),
                hasPaletteColorIndex: shader.fragmentShader.includes('paletteColorIndex'),
            });
        };
        this.needsUpdate = true;
    }
    copy(source) {
        super.copy(source);
        this.fragmentShader = source.fragmentShader;
        this.vertexShader = source.vertexShader;
        this.uniforms = THREE.UniformsUtils.clone(source.uniforms);
        this.palette = source.palette;
        return this;
    }
}
