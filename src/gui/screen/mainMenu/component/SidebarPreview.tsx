import * as THREE from 'three';
import { jsx } from '../../../jsx/jsx';
import { UiComponent } from '../../../jsx/UiComponent';
import { UiObject } from '../../../UiObject';
import { HtmlContainer } from '../../../HtmlContainer';
import { MenuSdTopAnimRunner } from './MenuSdTopAnimRunner';
import { IniSection } from '../../../../data/IniSection';
import { AnimProps } from '../../../../engine/AnimProps';
import { Animation } from '../../../../engine/Animation';
import { SimpleRunner } from '../../../../engine/animation/SimpleRunner';
import { HtmlView } from '../../../jsx/HtmlView';
import { SidebarTitle } from './SidebarTitle';
import { Engine } from '../../../../engine/Engine';
import { BoxedVar } from '../../../../util/BoxedVar';
import { ShpFile } from '../../../../data/ShpFile';
interface SidebarPreviewProps {
    closed: boolean;
    preview?: any;
    title?: string;
    sdtpImg: string;
    sdtpAnimImg: ShpFile;
}
export class SidebarPreview extends UiComponent {
    private sidebarPreviewNeedsRefresh: boolean = false;
    private closed: boolean;
    private preview?: any;
    private title?: string;
    private sidebarTop?: any;
    private titleView?: any;
    private sidebarTopPreviewAnim?: any;
    private sidebarTopClosedAnim?: any;
    private previewContainer?: any;
    constructor(props: SidebarPreviewProps) {
        super(props);
        this.props = props;
        this.closed = props.closed;
        this.preview = props.preview;
        this.title = props.title;
    }
    createUiObject(): UiObject {
        let uiObject = new UiObject(new THREE.Object3D(), new HtmlContainer());
        uiObject.onFrame.subscribe((frameData) => this.handleFrame(frameData));
        return uiObject;
    }
    defineChildren(): any {
        const { sdtpImg, sdtpAnimImg } = this.props;
        const closed = this.closed;
        let preview = this.preview;
        const title = this.title || "";
        const iniSection = new IniSection("");
        let animProps = new AnimProps(iniSection, sdtpAnimImg);
        animProps.loopCount = -1;
        const animation = new Animation(animProps, new BoxedVar(Engine.UI_ANIM_SPEED));
        let runner = new SimpleRunner();
        runner.animation = animation;
        const previewSize = this.getPreviewSize();
        return jsx("fragment", null, jsx("sprite", {
            image: sdtpImg,
            palette: "shell.pal",
            frame: closed ? 0 : 1,
            ref: (element: any) => (this.sidebarTop = element),
        }), jsx(HtmlView, {
            component: SidebarTitle,
            props: { title: title },
            innerRef: (element: any) => (this.titleView = element),
            x: 25,
            y: 3,
            width: 118,
            height: this.closed ? 32 : 18,
        }), jsx("sprite", {
            image: "sdwrntmp.shp",
            palette: "shell.pal",
            hidden: true,
            ref: (element: any) => (this.sidebarTopPreviewAnim = element),
            animationRunner: new MenuSdTopAnimRunner(),
        }), jsx("sprite", {
            image: sdtpAnimImg,
            palette: "shell2.pal",
            x: 38,
            y: 48,
            hidden: !closed,
            ref: (element: any) => (this.sidebarTopClosedAnim = element),
            animationRunner: runner,
        }), jsx("container", {
            hidden: !preview || closed,
            ref: (element: any) => {
                this.previewContainer = element;
                if (preview && this.previewContainer) {
                    this.previewContainer.add(preview);
                }
            },
            x: 12,
            y: 40,
            width: previewSize.width,
            height: previewSize.height,
        }));
    }
    getPreviewSize(): {
        width: number;
        height: number;
    } {
        return { width: 146, height: 112 };
    }
    toggleSidebarPreview(show: boolean): void {
        if (this.closed !== !show) {
            let animRunner = this.sidebarTopPreviewAnim.getAnimationRunner();
            if (show) {
                animRunner.slideIn();
            }
            else {
                animRunner.slideOut();
            }
            this.closed = !show;
            this.sidebarPreviewNeedsRefresh = true;
            this.sidebarTopPreviewAnim.setVisible(true);
            (show ? this.sidebarTopClosedAnim : this.previewContainer).setVisible(false);
            this.titleView.setVisible(false);
            this.updateTitleSize();
        }
    }
    setPreview(preview: any): void {
        if (this.preview && this.previewContainer) {
            this.previewContainer.remove(this.preview);
        }
        if (preview && this.previewContainer) {
            this.previewContainer.add(preview);
        }
        this.preview = preview;
    }
    setTitle(title: string): void {
        console.log('[SidebarPreview] setTitle called with:', title);
        console.log('[SidebarPreview] titleView exists:', !!this.titleView);
        this.title = title;
        if (this.titleView) {
            console.log('[SidebarPreview] Applying title to titleView');
            this.titleView.applyOptions((options: any) => {
                console.log('[SidebarPreview] Setting options.title to:', title);
                options.title = title;
            });
            this.updateTitleSize();
        }
        else {
            console.warn('[SidebarPreview] titleView is null, cannot set title');
        }
    }
    private updateTitleSize(): void {
        if (this.titleView) {
            this.titleView.setSize(this.titleView.getSize().width, this.closed ? 32 : 18);
        }
    }
    private handleFrame(frameData: any): void {
        if (this.sidebarPreviewNeedsRefresh) {
            let animRunner = this.sidebarTopPreviewAnim.getAnimationRunner();
            if (animRunner.isStopped()) {
                (this.closed ? this.sidebarTopClosedAnim : this.previewContainer).setVisible(true);
                this.sidebarTopPreviewAnim.setVisible(false);
                this.sidebarTop.setFrame(this.closed ? 0 : 1);
                this.titleView.setVisible(true);
                this.sidebarPreviewNeedsRefresh = false;
            }
        }
    }
}
