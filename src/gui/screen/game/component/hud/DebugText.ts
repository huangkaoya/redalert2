import * as THREE from "three";
import { jsx } from "@/gui/jsx/jsx";
import { UiObject } from "@/gui/UiObject";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { SpriteUtils } from "@/engine/gfx/SpriteUtils";
import { CanvasUtils } from "@/engine/gfx/CanvasUtils";
type ColorType = {
    r: number;
    g: number;
    b: number;
    getHexString: () => string;
};
interface DebugTextProps extends UiComponentProps {
    x?: number;
    y?: number;
    width: number;
    height: number;
    zIndex?: number;
    color: ColorType;
    text: {
        value: string;
    };
    visible: {
        value: boolean;
    };
}
export class DebugText extends UiComponent<DebugTextProps> {
    declare ctx: CanvasRenderingContext2D | null;
    declare texture: THREE.Texture;
    declare mesh: THREE.Mesh;
    declare lastUpdate?: number;
    declare lastText?: string;
    createUiObject(): UiObject {
        const obj = new UiObject(new THREE.Object3D(), new HtmlContainer());
        obj.setPosition(this.props.x || 0, this.props.y || 0);
        const width = this.props.width;
        const height = this.props.height;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        this.ctx = canvas.getContext("2d", { alpha: true });
        this.texture = this.createTexture(canvas);
        this.mesh = this.createMesh(width, height);
        return obj;
    }
    createTexture(canvas: HTMLCanvasElement): THREE.Texture {
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        texture.flipY = false;
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        return texture;
    }
    createMesh(width: number, height: number): THREE.Mesh {
        const geometry = SpriteUtils.createRectGeometry(width, height);
        SpriteUtils.addRectUvs(geometry, { x: 0, y: 0, width, height }, { width, height });
        geometry.translate(width / 2, height / 2, 0);
        const material = new THREE.MeshBasicMaterial({
            map: this.texture,
            side: THREE.DoubleSide,
            transparent: true,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        return mesh;
    }
    defineChildren() {
        return jsx("mesh", { zIndex: this.props.zIndex }, this.mesh);
    }
    onFrame(t: number) {
        if (!this.lastUpdate || t - this.lastUpdate >= 1000 / 30) {
            this.lastUpdate = t;
            const text = this.props.text.value;
            if (this.props.visible.value !== this.getUiObject().isVisible()) {
                this.getUiObject().setVisible(this.props.visible.value);
            }
            if (this.lastText !== text) {
                this.lastText = text;
                const lines = text.split(/\r?\n/g);
                this.drawLines(lines);
            }
        }
    }
    drawLines(lines: string[]) {
        if (!this.ctx)
            return;
        this.ctx.clearRect(0, 0, this.props.width, this.props.height);
        const maxLineLen = Math.floor((110 * this.props.width) / 600);
        let y = 0;
        for (const line of lines) {
            for (const wrapped of this.wrapText(line, maxLineLen)) {
                y += this.drawLine(wrapped, this.props.color, y);
            }
        }
        this.texture.needsUpdate = true;
    }
    drawLine(text: string, color: ColorType, y: number): number {
        const style = {
            fontFamily: "'Fira Sans Condensed', Arial, sans-serif",
            fontSize: 12,
            fontWeight: "400",
            paddingTop: 6,
            height: 20,
        };
        const outlineColor = 0.5 < 0.299 * color.r + 0.587 * color.g + 0.114 * color.b
            ? "black"
            : "white";
        return CanvasUtils.drawText(this.ctx!, text, 0, y, {
            color: "#" + color.getHexString(),
            outlineColor,
            outlineWidth: 2,
            ...style,
            paddingLeft: 4,
            paddingRight: 4,
        }).height;
    }
    wrapText(text: string, maxLen: number): string[] {
        const lines: string[] = [];
        while (text.length > maxLen) {
            let idx = text.slice(0, maxLen).search(/\s[^\s]*$/);
            if (idx === -1 || idx === 0)
                idx = Math.min(text.length, maxLen);
            lines.push(text.substr(0, idx));
            text = text.slice(idx);
        }
        if (text.length)
            lines.push(text);
        return lines;
    }
    onDispose() {
        (this.mesh.geometry as THREE.BufferGeometry).dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.texture.dispose();
    }
}
export default DebugText;
