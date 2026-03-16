import * as THREE from "three";
import { jsx } from "@/gui/jsx/jsx";
import { UiObject } from "@/gui/UiObject";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
type TabImage = {
    width: number;
    height: number;
};
type Tab = {
    disabled: boolean;
    flashing?: boolean;
};
type SidebarTabsProps = UiComponentProps & {
    aggregatedImageData: {
        file: any;
        imageIndexes: Map<TabImage, number>;
    };
    images: TabImage[];
    palette: any;
    tabSpacing: number;
    onTabClick?: (tab: Tab) => void;
    sidebarModel: {
        tabs: Tab[];
        activeTab: Tab;
    };
    strings: {
        get: (key: string) => string;
    };
};
export class SidebarTabs extends UiComponent<SidebarTabsProps> {
    tabObjects: any[] = [];
    flashing: boolean = false;
    lastFlashUpdate?: number;
    constructor(props: SidebarTabsProps) {
        super(props);
        this.tabObjects = [];
        this.flashing = false;
    }
    createUiObject() {
        const obj = new UiObject(new THREE.Object3D());
        obj.setPosition(this.props.x || 0, this.props.y || 0);
        return obj;
    }
    defineChildren() {
        const { aggregatedImageData, images, palette, tabSpacing, onTabClick, sidebarModel, strings, } = this.props;
        const children = [];
        for (let c = 0; c < 4; c++) {
            const img = images[c];
            const frameIndex = aggregatedImageData.imageIndexes.get(img);
            if (frameIndex === undefined) {
                throw new Error(`Tab ${c} image not found in aggregated file`);
            }
            children.push(jsx("sprite", {
                image: aggregatedImageData.file,
                palette: palette,
                x: (tabSpacing + img.width) * c,
                tooltip: strings.get("Tip:Tab" + (c + 1)),
                onClick: (e: MouseEvent) => {
                    if (e.button === 0) {
                        const tab = sidebarModel.tabs[c];
                        if (!tab.disabled) {
                            onTabClick?.(tab);
                        }
                    }
                },
                onFrame: (now: number, sprite: any) => this.handleFrame(now, sprite, sidebarModel.tabs[c], frameIndex),
            }));
        }
        return children;
    }
    handleFrame(now: number, sprite: {
        setFrame?: (frame: number) => void;
        get3DObject?: () => any;
    }, tab: Tab, baseFrame: number) {
        if (!this.lastFlashUpdate || now - this.lastFlashUpdate >= 250) {
            this.lastFlashUpdate = now;
            this.flashing = !this.flashing;
        }
        let state: number;
        if (tab.disabled) {
            state = 2;
        }
        else if (this.props.sidebarModel.activeTab === tab) {
            state = 1;
        }
        else {
            state = 0;
        }
        if (tab.flashing && this.flashing) {
            state = 3;
        }
        if (sprite && typeof sprite.setFrame === 'function') {
            sprite.setFrame(baseFrame + state);
        }
    }
}
