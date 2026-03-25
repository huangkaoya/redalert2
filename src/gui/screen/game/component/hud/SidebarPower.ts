import * as THREE from "three";
import { jsx } from "@/gui/jsx/jsx";
import { UiObject } from "@/gui/UiObject";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { IndexedBitmap } from "@/data/Bitmap";
import { SpriteUtils } from "@/engine/gfx/SpriteUtils";
import { clamp } from "@/util/math";
import { TextureUtils } from "@/engine/gfx/TextureUtils";
import { HighlightAnimRunner } from "@/engine/renderable/entity/HighlightAnimRunner";
import { BoxedVar } from "@/util/BoxedVar";
import { findReverse } from "@/util/array";
import { PaletteBasicMaterial } from "@/engine/gfx/material/PaletteBasicMaterial";
type SidebarPowerModel = {
    powerDrained: number;
    powerGenerated: number;
};
type SidebarPowerProps = UiComponentProps & {
    x?: number;
    y?: number;
    zIndex?: number;
    height: number;
    powerImg: any;
    palette: any;
    strings: any;
    sidebarModel: SidebarPowerModel;
};
type PipCount = {
    red: number;
    yellow: number;
    green: number;
};
enum PipType {
    None = 0,
    Green = 1,
    Yellow = 2,
    Red = 3,
    Highlight = 4
}
function pipCountEquals(a: PipCount, b: PipCount): boolean {
    return a.green === b.green && a.yellow === b.yellow && a.red === b.red;
}
export class SidebarPower extends UiComponent<SidebarPowerProps> {
    visible: boolean = true;
    declare pipHighlightAnimRunner: HighlightAnimRunner;
    declare pips: IndexedBitmap[];
    declare textureBitmap: IndexedBitmap;
    declare texture: THREE.DataTexture;
    declare mesh: THREE.Mesh;
    declare meshEvtTarget: any;
    declare pipCount?: PipCount;
    declare targetPipCount: PipCount;
    declare lastPipUpdate?: number;
    declare lastPowerDrained?: number;
    declare lastPowerGenerated?: number;
    constructor(props: SidebarPowerProps) {
        super(props);
        this.pipHighlightAnimRunner = new HighlightAnimRunner(new BoxedVar(1), 1, 2, 15);
    }
    createUiObject(): UiObject {
        const obj = new UiObject(new THREE.Object3D(), new HtmlContainer());
        obj.setPosition(this.props.x || 0, this.props.y || 0);
        this.pips = this.createPips(this.props.powerImg);
        const width = this.props.powerImg.width;
        const height = this.props.height;
        this.textureBitmap = new IndexedBitmap(width, height);
        this.texture = this.createDataTexture(this.textureBitmap.data, width, height);
        this.mesh = this.createMesh(width, height);
        return obj;
    }
    createPips(powerImg: any): IndexedBitmap[] {
        const arr: IndexedBitmap[] = [];
        if (!powerImg || typeof powerImg.numImages !== "number")
            return arr;
        for (let i = 0; i < powerImg.numImages; i++) {
            const img = powerImg.getImage(i);
            if (!img)
                continue;
            arr.push(new IndexedBitmap(img.width, img.height, img.imageData));
        }
        return arr;
    }
    createDataTexture(data: Uint8Array, width: number, height: number): THREE.DataTexture {
        const tex = new THREE.DataTexture(data, width, height, THREE.RedFormat);
        tex.needsUpdate = true;
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        (tex as THREE.Texture & {
            colorSpace: THREE.ColorSpace;
        }).colorSpace = THREE.NoColorSpace;
        return tex;
    }
    createMesh(width: number, height: number): THREE.Mesh {
        const geometry = SpriteUtils.createRectGeometry(width, height);
        SpriteUtils.addRectUvs(geometry, { x: 0, y: 0, width, height }, { width, height });
        geometry.translate(width / 2, height / 2, 0);
        const material = new PaletteBasicMaterial({
            map: this.texture,
            palette: TextureUtils.textureFromPalette(this.props.palette),
            side: THREE.DoubleSide,
            useRedIndex: true,
        } as any);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        return mesh;
    }
    defineChildren() {
        return jsx("mesh", {
            zIndex: this.props.zIndex,
            ref: (e: any) => (this.meshEvtTarget = e),
            onClick: () => { },
        }, this.mesh);
    }
    onFrame(now: number) {
        const obj = this.getUiObject().get3DObject();
        obj.visible = this.visible;
        const { powerDrained, powerGenerated } = this.props.sidebarModel;
        let changed = false;
        if (this.lastPowerDrained !== powerDrained ||
            this.lastPowerGenerated !== powerGenerated) {
            this.lastPowerDrained = powerDrained;
            this.lastPowerGenerated = powerGenerated;
            this.meshEvtTarget.setTooltip(this.props.strings.get("TXT_POWER_DRAIN", powerGenerated, powerDrained));
            const c = Math.max(powerGenerated, powerDrained);
            const a = c ? Math.min(1, powerDrained / c) : 1;
            const l = c
                ? Math.min(1, clamp(powerGenerated - powerDrained, 0, 100) / c)
                : 0;
            const hasPips = Array.isArray(this.pips) && this.pips.length > 0;
            const pipHeight = hasPips ? this.pips[0].height + 1 : 1;
            const n = c
                ? this.computeHeightFromPowerLevel(Math.max(100, c))
                : 1;
            this.targetPipCount = {
                green: Math.floor(((1 - a - l) * n) / pipHeight),
                yellow: Math.floor((l * n) / pipHeight),
                red: c ? Math.floor((a * n) / pipHeight) : 1,
            };
            this.pipHighlightAnimRunner.animation.stop();
            changed = true;
        }
        const target = this.targetPipCount;
        const pipCountUnchanged = this.pipCount && pipCountEquals(this.pipCount, target);
        if (!this.lastPipUpdate ||
            now - this.lastPipUpdate >= 50 ||
            !pipCountUnchanged) {
            this.lastPipUpdate = now;
            if (this.pipCount) {
                const dRed = Math.sign(target.red - this.pipCount.red);
                const dYellow = Math.sign(target.yellow - this.pipCount.yellow);
                const dGreen = Math.sign(target.green - this.pipCount.green);
                if (dRed) {
                    if (dRed > 0) {
                        if (this.pipCount.yellow > dRed) {
                            this.pipCount.yellow = Math.max(0, this.pipCount.yellow - dRed);
                        }
                        else {
                            this.pipCount.green = Math.max(0, this.pipCount.green - dRed);
                        }
                    }
                }
                else {
                    if (dYellow) {
                        if (dYellow > 0) {
                            this.pipCount.green = Math.max(0, this.pipCount.green - dYellow);
                        }
                    }
                    else {
                        this.pipCount.green += dGreen;
                    }
                    this.pipCount.yellow += dYellow;
                }
                this.pipCount.red += dRed;
            }
            else {
                this.pipCount = { red: 1, yellow: 0, green: 0 };
            }
            this.updateTexture(this.pipCount, true);
            if (pipCountEquals(this.pipCount, target)) {
                this.pipHighlightAnimRunner.animate(10);
            }
        }
        if (pipCountUnchanged) {
            if (changed)
                this.pipHighlightAnimRunner.animate(10);
            if (this.pipHighlightAnimRunner.shouldUpdate()) {
                const prev = !!this.pipHighlightAnimRunner.getValue();
                this.pipHighlightAnimRunner.tick(now);
                const curr = !!this.pipHighlightAnimRunner.getValue();
                if (curr !== prev) {
                    this.updateTexture(this.pipCount!, curr);
                }
            }
        }
    }
    computeHeightFromPowerLevel(power: number): number {
        return (clamp((Math.log10((power / 100 + 5) / 5e7) / (power / 100 + 3) + 2) / 2, 0, 1) * this.props.height);
    }
    updateTexture(pipCount: PipCount, highlight: boolean) {
        if (!this.pips || this.pips.length === 0) {
            return;
        }
        const pipHeight = this.pips[0].height;
        const totalHeight = this.props.height;
        const pipStep = pipHeight + 1;
        let layers: [
            number,
            number,
            number
        ][][] = [
            [[PipType.None, Math.floor(totalHeight / pipHeight), pipHeight]],
            [
                [PipType.Red, pipCount.red, pipStep],
                [PipType.Yellow, pipCount.yellow, pipStep],
                [PipType.Green, pipCount.green, pipStep],
            ],
        ];
        if (highlight) {
            const last = findReverse(layers[1], ([, count]) => count > 0);
            if (last)
                last[1]--;
            layers[1].push([PipType.Highlight, 1, pipStep]);
        }
        for (const layer of layers) {
            let y = totalHeight - pipHeight;
            for (const [type, count, step] of layer) {
                const pip = this.pips[type];
                for (let i = 0; i < count; i++) {
                    this.textureBitmap.drawIndexedImage(pip, 0, y);
                    y -= step;
                }
            }
        }
        this.texture.needsUpdate = true;
    }
    hide() {
        this.visible = false;
    }
    show() {
        this.visible = true;
    }
    onDispose() {
        this.mesh.geometry.dispose();
        (this.mesh.material as any).dispose();
        this.texture.dispose();
    }
}
export default SidebarPower;
