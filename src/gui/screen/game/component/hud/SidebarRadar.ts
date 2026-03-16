import * as THREE from "three";
import { jsx } from "@/gui/jsx/jsx";
import { UiObject } from "@/gui/UiObject";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { SidebarRadarAnimationRunner } from "@/gui/screen/game/component/hud/SidebarRadarAnimRunner";
type SidebarRadarProps = UiComponentProps & {
    x?: number;
    y?: number;
    zIndex?: number;
    image: any;
    palette: any;
    sidebarModel?: {
        radarEnabled?: boolean;
    };
};
export class SidebarRadar extends UiComponent<SidebarRadarProps> {
    visible: boolean = true;
    cover!: any;
    minimapContainer!: any;
    minimap?: any;
    coverOpen?: boolean;
    createUiObject() {
        const obj = new UiObject(new THREE.Object3D(), new HtmlContainer());
        obj.setPosition(this.props.x || 0, this.props.y || 0);
        return obj;
    }
    defineChildren() {
        return jsx("fragment", null, jsx("sprite", {
            image: this.props.image,
            palette: this.props.palette,
            zIndex: this.props.zIndex,
            ref: (e: any) => (this.cover = e),
            animationRunner: new SidebarRadarAnimationRunner(this.props.image),
        }), jsx("container", {
            ref: (e: any) => (this.minimapContainer = e),
            hidden: true,
            x: 13,
        }));
    }
    onFrame(now: number) {
        const obj = this.getUiObject().get3DObject();
        obj.visible = this.visible;
        const sidebarModel = this.props.sidebarModel;
        const radarEnabled = sidebarModel?.radarEnabled ?? true;
        if (radarEnabled !== this.coverOpen) {
            this.toggleCover(radarEnabled, this.coverOpen === undefined);
            this.coverOpen = radarEnabled;
        }
        const runner = this.cover.getAnimationRunner();
        if (runner.isStopped()) {
            this.minimapContainer.setVisible(this.coverOpen);
        }
    }
    toggleCover(open: boolean, instant: boolean = false) {
        const runner = this.cover.getAnimationRunner();
        if (open) {
            runner.radarOn(instant);
        }
        else {
            runner.radarOff(instant);
        }
        this.minimapContainer.setVisible(!!instant && open);
    }
    setMinimap(minimap: any) {
        if (this.minimap) {
            this.minimapContainer.remove(this.minimap);
        }
        this.minimap = minimap;
        if (minimap) {
            minimap.setFitSize(this.getMinimapAvailSpace());
            this.minimapContainer.add(minimap);
            minimap.setZIndex((this.props.zIndex || 0) + 1);
        }
    }
    getMinimapAvailSpace() {
        return {
            width: this.props.image.width - 13 - 15,
            height: this.props.image.height,
        };
    }
    hide() {
        this.visible = false;
    }
    show() {
        this.visible = true;
    }
}
