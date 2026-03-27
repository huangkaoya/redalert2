import * as jsx from "@/gui/jsx/jsx";
import { ShpFile } from "@/data/ShpFile";
import { SideType } from "@/game/SideType";
import { SidebarCard } from "@/gui/screen/game/component/hud/SidebarCard";
import { SidebarTabs } from "@/gui/screen/game/component/hud/SidebarTabs";
import { SidebarIconButton } from "@/gui/screen/game/component/hud/SidebarIconButton";
import { SidebarMenu } from "@/gui/screen/game/component/hud/SidebarMenu";
import { UiObject } from "@/gui/UiObject";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { EventDispatcher } from "@/util/event";
import { GameMenuContentArea } from "@/gui/screen/game/component/hud/GameMenuContentArea";
import { SidebarPower } from "@/gui/screen/game/component/hud/SidebarPower";
import { SidebarCredits } from "@/gui/screen/game/component/hud/SidebarCredits";
import { SidebarRadar } from "@/gui/screen/game/component/hud/SidebarRadar";
import { CombatantSidebarModel } from "@/gui/screen/game/component/hud/viewmodel/CombatantSidebarModel";
import { SidebarGameTime } from "@/gui/screen/game/component/hud/SidebarGameTime";
import { Messages } from "@/gui/screen/game/component/hud/Messages";
import { SuperWeaponTimers } from "@/gui/screen/game/component/hud/SuperWeaponTimers";
import { ShpAggregator } from "@/engine/renderable/builder/ShpAggregator";
import { CommandBarButtonType } from "@/gui/screen/game/component/hud/commandBar/CommandBarButtonType";
import { commandButtonConfigs } from "@/gui/screen/game/component/hud/commandBar/commandButtonConfigs";
import { isNotNullOrUndefined } from "@/util/typeGuard";
import { DebugText } from "@/gui/screen/game/component/hud/DebugText";
import { ReplayStatsOverlay } from "@/gui/screen/game/component/hud/ReplayStatsOverlay";
declare const THREE: any;
interface Viewport {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface SidebarModel {
    repairMode: boolean;
    sellMode: boolean;
    activeTab: {
        items: any[];
    };
    selectTab(id: any): void;
}
export class Hud extends UiObject {
    private sideType: SideType;
    private viewport: Viewport;
    private images: Map<string, any>;
    private palettes: Map<string, any>;
    private cameoFilenames: string[];
    private sidebarModel: SidebarModel;
    private messageList: any;
    private chatHistory: any;
    private debugTextValue: any;
    private debugTextEnabled: any;
    private localPlayer: any;
    private players: any;
    private stalemateDetectTrait: any;
    private countdownTimer: any;
    private jsxRenderer: any;
    private strings: any;
    private commandBarButtonTypes: CommandBarButtonType[];
    private persistentHoverTags: any;
    private _onDiploButtonClick: EventDispatcher<this, void>;
    private _onOptButtonClick: EventDispatcher<this, void>;
    private _onRepairButtonClick: EventDispatcher<this, void>;
    private _onSellButtonClick: EventDispatcher<this, void>;
    private _onSidebarSlotClick: EventDispatcher<this, any>;
    private _onSidebarTabClick: EventDispatcher<this, any>;
    private _onCreditsTick: EventDispatcher<this, any>;
    private _onMessagesTick: EventDispatcher<this>;
    private _onMessageSubmit: EventDispatcher<this, any>;
    private _onMessageCancel: EventDispatcher<this>;
    private _onScrollButtonClick: EventDispatcher<this, any>;
    private _onCommandBarButtonClick: EventDispatcher<this, CommandBarButtonType>;
    private commandBarButtons: any[] = [];
    private sidebarWidth: number;
    private repeaterCount: number;
    private repeaterHeight: number;
    private actionBarHeight: number;
    private sidebarTop?: any;
    private sidebarRadar?: any;
    private sideCameoRepeaters?: any;
    private sidebarButtonsContainer?: any;
    private sidebarMenuContainer?: any;
    private sidebarMenu?: any;
    private sidebarCard?: any;
    private sidebarPower?: any;
    private repairButton?: any;
    private sellButton?: any;
    private pgDnButton?: any;
    private pgUpButton?: any;
    private messages?: any;
    private debugText?: any;
    private superWeaponTimers?: any;
    private replayStatsOverlay?: any;
    private menuContentContainer?: any;
    private menuContentContainerInner?: any;
    private menuContent?: any;
    constructor(sideType: SideType, viewport: Viewport, images: Map<string, any>, palettes: Map<string, any>, cameoFilenames: string[], sidebarModel: SidebarModel, messageList: any, chatHistory: any, debugTextValue: any, debugTextEnabled: any, localPlayer: any, players: any, stalemateDetectTrait: any, countdownTimer: any, jsxRenderer: any, strings: any, commandBarButtonTypes: CommandBarButtonType[], persistentHoverTags: any) {
        super(new THREE.Object3D(), new HtmlContainer());
        this.sideType = sideType;
        this.viewport = viewport;
        this.images = images;
        this.palettes = palettes;
        this.cameoFilenames = cameoFilenames;
        this.sidebarModel = sidebarModel;
        this.messageList = messageList;
        this.chatHistory = chatHistory;
        this.debugTextValue = debugTextValue;
        this.debugTextEnabled = debugTextEnabled;
        this.localPlayer = localPlayer;
        this.players = players;
        this.stalemateDetectTrait = stalemateDetectTrait;
        this.countdownTimer = countdownTimer;
        this.jsxRenderer = jsxRenderer;
        this.strings = strings;
        this.commandBarButtonTypes = commandBarButtonTypes;
        this.persistentHoverTags = persistentHoverTags;
        this._onDiploButtonClick = new EventDispatcher();
        this._onOptButtonClick = new EventDispatcher();
        this._onRepairButtonClick = new EventDispatcher();
        this._onSellButtonClick = new EventDispatcher();
        this._onSidebarSlotClick = new EventDispatcher();
        this._onSidebarTabClick = new EventDispatcher();
        this._onCreditsTick = new EventDispatcher();
        this._onMessagesTick = new EventDispatcher();
        this._onMessageSubmit = new EventDispatcher();
        this._onMessageCancel = new EventDispatcher();
        this._onScrollButtonClick = new EventDispatcher();
        this._onCommandBarButtonClick = new EventDispatcher();
        this.commandBarButtons = [];
        this.init();
    }
    get onDiploButtonClick() {
        return this._onDiploButtonClick.asEvent();
    }
    get onOptButtonClick() {
        return this._onOptButtonClick.asEvent();
    }
    get onRepairButtonClick() {
        return this._onRepairButtonClick.asEvent();
    }
    get onSellButtonClick() {
        return this._onSellButtonClick.asEvent();
    }
    get onSidebarSlotClick() {
        return this._onSidebarSlotClick.asEvent();
    }
    get onSidebarTabClick() {
        return this._onSidebarTabClick.asEvent();
    }
    get onCreditsTick() {
        return this._onCreditsTick.asEvent();
    }
    get onMessagesTick() {
        return this._onMessagesTick.asEvent();
    }
    get onMessageSubmit() {
        return this._onMessageSubmit.asEvent();
    }
    get onMessageCancel() {
        return this._onMessageCancel.asEvent();
    }
    get onScrollButtonClick() {
        return this._onScrollButtonClick.asEvent();
    }
    get onCommandBarButtonClick() {
        return this._onCommandBarButtonClick.asEvent();
    }
    private getImage(name: string): any {
        const image = this.images.get(name);
        if (!image)
            throw new Error(`Missing image "${name}"`);
        return image;
    }
    private init(): void {
        const sidebarPalette = this.palettes.get("sidebar.pal");
        if (!sidebarPalette)
            throw new Error('Missing palette "sidebar.pal"');
        const creditsImg = this.getImage("credits.shp");
        const topImg = this.getImage("top.shp");
        const radarImg = this.getImage("radar.shp");
        const side1Img = this.getImage("side1.shp");
        const side2Img = this.getImage("side2.shp");
        const side2bImg = this.getImage("side2b.shp");
        const side3Img = this.getImage("side3.shp");
        const addonImg = this.getImage("addon.shp");
        const tab00Img = this.getImage("tab00.shp");
        const tab01Img = this.getImage("tab01.shp");
        const tab02Img = this.getImage("tab02.shp");
        const tab03Img = this.getImage("tab03.shp");
        const diplobtnImg = this.getImage("diplobtn.shp");
        const optbtnImg = this.getImage("optbtn.shp");
        const repairImg = this.getImage("repair.shp");
        const sellImg = this.getImage("sell.shp");
        const rUpImg = this.getImage("r-up.shp");
        const rDnImg = this.getImage("r-dn.shp");
        const slotClockImg = this.getImage("gclock2.shp");
        const commandButtonImages = [
            ...new Set(this.commandBarButtonTypes.map((type) => commandButtonConfigs.find((config) => config.type === type)?.icon)),
        ]
            .map((icon) => (icon ? this.images.get(icon) : undefined))
            .filter(isNotNullOrUndefined);
        const aggregator = new ShpAggregator();
        const aggregatedImageData = aggregator.aggregate([diplobtnImg, optbtnImg, repairImg, sellImg, tab00Img, tab01Img, tab02Img, tab03Img, rDnImg, rUpImg, ...commandButtonImages].map((img) => ShpAggregator.getShpFrameInfo(img, false)), "agg_hud.shp");
        this.sidebarWidth = creditsImg.width;
        const sidebarBounds = {
            x: this.viewport.width - this.sidebarWidth,
            y: 0,
            width: this.sidebarWidth,
            height: this.viewport.height,
        };
        const topHeight = creditsImg.height + topImg.height;
        const radarBottom = topHeight + radarImg.height;
        const side1Bottom = topHeight + radarImg.height + side1Img.height;
        this.repeaterCount = Math.floor((sidebarBounds.height - side1Bottom - side3Img.height) / side2Img.height);
        this.repeaterHeight = side2Img.height;
        const side3Top = topHeight + radarImg.height + side1Img.height + this.repeaterHeight * this.repeaterCount;
        const lendcapImg = this.getImage("lendcap.shp");
        this.actionBarHeight = lendcapImg.height;
        const actionBarY = this.viewport.y + this.viewport.height - this.actionBarHeight;
        const bttnbkgdImg = this.getImage("bttnbkgd.shp");
        const rendcapImg = this.getImage("rendcap.shp");
        const availableWidth = sidebarBounds.x - lendcapImg.width - rendcapImg.width;
        const buttonBackgroundCount = Math.floor(availableWidth / bttnbkgdImg.width);
        const remainderWidth = availableWidth % bttnbkgdImg.width;
        let clippedBttnbkgd: any;
        if (remainderWidth) {
            clippedBttnbkgd = bttnbkgdImg.clip(remainderWidth, bttnbkgdImg.height);
        }
        let diploButtonOffset = { x: 12, y: 4 };
        if (this.sideType === SideType.Nod) {
            diploButtonOffset = { x: 14, y: 5 };
        }
        let repairButtonOffset = { x: 20, y: 8 };
        if (this.sideType === SideType.Nod) {
            repairButtonOffset = { x: 34, y: 7 };
        }
        let tabSpacing = 1;
        let tabOffset = { x: 26, y: -3 };
        if (this.sideType === SideType.Nod) {
            tabSpacing = 0;
            tabOffset = { x: 20, y: -2 };
        }
        const cameoPalette = this.palettes.get("cameo.pal");
        if (!cameoPalette)
            throw new Error('Missing palette "cameo.pal"');
        const cameoImages = this.buildCameoFile();
        const cameoNameToIdMap = this.createCameoNameToIdMap();
        const sidebarSlotSize = { width: slotClockImg.width, height: slotClockImg.height };
        const sidebarCardOffset = { x: 22, y: 1 };
        const sidebarCardPosition = this.sideType === SideType.GDI
            ? { x: 5, y: 2 }
            : { x: 0, y: 0 };
        const scrollButtonX = 38;
        const scrollButtonY = 7;
        const powerImg = this.getImage("powerp.shp");
        const textColor = this.getTextColor();
        this.add(...this.jsxRenderer.render(jsx.jsx("fragment", null, jsx.jsx("container", { x: sidebarBounds.x, y: sidebarBounds.y }, jsx.jsx("sprite-batch", null, jsx.jsx("sprite", { static: true, image: creditsImg, palette: sidebarPalette }), jsx.jsx("container", { ref: (ref: any) => (this.sidebarTop = ref), zIndex: 1 }, this.sidebarModel instanceof CombatantSidebarModel
            ? jsx.jsx(SidebarCredits, {
                sidebarModel: this.sidebarModel,
                height: creditsImg.height,
                width: creditsImg.width,
                textColor: textColor,
                onTick: (data: any) => this._onCreditsTick.dispatch(this, data),
            })
            : jsx.jsx(SidebarGameTime, {
                sidebarModel: this.sidebarModel,
                height: creditsImg.height,
                width: creditsImg.width,
                textColor: textColor,
            })), jsx.jsx("sprite", {
            static: true,
            image: topImg,
            palette: sidebarPalette,
            y: creditsImg.height,
        }), jsx.jsx("sprite", {
            static: true,
            image: radarImg,
            palette: sidebarPalette,
            y: topHeight,
        }), jsx.jsx(SidebarRadar, {
            image: radarImg,
            palette: sidebarPalette,
            y: topHeight,
            sidebarModel: this.sidebarModel instanceof CombatantSidebarModel
                ? this.sidebarModel
                : undefined,
            zIndex: 1,
            ref: (ref: any) => (this.sidebarRadar = ref),
        }), jsx.jsx("sprite", {
            static: true,
            image: side1Img,
            palette: sidebarPalette,
            y: radarBottom,
        }), new Array(this.repeaterCount).fill(0).map((_, index) => jsx.jsx("sprite", {
            static: true,
            image: side2bImg,
            palette: sidebarPalette,
            y: side1Bottom + this.repeaterHeight * index,
        })), jsx.jsx("sprite-batch", { ref: (ref: any) => (this.sideCameoRepeaters = ref) }, new Array(this.repeaterCount).fill(0).map((_, index) => jsx.jsx("sprite", {
            static: true,
            image: side2Img,
            palette: sidebarPalette,
            y: side1Bottom + this.repeaterHeight * index,
            zIndex: 1,
        }))), jsx.jsx(SidebarPower, {
            sidebarModel: this.sidebarModel,
            powerImg: powerImg,
            palette: sidebarPalette,
            x: sidebarCardPosition.x,
            y: side1Bottom,
            height: this.repeaterHeight * this.repeaterCount + sidebarCardPosition.y,
            ref: (ref: any) => (this.sidebarPower = ref),
            zIndex: 2,
            strings: this.strings,
        }), jsx.jsx(SidebarCard, {
            slotSize: sidebarSlotSize,
            cameoImages: cameoImages,
            cameoPalette: cameoPalette,
            cameoNameToIdMap: cameoNameToIdMap,
            sidebarModel: this.sidebarModel,
            slots: 2 * this.repeaterCount,
            onSlotClick: (event: any) => this._onSidebarSlotClick.dispatch(this, event),
            x: sidebarCardOffset.x,
            y: side1Bottom + sidebarCardOffset.y,
            strings: this.strings,
            textColor: textColor,
            persistentHoverTags: this.persistentHoverTags,
            ref: (ref: any) => (this.sidebarCard = ref),
            zIndex: 2,
        }), jsx.jsx("container", {
            ref: (ref: any) => (this.sidebarMenuContainer = ref),
            x: sidebarCardOffset.x - 1,
            y: side1Bottom + sidebarCardOffset.y,
            zIndex: 2,
        }), jsx.jsx("sprite", {
            static: true,
            image: side3Img,
            palette: sidebarPalette,
            y: side3Top,
        }), jsx.jsx("sprite", {
            static: true,
            image: addonImg,
            palette: sidebarPalette,
            y: side3Top + side3Img.height,
        }))), jsx.jsx("container", {
            x: sidebarBounds.x,
            y: sidebarBounds.y,
            ref: (ref: any) => (this.sidebarButtonsContainer = ref),
            zIndex: 2,
        }, jsx.jsx(SidebarIconButton, {
            image: aggregatedImageData.file,
            palette: sidebarPalette,
            imageFrameOffset: aggregatedImageData.imageIndexes.get(diplobtnImg),
            x: diploButtonOffset.x,
            y: creditsImg.height + diploButtonOffset.y,
            onClick: () => this._onDiploButtonClick.dispatch(this, undefined),
            tooltip: this.strings.get("Tip:DiplomacyButton"),
        }), jsx.jsx(SidebarIconButton, {
            image: aggregatedImageData.file,
            palette: sidebarPalette,
            imageFrameOffset: aggregatedImageData.imageIndexes.get(optbtnImg),
            x: diploButtonOffset.x + diplobtnImg.width,
            y: creditsImg.height + diploButtonOffset.y,
            onClick: () => this._onOptButtonClick.dispatch(this, undefined),
            tooltip: this.strings.get("Tip:OptionsButton"),
        }), jsx.jsx(SidebarIconButton, {
            image: aggregatedImageData.file,
            palette: sidebarPalette,
            imageFrameOffset: aggregatedImageData.imageIndexes.get(repairImg),
            x: repairButtonOffset.x,
            y: radarBottom + repairButtonOffset.y,
            toggle: this.sidebarModel.repairMode,
            ref: (ref: any) => (this.repairButton = ref),
            onClick: () => this._onRepairButtonClick.dispatch(this, undefined),
            tooltip: this.strings.get("TXT_REPAIR_MODE"),
        }), jsx.jsx(SidebarIconButton, {
            image: aggregatedImageData.file,
            palette: sidebarPalette,
            imageFrameOffset: aggregatedImageData.imageIndexes.get(sellImg),
            x: repairButtonOffset.x + repairImg.width,
            y: radarBottom + repairButtonOffset.y,
            toggle: this.sidebarModel.sellMode,
            ref: (ref: any) => (this.sellButton = ref),
            onClick: () => this._onSellButtonClick.dispatch(this, undefined),
            tooltip: this.strings.get("TXT_SELL_MODE"),
        }), jsx.jsx(SidebarTabs, {
            aggregatedImageData: aggregatedImageData,
            images: [tab00Img, tab01Img, tab02Img, tab03Img],
            palette: sidebarPalette,
            sidebarModel: this.sidebarModel,
            tabSpacing: tabSpacing,
            onTabClick: (event: any) => {
                this.sidebarModel.selectTab(event.id);
                this._onSidebarTabClick.dispatch(this, event.id);
            },
            strings: this.strings,
            x: tabOffset.x,
            y: side1Bottom - tab00Img.height + tabOffset.y,
        }), jsx.jsx(SidebarIconButton, {
            image: aggregatedImageData.file,
            palette: sidebarPalette,
            disabled: true,
            imageFrameOffset: aggregatedImageData.imageIndexes.get(rDnImg),
            x: scrollButtonX,
            y: side3Top + scrollButtonY,
            ref: (ref: any) => (this.pgDnButton = ref),
            onClick: () => this._onScrollButtonClick.dispatch(this, this.sidebarCard.pageDown()),
        }), jsx.jsx(SidebarIconButton, {
            image: aggregatedImageData.file,
            palette: sidebarPalette,
            disabled: true,
            imageFrameOffset: aggregatedImageData.imageIndexes.get(rUpImg),
            x: scrollButtonX + rDnImg.width,
            y: side3Top + scrollButtonY,
            ref: (ref: any) => (this.pgUpButton = ref),
            onClick: () => this._onScrollButtonClick.dispatch(this, this.sidebarCard.pageUp()),
        })), jsx.jsx("container", { x: this.viewport.x, y: actionBarY }, jsx.jsx("container", { x: lendcapImg.width, zIndex: 1 }, this.renderCommandBarButtons(aggregatedImageData, this.commandBarButtonTypes, bttnbkgdImg.width, buttonBackgroundCount)), jsx.jsx("sprite-batch", null, jsx.jsx("sprite", { static: true, image: lendcapImg, palette: sidebarPalette }), new Array(buttonBackgroundCount).fill(0).map((_, index) => jsx.jsx("sprite", {
            static: true,
            image: bttnbkgdImg,
            palette: sidebarPalette,
            x: lendcapImg.width + bttnbkgdImg.width * index,
        })), clippedBttnbkgd
            ? jsx.jsx("sprite", {
                static: true,
                image: clippedBttnbkgd,
                palette: sidebarPalette,
                x: lendcapImg.width + buttonBackgroundCount * bttnbkgdImg.width,
            })
            : [], jsx.jsx("sprite", {
            static: true,
            image: rendcapImg,
            palette: sidebarPalette,
            x: sidebarBounds.x - rendcapImg.width,
        }))), jsx.jsx(Messages, {
            messages: this.messageList,
            chatHistory: this.chatHistory,
            width: sidebarBounds.x - 10,
            height: 200,
            ref: (ref: any) => (this.messages = ref),
            strings: this.strings,
            onMessageTick: () => this._onMessagesTick.dispatch(this),
            onMessageSubmit: (message: any) => this._onMessageSubmit.dispatch(this, message),
            onMessageCancel: () => this._onMessageCancel.dispatch(this),
        }), jsx.jsx(DebugText, {
            text: this.debugTextValue,
            visible: this.debugTextEnabled,
            color: new THREE.Color(0xffffff),
            x: 20,
            y: 200,
            width: Math.floor(sidebarBounds.x / 2),
            height: 200,
            ref: (ref: any) => (this.debugText = ref),
        }), jsx.jsx(SuperWeaponTimers, {
            localPlayer: this.localPlayer,
            players: this.players,
            stalemateDetectTrait: this.stalemateDetectTrait,
            countdownTimer: this.countdownTimer,
            strings: this.strings,
            width: 200,
            height: 500,
            x: sidebarBounds.x - 200,
            y: actionBarY - 500,
            ref: (ref: any) => (this.superWeaponTimers = ref),
        }), !this.localPlayer ? jsx.jsx(ReplayStatsOverlay, {
            players: this.players,
            strings: this.strings,
            width: Math.min(sidebarBounds.x - 10, 920),
            height: 400,
            x: 5,
            y: 5,
            zIndex: 5,
            ref: (ref: any) => (this.replayStatsOverlay = ref),
        }) : [], jsx.jsx(GameMenuContentArea, {
            hidden: true,
            screenSize: this.viewport,
            viewport: {
                x: this.viewport.x,
                y: this.viewport.y,
                width: sidebarBounds.x,
                height: actionBarY,
            },
            images: this.images,
            ref: (ref: any) => (this.menuContentContainer = ref.getUiObject()),
            innerRef: (ref: any) => (this.menuContentContainerInner = ref),
        }))));
    }
    private getTextColor(): string {
        return this.sideType === SideType.GDI
            ? "rgb(165,211,255)"
            : "yellow";
    }
    createSidebarMenu(buttons: any[]): any {
        return this.jsxRenderer.render(jsx.jsx(SidebarMenu, {
            buttonImg: this.getImage("sidebttn.shp"),
            buttonPal: "sidebar.pal",
            menuHeight: this.repeaterHeight * this.repeaterCount - 2,
            buttons: buttons,
        }))[0];
    }
    showSidebarMenu(buttons: any[]): void {
        this.destroySidebarMenu();
        this.sidebarMenu = this.createSidebarMenu(buttons);
        this.sidebarMenuContainer.add(this.sidebarMenu);
        this.sideCameoRepeaters.setVisible(false);
        this.remove(this.sidebarButtonsContainer);
        this.sidebarCard.hide();
        this.sidebarPower.hide();
        this.sidebarTop?.setVisible(false);
        this.sidebarRadar?.hide();
        this.commandBarButtons?.forEach((button) => button.getUiObject().setVisible(false));
        this.messages.getUiObject().setVisible(false);
        this.debugText.getUiObject().setVisible(false);
        this.superWeaponTimers.getUiObject().setVisible(false);
        this.replayStatsOverlay?.getUiObject().setVisible(false);
    }
    hideSidebarMenu(): void {
        this.sideCameoRepeaters.setVisible(true);
        this.destroySidebarMenu();
        this.add(this.sidebarButtonsContainer);
        this.sidebarCard.show();
        this.sidebarPower.show();
        this.sidebarTop?.setVisible(true);
        this.sidebarRadar?.show();
        this.commandBarButtons?.forEach((button) => button.getUiObject().setVisible(true));
        this.messages.getUiObject().setVisible(true);
        this.debugText.getUiObject().setVisible(true);
        this.superWeaponTimers.getUiObject().setVisible(true);
        this.replayStatsOverlay?.getUiObject().setVisible(true);
    }
    setMenuContentComponent(component: any): void {
        const container = this.menuContentContainerInner;
        if (this.menuContent) {
            container.remove(this.menuContent);
            this.menuContent.destroy();
            this.menuContent = undefined;
        }
        if (component) {
            container.add(component);
            this.menuContent = component;
        }
    }
    setMinimap(minimap: any): void {
        this.sidebarRadar.setMinimap(minimap);
    }
    toggleMenuContentVisibility(visible: boolean): void {
        this.menuContentContainer.setVisible(visible);
    }
    private renderCommandBarButtons(aggregatedImageData: any, buttonTypes: CommandBarButtonType[], buttonWidth: number, maxButtons: number): any[] {
        let xOffset = 0;
        const buttons: any[] = [];
        for (const buttonType of buttonTypes.slice(0, maxButtons)) {
            if (buttonType !== CommandBarButtonType.Separator) {
                const config = commandButtonConfigs.find((config) => config.type === buttonType);
                if (config) {
                    const image = this.images.get(config.icon);
                    if (image) {
                        const frameOffset = aggregatedImageData.imageIndexes.get(image);
                        buttons.push(jsx.jsx(SidebarIconButton, {
                            image: frameOffset !== undefined ? aggregatedImageData.file : image,
                            imageFrameOffset: frameOffset,
                            palette: "sidebar.pal",
                            tooltip: config.tooltip(this.strings),
                            x: xOffset,
                            onClick: () => {
                                this._onCommandBarButtonClick.dispatch(this, buttonType);
                            },
                            ref: (ref: any) => this.commandBarButtons.push(ref),
                        }));
                        xOffset += image.width;
                    }
                    else {
                        console.warn(`Missing image for command bar button "${CommandBarButtonType[buttonType]}"`);
                    }
                }
                else {
                    console.warn(`Unknown command bar button type "${buttonType}"`);
                }
            }
            else {
                xOffset += buttonWidth;
            }
        }
        return buttons;
    }
    private buildCameoFile(): ShpFile {
        const cameoFile = new ShpFile();
        cameoFile.filename = "agg_cameos.shp";
        this.cameoFilenames.forEach((filename) => {
            const image = this.getImage(filename);
            if (!cameoFile.width)
                cameoFile.width = image.width;
            if (!cameoFile.height)
                cameoFile.height = image.height;
            cameoFile.addImage(image.getImage(0));
        });
        return cameoFile;
    }
    private createCameoNameToIdMap(): Map<string, number> {
        const map = new Map<string, number>();
        for (let i = 0; i < this.cameoFilenames.length; ++i) {
            map.set(this.cameoFilenames[i], i);
        }
        return map;
    }
    private destroySidebarMenu(): void {
        if (this.sidebarMenu) {
            this.sidebarMenuContainer.remove(this.sidebarMenu);
            this.sidebarMenu.destroy();
        }
    }
    update(deltaTime: number): void {
        super.update(deltaTime);
        this.repairButton?.setToggleState(this.sidebarModel.repairMode);
        this.sellButton?.setToggleState(this.sidebarModel.sellMode);
        const hasMoreItems = this.sidebarModel.activeTab.items.length - 2 * this.repeaterCount > 0;
        this.pgUpButton?.setDisabled(!hasMoreItems);
        this.pgDnButton?.setDisabled(!hasMoreItems);
    }
    destroy(): void {
        this.sidebarButtonsContainer.destroy();
        this.destroySidebarMenu();
        this.sidebarRadar.setMinimap(undefined);
        super.destroy();
    }
}
