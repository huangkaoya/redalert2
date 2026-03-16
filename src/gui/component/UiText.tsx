import * as THREE from "three";
import { jsx } from "@/gui/jsx/jsx";
import { UiObject } from "@/gui/UiObject";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { SpriteUtils } from "@/engine/gfx/SpriteUtils";
import { CanvasUtils } from "@/engine/gfx/CanvasUtils";
export type UiTextProps = UiComponentProps & {
    value: string;
    textAlign?: CanvasTextAlign;
    textColor: string;
    width: number;
    height: number;
    zIndex?: number;
    onClick?: () => void;
    x?: number;
    y?: number;
};
export class UiText extends UiComponent<UiTextProps> {
    declare ctx: CanvasRenderingContext2D | null;
    declare texture: THREE.Texture;
    declare mesh: THREE.Mesh;
    declare value: string;
    declare textAlign?: CanvasTextAlign;
    constructor(props: UiTextProps) {
        super(props);
        this.value = props.value;
        this.textAlign = props.textAlign;
    }
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
        this.updateTexture(this.value, this.textAlign, this.props.textColor);
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
        return jsx("mesh", { zIndex: this.props.zIndex, onClick: this.props.onClick }, this.mesh);
    }
    updateTexture(value: string, textAlign: CanvasTextAlign | undefined, textColor: string) {
        if (!this.ctx)
            return;
        this.ctx.clearRect(0, 0, this.props.width, this.props.height);
        CanvasUtils.drawText(this.ctx, value, 0, 0, {
            color: textColor,
            fontFamily: "'Fira Sans Condensed', Arial, sans-serif",
            fontSize: 12,
            fontWeight: "500",
            paddingTop: 6,
            textAlign: textAlign ?? "center",
            width: this.props.width,
            height: this.props.height,
        });
        this.texture.needsUpdate = true;
    }
    setValue(value: string) {
        if (this.value !== value) {
            this.value = value;
            this.updateTexture(value, this.textAlign, this.props.textColor);
        }
    }
    setTextAlign(textAlign: CanvasTextAlign) {
        if (textAlign !== this.textAlign) {
            this.textAlign = textAlign;
            this.updateTexture(this.value, textAlign, this.props.textColor);
        }
    }
    onDispose() {
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.texture.dispose();
    }
}
