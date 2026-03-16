import React from 'react';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { EventDispatcher } from '@/util/event';
import { SoundKey } from '@/engine/sound/SoundKey';
import { ChannelType } from '@/engine/sound/ChannelType';
import { KeyCommandType } from '@/gui/screen/game/worldInteraction/keyboard/KeyCommandType';
export class ObserverUi {
    private disposables = new CompositeDisposable();
    private _onPlayerChange = new EventDispatcher<ObserverUi, {
        player: any;
        sidebarModel: any;
    }>();
    public worldInteraction?: any;
    get onPlayerChange() {
        return this._onPlayerChange.asEvent();
    }
    constructor(private game: any, private player: any, private sidebarModel: any, private replay: any, private renderer: any, private worldScene: any, private sound: any, private worldInteractionFactory: any, private gameMenu: any, private runtimeVars: any, private strings: any, private renderableManager: any, private messageBoxApi: any, private discordUrl?: string) { }
    init(hud: any): void {
        this.worldInteraction = this.worldInteractionFactory.create();
        this.worldInteraction.init();
        this.disposables.add(this.worldInteraction);
        this.initKeyboardCommands(this.worldInteraction);
        this.initGameEventListeners();
        this.initHudEventListeners(hud);
    }
    handleHudChange(hud: any): void {
        this.initHudEventListeners(hud);
    }
    dispose(): void {
        this.disposables.dispose();
    }
    private initGameEventListeners(): void {
        const world = this.game.getWorld();
        const updateSidebar = () => {
        };
        world.onObjectSpawned.subscribe(updateSidebar);
        world.onObjectRemoved.subscribe(updateSidebar);
        this.disposables.add(() => world.onObjectSpawned.unsubscribe(updateSidebar), () => world.onObjectRemoved.unsubscribe(updateSidebar));
        this.disposables.add(this.game.events.subscribe((event: any) => {
            if (event.type === 'PowerChange' && event.target === this.player) {
                this.sidebarModel.powerGenerated = event.power;
                this.sidebarModel.powerDrained = event.drain;
            }
        }));
    }
    changePlayer(newPlayer: any): void {
        if (newPlayer === this.player) {
            return;
        }
        this.player?.production.onQueueUpdate.unsubscribe(this.handleProductionQueueUpdate);
        this.player = newPlayer;
        this.player?.production.onQueueUpdate.subscribe(this.handleProductionQueueUpdate);
        const oldSidebarModel = this.sidebarModel;
        this.sidebarModel = newPlayer
            ? this.createCombatantSidebarModel(newPlayer, this.game)
            : this.createObserverSidebarModel(this.game, this.replay);
        this.sidebarModel.selectTab(oldSidebarModel.activeTab.id);
        this.sidebarModel.topTextLeftAlign = oldSidebarModel.topTextLeftAlign;
        const shroud = newPlayer
            ? this.game.mapShroudTrait.getPlayerShroud(newPlayer)
            : undefined;
        this.worldInteraction?.setShroud(shroud);
        this._onPlayerChange.dispatch(this, {
            player: newPlayer,
            sidebarModel: this.sidebarModel,
        });
    }
    private initHudEventListeners(hud: any): void {
        hud.onSidebarTabClick.subscribe(() => {
            this.sound.play(SoundKey.GUITabSound, ChannelType.Ui);
        });
        hud.onCommandBarButtonClick.subscribe((buttonType: any) => {
            switch (buttonType) {
                case 'BugReport':
                    if (this.discordUrl) {
                        this.gameMenu.open();
                        this.messageBoxApi.show(React.createElement('div', {}, 'Bug Report'), this.strings.get('GUI:OK'));
                    }
                    break;
            }
        });
    }
    private initKeyboardCommands(worldInteraction: any): void {
        const unitSelection = worldInteraction.unitSelectionHandler;
        worldInteraction
            .registerKeyCommand(KeyCommandType.Options, () => this.gameMenu.open())
            .registerKeyCommand(KeyCommandType.Scoreboard, () => this.gameMenu.openDiplo())
            .registerKeyCommand(KeyCommandType.VeterancyNav, () => unitSelection.selectByVeterancy())
            .registerKeyCommand(KeyCommandType.HealthNav, () => unitSelection.selectByHealth())
            .registerKeyCommand(KeyCommandType.ToggleFps, () => {
            this.runtimeVars.fps.value = !this.runtimeVars.fps.value;
        });
        const playerCommands = [
            KeyCommandType.TeamSelect_1,
            KeyCommandType.TeamSelect_2,
            KeyCommandType.TeamSelect_3,
            KeyCommandType.TeamSelect_4,
            KeyCommandType.TeamSelect_5,
            KeyCommandType.TeamSelect_6,
            KeyCommandType.TeamSelect_7,
            KeyCommandType.TeamSelect_8,
            KeyCommandType.TeamSelect_9,
            KeyCommandType.TeamSelect_10,
        ];
        playerCommands.forEach((command, index) => {
            worldInteraction.registerKeyCommand(command, () => {
                const players = this.game.getNonNeutralPlayers();
                if (players[index]) {
                    this.changePlayer(players[index]);
                }
            });
        });
        const tabCommands = new Map([
            [KeyCommandType.StructureTab, 'Structures'],
            [KeyCommandType.DefenseTab, 'Armory'],
            [KeyCommandType.InfantryTab, 'Infantry'],
            [KeyCommandType.UnitTab, 'Vehicles'],
        ]);
        tabCommands.forEach((tabId, command) => {
            worldInteraction.registerKeyCommand(command, () => {
                this.sidebarModel.selectTab(tabId);
            });
        });
        this.initCameraCommands(worldInteraction);
    }
    private initCameraCommands(worldInteraction: any): void {
        const cameraLocations = new Map();
        [
            KeyCommandType.SetView1,
            KeyCommandType.SetView2,
            KeyCommandType.SetView3,
            KeyCommandType.SetView4,
        ].forEach((command, index) => {
            worldInteraction.registerKeyCommand(command, () => {
                const currentPos = this.worldScene.cameraPan.getPosition();
                cameraLocations.set(index, currentPos);
            });
        });
        [
            KeyCommandType.View1,
            KeyCommandType.View2,
            KeyCommandType.View3,
            KeyCommandType.View4,
        ].forEach((command, index) => {
            worldInteraction.registerKeyCommand(command, () => {
                const location = cameraLocations.get(index);
                if (location) {
                    this.worldScene.cameraPan.setPosition(location);
                }
            });
        });
        worldInteraction.registerKeyCommand(KeyCommandType.CenterBase, () => {
            if (this.player) {
                const baseLocation = this.findPlayerBase(this.player);
                if (baseLocation) {
                    this.worldScene.cameraPan.setPosition(baseLocation);
                }
            }
        });
    }
    private findPlayerBase(player: any): any {
        const buildings = player.getBuildings();
        if (buildings.length > 0) {
            return buildings[0].position;
        }
        return null;
    }
    private handleProductionQueueUpdate = (queue: any): void => {
        if (this.sidebarModel.updateFromQueue) {
            this.sidebarModel.updateFromQueue(queue);
        }
    };
    private createCombatantSidebarModel(player: any, game: any): any {
        return {};
    }
    private createObserverSidebarModel(game: any, replay: any): any {
        return {};
    }
}
