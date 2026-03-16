import * as THREE from "three";
import { jsx } from "@/gui/jsx/jsx";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
import { UiObject } from "@/gui/UiObject";
export type SidebarIconButtonProps = UiComponentProps & {
    image: any;
    imageFrameOffset?: number;
    palette?: any;
    x?: number;
    y?: number;
    onClick?: () => void;
    tooltip?: string;
    toggle?: boolean;
    disabled?: boolean;
};
export class SidebarIconButton extends UiComponent<SidebarIconButtonProps> {
    sprite: any;
    toggle?: boolean;
    disabled: boolean;
    handleMouseDown: () => void;
    onDocumentMouseUp: () => void;
    constructor(props: SidebarIconButtonProps) {
        super(props);
        this.toggle = this.props.toggle;
        this.disabled = !!this.props.disabled;
        this.handleMouseDown = () => {
            if (this.disabled)
                return;
            if (this.toggle === undefined) {
                this.sprite.setFrame((this.props.imageFrameOffset ?? 0) + 1);
            }
            document.addEventListener("mouseup", this.onDocumentMouseUp);
            document.addEventListener("touchend", this.onDocumentMouseUp);
            document.addEventListener("touchcancel", this.onDocumentMouseUp);
        };
        this.onDocumentMouseUp = () => {
            if (this.toggle === undefined) {
                this.sprite.setFrame((this.props.imageFrameOffset ?? 0) + 0);
            }
            document.removeEventListener("mouseup", this.onDocumentMouseUp);
            document.removeEventListener("touchend", this.onDocumentMouseUp);
            document.removeEventListener("touchcancel", this.onDocumentMouseUp);
        };
    }
    createUiObject(): UiObject {
        return new UiObject(new THREE.Object3D());
    }
    defineChildren() {
        const { image, imageFrameOffset, palette, x, y, onClick, tooltip, } = this.props;
        return jsx("sprite", {
            image,
            palette,
            x,
            y,
            frame: this.getBaseFrameNo(imageFrameOffset ?? 0),
            onClick: (e: any) => e.button === 0 && !this.disabled && onClick?.(),
            onMouseDown: this.handleMouseDown,
            tooltip,
            ref: (e: any) => (this.sprite = e),
        });
    }
    getBaseFrameNo(offset: number): number {
        return offset + (this.disabled ? 2 : this.toggle ? 1 : 0);
    }
    setToggleState(toggle: boolean) {
        if (this.toggle !== toggle) {
            this.toggle = toggle;
            this.sprite.setFrame(this.getBaseFrameNo(this.props.imageFrameOffset ?? 0));
        }
    }
    setDisabled(disabled: boolean) {
        if (disabled !== this.disabled) {
            this.disabled = disabled;
            this.sprite.setFrame(this.getBaseFrameNo(this.props.imageFrameOffset ?? 0));
        }
    }
    onDispose() {
        document.removeEventListener("mouseup", this.onDocumentMouseUp);
        document.removeEventListener("touchend", this.onDocumentMouseUp);
        document.removeEventListener("touchcancel", this.onDocumentMouseUp);
    }
}
