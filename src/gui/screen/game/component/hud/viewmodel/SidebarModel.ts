import { SidebarTab } from "./SidebarTab";
import { GameSpeed } from "@/game/GameSpeed";
export enum SidebarItemTargetType {
    Techno = 0,
    Special = 1
}
export enum SidebarItemStatus {
    Idle = 0,
    InQueue = 1,
    Started = 2,
    OnHold = 3,
    Ready = 4
}
export enum SidebarCategory {
    Structures = 0,
    Armory = 1,
    Infantry = 2,
    Vehicles = 3
}
export class SidebarModel {
    game: any;
    replay: any;
    powerDrained: number = 0;
    powerGenerated: number = 0;
    sellMode: boolean = false;
    repairMode: boolean = false;
    topTextLeftAlign: boolean = false;
    tabs: SidebarTab[];
    activeTabId: SidebarCategory;
    constructor(game: any, replay?: any) {
        this.game = game;
        this.replay = replay;
        this.powerDrained = 0;
        this.powerGenerated = 0;
        this.sellMode = false;
        this.repairMode = false;
        this.topTextLeftAlign = false;
        this.tabs = [
            new SidebarTab(SidebarCategory.Structures),
            new SidebarTab(SidebarCategory.Armory),
            new SidebarTab(SidebarCategory.Infantry),
            new SidebarTab(SidebarCategory.Vehicles),
        ];
        this.activeTabId = SidebarCategory.Structures;
    }
    get activeTab(): SidebarTab {
        return this.tabs[this.activeTabId];
    }
    get currentGameTime(): number {
        return Math.floor(this.game.currentTime / 1000);
    }
    get replayTime(): number | undefined {
        return this.replay
            ? Math.floor(this.replay.endTick / GameSpeed.BASE_TICKS_PER_SECOND)
            : undefined;
    }
    selectTab(tabId: SidebarCategory) {
        if (!this.tabs[tabId].disabled) {
            this.activeTabId = tabId;
        }
    }
}
