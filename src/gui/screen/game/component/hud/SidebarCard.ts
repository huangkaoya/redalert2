import * as jsx from "@/gui/jsx/jsx";
import * as SidebarModel from "@/gui/screen/game/component/hud/viewmodel/SidebarModel";
import { SidebarItemStatus } from "@/gui/screen/game/component/hud/viewmodel/SidebarModel";
import { UiObject } from "@/gui/UiObject";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
import { OverlayUtils } from "@/engine/gfx/OverlayUtils";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { clamp } from "@/util/math";
import { ObjectArt } from "@/game/art/ObjectArt";
import { resolveSidebarItemTooltipText } from "@/gui/screen/game/TooltipTextResolver";
declare const THREE: any;
enum LabelType {
    Ready = 0,
    OnHold = 1
}
interface SidebarCardProps extends UiComponentProps {
    x?: number;
    y?: number;
    zIndex?: number;
    slots: number;
    slotSize?: {
        width: number;
        height: number;
    };
    cameoImages: any;
    cameoPalette: string;
    sidebarModel: any;
    onSlotClick?: (event: any) => void;
    textColor: string;
    cameoNameToIdMap: Map<string, number>;
    strings: any;
    persistentHoverTags?: {
        value: boolean;
    };
}
interface SlotClickEvent {
    target: any;
    button: number;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    isTouch: boolean;
    touchDuration: number;
}
export class SidebarCard extends UiComponent<SidebarCardProps> {
    static readonly MAX_QUANTITY = 99;
    static readonly labelImageCache = new Map<string, any[]>();
    static readonly quantityImageCache = new Map<string, any[]>();
    private slotContainers: any[] = [];
    private slotObjects: any[] = [];
    private progressOverlays: any[] = [];
    private visible: boolean = true;
    private labelObjects: any[] = [];
    private quantityObjects: any[] = [];
    private tagObjects: any[] = [];
    private justCreated: boolean = true;
    private lastItemCount: number = 0;
    private pagingOffset: number = 0;
    private declare slotOutline: UiObject;
    private declare labelImages: any[];
    private declare quantityImages: any[];
    private declare tagImages: any[];
    private declare tagFrameByText: Map<string, number>;
    private lastActiveTab?: any;
    private hoverSlotIndex?: number;
    constructor(props: SidebarCardProps) {
        super(props);
        this.handleWheel = (e: any) => {
            this.scrollToOffset(this.pagingOffset + (0 < e.wheelDeltaY ? 2 : -2));
        };
    }
    private handleWheel: (e: any) => void;
    createUiObject(): UiObject {
        const uiObject = new UiObject(new THREE.Object3D(), new HtmlContainer());
        uiObject.setPosition(this.props.x || 0, this.props.y || 0);
        uiObject.onFrame.subscribe(() => this.handleFrame());
        this.slotOutline = new UiObject(this.createSlotOutline());
        this.slotOutline.setVisible(false);
        this.slotOutline.setZIndex((this.props.zIndex ?? 0) + 1);
        uiObject.add(this.slotOutline);
        let labelImages = SidebarCard.labelImageCache.get(this.props.textColor);
        if (!labelImages) {
            labelImages = this.createLabelImages(this.props.textColor);
            SidebarCard.labelImageCache.set(this.props.textColor, labelImages);
        }
        this.labelImages = labelImages;
        let quantityImages = SidebarCard.quantityImageCache.get(this.props.textColor);
        if (!quantityImages) {
            quantityImages = this.createQuantityImages(this.props.textColor);
            SidebarCard.quantityImageCache.set(this.props.textColor, quantityImages);
        }
        this.quantityImages = quantityImages;
        this.tagImages = [
            this.createTextBox("", this.props.textColor, {
                fontSize: 12,
                fontWeight: "400",
                paddingTop: 2,
                paddingBottom: 2,
                paddingLeft: 2,
                paddingRight: 2,
            }),
        ];
        this.tagFrameByText = new Map();
        this.tagFrameByText.set("", 0);
        return uiObject;
    }
    defineChildren(): any[] {
        const { slots, cameoImages, cameoPalette, sidebarModel, onSlotClick, zIndex, } = this.props;
        const slotSize = this.getSlotSize();
        const horizontalSpacing = 3;
        const verticalSpacing = 2;
        const children = [];
        for (let slotIndex = 0; slotIndex < slots; slotIndex++) {
            const position = {
                x: (horizontalSpacing + slotSize.width) * (slotIndex % 2),
                y: (verticalSpacing + slotSize.height) * Math.floor(slotIndex / 2),
            };
            children.push(jsx.jsx("container", {
                x: position.x,
                y: position.y,
                zIndex: zIndex,
                ref: (element: any) => this.slotContainers.push(element),
                onWheel: this.handleWheel,
                onClick: (event: any) => {
                    const item = sidebarModel.activeTab.items[this.getItemIndexAtSlot(slotIndex)];
                    if (item && !item.disabled) {
                        onSlotClick?.(this.createSlotClickEvent(item, event));
                    }
                },
                onMouseEnter: () => {
                    const item = sidebarModel.activeTab.items[this.getItemIndexAtSlot(slotIndex)];
                    if (item) {
                        if (!item.disabled) {
                            this.slotOutline.setPosition(position.x, position.y);
                        }
                        this.slotOutline.setVisible(!item.disabled);
                        this.hoverSlotIndex = slotIndex;
                    }
                },
                onMouseLeave: () => {
                    if (this.hoverSlotIndex === slotIndex) {
                        this.slotOutline.setVisible(false);
                        this.hoverSlotIndex = undefined;
                    }
                },
            }, jsx.jsx("sprite", {
                image: "gclock2.shp",
                palette: "sidebar.pal",
                zIndex: 1,
                frame: 0,
                opacity: 0.5,
                transparent: true,
                ref: (element: any) => this.progressOverlays.push(element),
            }), jsx.jsx("sprite", {
                images: this.tagImages,
                zIndex: 0.5,
                x: slotSize.width / 2,
                y: slotSize.height / 2,
                transparent: true,
                ref: (element: any) => this.tagObjects.push(element),
            }), jsx.jsx("sprite", {
                images: this.labelImages,
                zIndex: 2,
                x: slotSize.width / 2,
                transparent: true,
                ref: (element: any) => this.labelObjects.push(element),
            }), jsx.jsx("sprite", {
                images: this.quantityImages,
                zIndex: 2,
                x: slotSize.width,
                alignX: 1,
                alignY: -1,
                transparent: true,
                ref: (element: any) => this.quantityObjects.push(element),
            }), jsx.jsx("sprite", {
                image: cameoImages,
                palette: cameoPalette,
                ref: (element: any) => this.slotObjects.push(element),
            })));
        }
        return children;
    }
    createSlotClickEvent(item: any, event: any): SlotClickEvent {
        return {
            target: item.target,
            button: event.button,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            isTouch: event.isTouch,
            touchDuration: event.touchDuration,
        };
    }
    handleFrame(): void {
        const { sidebarModel, slots } = this.props;
        const obj3D = this.getUiObject().get3DObject();
        obj3D.visible = this.visible;
        if (this.justCreated ||
            sidebarModel.activeTab.needsUpdate ||
            this.lastActiveTab !== sidebarModel.activeTab) {
            this.justCreated = false;
            const itemCount = sidebarModel.activeTab.items.length;
            if (this.lastActiveTab !== sidebarModel.activeTab ||
                this.lastItemCount !== itemCount) {
                if (this.lastItemCount > itemCount) {
                    this.pagingOffset = 0;
                }
                this.lastItemCount = itemCount;
            }
            this.lastActiveTab = sidebarModel.activeTab;
            sidebarModel.activeTab.needsUpdate = false;
            this.updateSlots(sidebarModel.activeTab.items, slots);
        }
    }
    updateSlots(items: any[], slotCount: number): void {
        for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
            const item = items[this.getItemIndexAtSlot(slotIndex)];
            const slotObject = this.slotObjects[slotIndex];
            const progressOverlay = this.progressOverlays[slotIndex];
            const labelObject = this.labelObjects[slotIndex];
            const quantityObject = this.quantityObjects[slotIndex];
            const tagObject = this.tagObjects[slotIndex];
            if (items.length - this.pagingOffset <= slotIndex) {
                slotObject.get3DObject().visible = false;
                progressOverlay.get3DObject().visible = false;
                labelObject.get3DObject().visible = false;
                quantityObject.get3DObject().visible = false;
                tagObject.get3DObject().visible = false;
            }
            else {
                this.updateCameo(item, slotObject);
                this.updatePersistentTag(item, tagObject);
                this.updateProgressOverlay(item, progressOverlay);
                this.updateStatusText(item, labelObject);
                this.updateQuantities(item, quantityObject);
                this.updateTooltip(item, this.slotContainers[slotIndex]);
            }
        }
    }
    updateCameo(item: any, slotObject: any): void {
        const cameoNameToIdMap = this.props.cameoNameToIdMap;
        let cameoName = item.cameo + ".shp";
        let frameId = cameoNameToIdMap.get(cameoName);
        if (frameId === undefined) {
            cameoName = (ObjectArt as any).MISSING_CAMEO + ".shp";
            frameId = cameoNameToIdMap.get(cameoName);
        }
        if (frameId === undefined) {
            throw new Error(`Missing cameo placeholder image "${(ObjectArt as any).MISSING_CAMEO}.shp"`);
        }
        slotObject.setFrame(frameId);
        slotObject.get3DObject().visible = true;
        slotObject.setLightMult(item.disabled ? 0.5 : 1);
    }
    updateProgressOverlay(item: any, progressOverlay: any): void {
        let frame = 0;
        if ([SidebarItemStatus.Started, SidebarItemStatus.OnHold].includes(item.status)) {
            const frameCount = progressOverlay.getFrameCount();
            frame = Math.max(1, Math.ceil(item.progress * (frameCount - 1))) % frameCount;
        }
        progressOverlay.setFrame(frame);
        progressOverlay.get3DObject().visible = frame > 0;
    }
    updateStatusText(item: any, labelObject: any): void {
        const isVisible = [SidebarItemStatus.Ready, SidebarItemStatus.OnHold].includes(item.status);
        if (!labelObject || !labelObject.get3DObject)
            return;
        labelObject.get3DObject().visible = isVisible;
        if (typeof labelObject.setFrame !== 'function' || typeof labelObject.setPosition !== 'function')
            return;
        const labelAlign = (labelObject as any).builder?.setAlign ? (labelObject as any).builder.setAlign.bind((labelObject as any).builder) : undefined;
        const slotSize = this.getSlotSize();
        if (item.status === SidebarItemStatus.Ready) {
            labelObject.setFrame(LabelType.Ready);
            labelObject.setPosition(slotSize.width / 2, labelObject.getPosition().y);
            if (labelAlign)
                labelAlign(0, -1);
        }
        else if (item.status === SidebarItemStatus.OnHold) {
            labelObject.setFrame(LabelType.OnHold);
            const xPos = item.quantity > 1 ? 0 : slotSize.width / 2;
            labelObject.setPosition(xPos, labelObject.getPosition().y);
            if (labelAlign)
                labelAlign(item.quantity > 1 ? -1 : 0, -1);
        }
    }
    updateQuantities(item: any, quantityObject: any): void {
        const threshold = item.status === SidebarItemStatus.InQueue ? 0 : 1;
        if (item.quantity > threshold) {
            const frame = item.quantity > SidebarCard.MAX_QUANTITY
                ? SidebarCard.MAX_QUANTITY
                : item.quantity - 1;
            if (quantityObject && typeof quantityObject.setFrame === 'function') {
                quantityObject.setFrame(frame);
            }
            quantityObject?.setVisible?.(true);
            if (quantityObject && !quantityObject.setVisible && quantityObject.get3DObject) {
                const obj = quantityObject.get3DObject();
                if (obj)
                    obj.visible = true;
            }
        }
        else {
            quantityObject?.setVisible?.(false);
            if (quantityObject && !quantityObject.setVisible && quantityObject.get3DObject) {
                const obj = quantityObject.get3DObject();
                if (obj)
                    obj.visible = false;
            }
        }
    }
    updateTooltip(item: any, container: any): void {
        const tooltip = resolveSidebarItemTooltipText(item, this.props.sidebarModel, this.props.strings);
        container.setTooltip(tooltip);
    }
    ensureTagFrame(text?: string): number {
        const resolvedText = text ?? "";
        const existingFrame = this.tagFrameByText.get(resolvedText);
        if (existingFrame !== undefined) {
            return existingFrame;
        }
        const frame = this.tagImages.length;
        const image = this.createTextBox(resolvedText, this.props.textColor, {
            fontSize: 12,
            fontWeight: "400",
            paddingTop: 2,
            paddingBottom: 2,
            paddingLeft: 2,
            paddingRight: 2,
        });
        this.tagImages = [...this.tagImages, image];
        this.tagFrameByText.set(resolvedText, frame);
        this.tagObjects.forEach((tagObject) => {
            const builder = tagObject?.builder as any;
            if (!builder) {
                return;
            }
            const currentFrame = builder.getFrame?.() ?? 0;
            builder.images = this.tagImages;
            builder.atlas = undefined;
            builder.initTexture?.();
            builder.frameGeometries?.forEach((geometry: any) => geometry.dispose());
            builder.frameGeometries?.clear?.();
            if (builder.mesh) {
                if (builder.mesh.material) {
                    builder.mesh.material.map = builder.atlas?.getTexture?.();
                    builder.mesh.material.needsUpdate = true;
                }
                builder.frameNo = -1;
                builder.setFrame(Math.min(currentFrame, builder.frameCount - 1));
            }
        });
        return frame;
    }
    updatePersistentTag(item: any, tagObject: any): void {
        if (!tagObject) {
            return;
        }
        if (!this.props.persistentHoverTags?.value) {
            tagObject.setVisible(false);
            return;
        }
        const tooltip = resolveSidebarItemTooltipText(item, this.props.sidebarModel, this.props.strings);
        if (!tooltip) {
            tagObject.setVisible(false);
            return;
        }
        const frame = this.ensureTagFrame(tooltip);
        tagObject.setFrame(frame);
        tagObject.setVisible(true);
    }
    getItemIndexAtSlot(slotIndex: number): number {
        return slotIndex + this.pagingOffset;
    }
    getCameoSize(): {
        width: number;
        height: number;
    } {
        return {
            width: this.props.cameoImages.width,
            height: this.props.cameoImages.height,
        };
    }
    getSlotSize(): {
        width: number;
        height: number;
    } {
        return this.props.slotSize ?? this.getCameoSize();
    }
    createSlotOutline(): any {
        const slotSize = this.getSlotSize();
        const width = slotSize.width;
        const height = slotSize.height;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array([
            0, 0, 0,
            0, height, 0,
            width, height, 0,
            width, 0, 0,
            0, 0, 0,
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.LineBasicMaterial({
            color: this.props.textColor,
            transparent: true,
            side: THREE.DoubleSide,
        });
        return new THREE.Line(geometry, material);
    }
    hide(): void {
        this.visible = false;
    }
    show(): void {
        this.visible = true;
    }
    scrollToOffset(offset: number): boolean {
        const oldOffset = this.pagingOffset;
        const maxOffset = Math.max(0, this.props.sidebarModel.activeTab.items.length - this.props.slots);
        this.pagingOffset = clamp(offset, 0, maxOffset);
        if (this.pagingOffset % 2) {
            this.pagingOffset++;
        }
        this.updateSlots(this.props.sidebarModel.activeTab.items, this.props.slots);
        return oldOffset !== this.pagingOffset;
    }
    pageDown(): boolean {
        return this.scrollToOffset(this.pagingOffset + this.props.slots);
    }
    pageUp(): boolean {
        return this.scrollToOffset(this.pagingOffset - this.props.slots);
    }
    createLabelImages(textColor: string): any[] {
        const labels = [
            { text: this.props.strings.get("TXT_READY"), type: LabelType.Ready },
            { text: this.props.strings.get("TXT_HOLD"), type: LabelType.OnHold },
        ];
        return labels.map((label) => this.createTextBox(label.text, textColor));
    }
    createQuantityImages(textColor: string): any[] {
        const style = { paddingRight: 2 };
        const images = new Array(SidebarCard.MAX_QUANTITY)
            .fill(0)
            .map((_, index) => this.createTextBox("" + (index + 1), textColor, style));
        images.push(this.createTextBox("∞", textColor, style));
        return images;
    }
    createTextBox(text: string, color: string, additionalStyle?: any): any {
        const style = {
            color,
            backgroundColor: "rgba(0, 0, 0, .5)",
            fontFamily: "'Fira Sans Condensed', Arial, sans-serif",
            fontSize: 12,
            fontWeight: "500",
            paddingTop: 5,
            paddingBottom: 5,
            paddingLeft: 2,
            paddingRight: 4,
            ...additionalStyle,
        };
        if (typeof text === "string" && text.includes("\n")) {
            const lines = text.split(/\r?\n/);
            const fontSize = Math.max(1, style.fontSize ?? 12);
            const lineSpacing = 2;
            const canvas = document.createElement("canvas");
            const alphaContext = canvas.getContext("2d", {
                alpha: !style.backgroundColor || !!style.backgroundColor.match(/^rgba/),
            });
            if (!alphaContext) {
                throw new Error("Failed to create sidebar tag canvas context");
            }
            alphaContext.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
            let maxWidth = 0;
            const capHeight = alphaContext.measureText("A");
            const lineHeight = Math.ceil(capHeight.actualBoundingBoxAscent + capHeight.actualBoundingBoxDescent || fontSize * 1.2);
            for (const line of lines) {
                const metrics = alphaContext.measureText(line);
                maxWidth = Math.max(maxWidth, Math.ceil(Math.max(metrics.width, Math.abs(metrics.actualBoundingBoxLeft || 0) +
                    Math.abs(metrics.actualBoundingBoxRight || 0))));
            }
            const paddingLeft = style.paddingLeft ?? 0;
            const paddingRight = style.paddingRight ?? 0;
            const paddingTop = style.paddingTop ?? 0;
            const paddingBottom = style.paddingBottom ?? 0;
            const textHeight = lines.length * lineHeight + Math.max(0, lines.length - 1) * lineSpacing;
            canvas.width = Math.max(1, maxWidth + paddingLeft + paddingRight);
            canvas.height = Math.max(1, textHeight + paddingTop + paddingBottom);
            const context = canvas.getContext("2d", {
                alpha: !style.backgroundColor || !!style.backgroundColor.match(/^rgba/),
            });
            if (!context) {
                throw new Error("Failed to create sidebar tag render context");
            }
            if (style.backgroundColor) {
                context.fillStyle = style.backgroundColor;
                context.fillRect(0, 0, canvas.width, canvas.height);
            }
            context.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
            context.fillStyle = style.color;
            context.textAlign = "center";
            context.textBaseline = "top";
            const centerX = canvas.width / 2;
            const topY = (canvas.height - textHeight) / 2;
            const maxTextWidth = Math.max(1, canvas.width - paddingLeft - paddingRight);
            for (let index = 0; index < lines.length; index += 1) {
                context.fillText(lines[index], centerX + 0.5, topY + index * (lineHeight + lineSpacing) + 0.5, maxTextWidth);
            }
            return canvas;
        }
        return OverlayUtils.createTextBox(text, style);
    }
}
