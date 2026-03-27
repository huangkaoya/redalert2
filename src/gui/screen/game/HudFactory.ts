import { Hud } from '@/gui/screen/game/component/Hud';
import { Engine } from '@/engine/Engine';
export class HudFactory {
    constructor(private sideType: any, private viewport: any, private sidebarModel: any, private messageList: any, private chatHistory: any, private debugText: any, private debugTextEnabled: any, private localPlayer: any, private players: any, private stalemateDetectTrait: any, private countdownTimer: any, private cameoFilenames: any, private jsxRenderer: any, private strings: any, private commandBarButtons: any, private persistentHoverTags: any) { }
    setSidebarModel(sidebarModel: any): void {
        this.sidebarModel = sidebarModel;
    }
    setViewport(viewport: any): void {
        this.viewport = viewport;
    }
    create(): Hud {
        return new Hud(this.sideType, this.viewport, Engine.getImages(), Engine.getPalettes(), this.cameoFilenames, this.sidebarModel, this.messageList, this.chatHistory, this.debugText, this.debugTextEnabled, this.localPlayer, this.players, this.stalemateDetectTrait, this.countdownTimer, this.jsxRenderer, this.strings, this.commandBarButtons, this.persistentHoverTags);
    }
}
