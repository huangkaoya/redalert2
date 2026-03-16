import * as THREE from "three";
import { jsx } from "@/gui/jsx/jsx";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
import { UiObject } from "@/gui/UiObject";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { SpriteUtils } from "@/engine/gfx/SpriteUtils";
type GameMenuContentAreaProps = UiComponentProps & {
    viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    screenSize: {
        width: number;
        height: number;
    };
    images: Map<string, any>;
    innerRef?: any;
    hidden?: boolean;
};
export class GameMenuContentArea extends UiComponent<GameMenuContentAreaProps> {
    createUiObject({ viewport, hidden }: GameMenuContentAreaProps): UiObject {
        const obj = new UiObject(new THREE.Object3D(), new HtmlContainer());
        obj.setPosition(viewport.x, viewport.y);
        obj.getHtmlContainer().setSize(viewport.width, viewport.height);
        obj.setVisible(!hidden);
        return obj;
    }
    defineChildren() {
        const { viewport, screenSize, images, innerRef, } = this.props;
        let size = "lg";
        if (screenSize.width < 1024 || screenSize.height < 768)
            size = "md";
        if (screenSize.width < 800 || screenSize.height < 600)
            size = "sm";
        const bkgd = images.get(`bkgd${size}.shp`);
        const x = bkgd ? (viewport.width - bkgd.width) / 2 : 0;
        const y = bkgd ? (viewport.height - bkgd.height) / 2 : 0;
        const width = (bkgd || viewport).width;
        const height = (bkgd || viewport).height;
        return jsx("fragment", null, jsx("mesh", null, this.createMask(viewport)), jsx("container", { zIndex: 1, x, y, width, height, ref: innerRef }, bkgd && jsx("sprite", { image: bkgd, palette: "uibkgd.pal" })));
    }
    createMask(viewport: {
        width: number;
        height: number;
    }) {
        const geometry = SpriteUtils.createRectGeometry(viewport.width, viewport.height);
        geometry.translate(viewport.width / 2, viewport.height / 2, 0);
        const material = new THREE.MeshBasicMaterial({
            color: 0,
            opacity: 0.75,
            transparent: true,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        return mesh;
    }
}
export default GameMenuContentArea;
