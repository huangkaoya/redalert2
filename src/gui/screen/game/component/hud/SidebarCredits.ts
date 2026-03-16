import * as THREE from "three";
import { jsx } from "@/gui/jsx/jsx";
import { UiObject } from "@/gui/UiObject";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { UiText } from "@/gui/component/UiText";
type SidebarModel = {
    credits: number;
    topTextLeftAlign: boolean;
};
type SidebarCreditsProps = UiComponentProps & {
    textColor: string;
    width: number;
    height: number;
    zIndex?: number;
    sidebarModel: SidebarModel;
    onTick: (direction: "up" | "down") => void;
};
export class SidebarCredits extends UiComponent<SidebarCreditsProps> {
    text!: UiText;
    targetCredits?: number;
    renderedCredits?: number;
    tickSpeed?: number;
    lastUpdate?: number;
    lastLeftAligned?: boolean;
    createUiObject(): UiObject {
        return new UiObject(new THREE.Object3D(), new HtmlContainer());
    }
    defineChildren() {
        const { textColor, width, height, zIndex } = this.props;
        return jsx(UiText, {
            ref: (e: UiText) => (this.text = e),
            value: "",
            textColor,
            width,
            height,
            zIndex,
        });
    }
    onFrame(now: number) {
        const { sidebarModel: { credits, topTextLeftAlign }, } = this.props;
        if (this.targetCredits !== credits) {
            this.targetCredits = credits;
            const diff = Math.abs(credits - (this.renderedCredits ?? 0));
            const t = Math.min(1, diff / 5000);
            const duration = 300 + (2000 - 300) * t;
            this.tickSpeed = diff / duration;
        }
        const tickSpeed = this.tickSpeed ?? 0;
        if (!this.lastUpdate || now - this.lastUpdate >= 50) {
            let delta = this.lastUpdate ? now - this.lastUpdate : 0;
            this.lastUpdate = now;
            if (this.renderedCredits !== credits) {
                if (this.renderedCredits === undefined) {
                    this.renderedCredits = 0;
                }
                else {
                    let diff = credits - this.renderedCredits;
                    let step = tickSpeed * delta;
                    if (Math.abs(diff) >= step) {
                        this.renderedCredits += Math.sign(diff) * step;
                    }
                    else {
                        this.renderedCredits += diff;
                    }
                    this.props.onTick(Math.sign(diff) === 1 ? "up" : "down");
                }
                this.text.setValue("" + Math.floor(this.renderedCredits!));
            }
            if (topTextLeftAlign !== this.lastLeftAligned) {
                if (topTextLeftAlign) {
                    this.text.setTextAlign("left");
                    this.text.getUiObject().setPosition(15, 0);
                }
                else {
                    this.text.setTextAlign("center");
                    this.text.getUiObject().setPosition(0, 0);
                }
                this.lastLeftAligned = topTextLeftAlign;
            }
        }
    }
}
export default SidebarCredits;
