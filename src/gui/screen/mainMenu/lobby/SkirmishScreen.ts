import { SlotType as NetSlotType, SlotInfo } from "@/network/gameopt/SlotInfo";
import { GameOpts, AiDifficulty } from "@/game/gameopts/GameOpts";
import { RANDOM_COUNTRY_ID, RANDOM_COLOR_ID, RANDOM_START_POS, NO_TEAM_ID, OBS_TEAM_ID, aiUiNames, OBS_COUNTRY_ID, RANDOM_COUNTRY_NAME, OBS_COUNTRY_NAME, RANDOM_COUNTRY_UI_NAME, RANDOM_COUNTRY_UI_TOOLTIP, OBS_COUNTRY_UI_NAME, OBS_COUNTRY_UI_TOOLTIP, RANDOM_COLOR_NAME, } from "@/game/gameopts/constants";
import { LobbyForm } from "@/gui/screen/mainMenu/lobby/component/LobbyForm";
import { LobbyType, SlotOccupation, PlayerStatus, SlotType as UiSlotType } from "@/gui/screen/mainMenu/lobby/component/viewmodel/lobby";
import { MainMenuScreenType } from "../../ScreenType";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { jsx } from "@/gui/jsx/jsx";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { MapPreviewRenderer } from "@/gui/screen/mainMenu/lobby/MapPreviewRenderer";
import { findIndexReverse } from "@/util/array";
import { StorageKey } from "@/LocalPrefs";
import { isNotNullOrUndefined } from "@/util/typeGuard";
import { PreferredHostOpts } from "./PreferredHostOpts";
import { MainMenuScreen } from "@/gui/screen/mainMenu/MainMenuScreen";
import { MapFile } from "@/data/MapFile";
import { MapDigest } from "@/engine/MapDigest";
import { MainMenuRoute } from "@/gui/screen/mainMenu/MainMenuRoute";
import { MusicType } from "@/engine/sound/Music";
import { Parser } from "@/network/gameopt/Parser";
import { Serializer } from "@/network/gameopt/Serializer";
interface GameMode {
    id: number;
    label: string;
    mpDialogSettings: any;
}
interface GameModes {
    getAll(): GameMode[];
    getById(id: number): GameMode;
}
interface MapListEntry {
    fileName: string;
    maxSlots: number;
    getFullMapTitle(strings: any): string;
}
interface MapList {
    getAll(): MapListEntry[];
    getByName(name: string): MapListEntry;
}
interface MapFileLoader {
    load(mapName: string): Promise<any>;
}
interface RootController {
    createGame(gameId: string, timestamp: number, gservUrl: string, username: string, gameOpts: GameOpts, singlePlayer: boolean, tournament: boolean, mapTransfer: boolean, privateGame: boolean, fallbackRoute: MainMenuRoute): void;
}
interface ErrorHandler {
    handle(error: any, message: string, onClose: () => void): void;
}
interface MessageBoxApi {
    show(message: string, buttonText?: string, onClose?: () => void): void;
    confirm(message: string, confirmText: string, cancelText: string): Promise<boolean>;
}
interface LocalPrefs {
    getItem(key: string): string | undefined;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
interface Rules {
    getMultiplayerCountries(): any[];
    getMultiplayerColors(): Map<number, any>;
    mpDialogSettings: any;
}
interface SkirmishUnstackParams {
    gameMode: GameMode;
    mapName: string;
    changedMapFile?: any;
}
export class SkirmishScreen extends MainMenuScreen {
    declare public musicType: MusicType;
    private rootController: RootController;
    private errorHandler: ErrorHandler;
    private messageBoxApi: MessageBoxApi;
    private strings: any;
    private rules: Rules;
    private jsxRenderer: any;
    private mapFileLoader: MapFileLoader;
    private mapList: MapList;
    private gameModes: GameModes;
    private localPrefs: LocalPrefs;
    private playerName: string = "Player 1";
    private disposables: CompositeDisposable = new CompositeDisposable();
    private gameOpts!: GameOpts;
    private slotsInfo!: SlotInfo[];
    private currentMapFile?: any;
    private preferredHostOpts?: PreferredHostOpts;
    private formModel?: any;
    private lobbyForm?: any;
    constructor(rootController: RootController, errorHandler: ErrorHandler, messageBoxApi: MessageBoxApi, strings: any, rules: Rules, jsxRenderer: any, mapFileLoader: MapFileLoader, mapList: MapList, gameModes: GameModes, localPrefs: LocalPrefs) {
        super();
        this.rootController = rootController;
        this.errorHandler = errorHandler;
        this.messageBoxApi = messageBoxApi;
        this.strings = strings;
        this.rules = rules;
        this.jsxRenderer = jsxRenderer;
        this.mapFileLoader = mapFileLoader;
        this.mapList = mapList;
        this.gameModes = gameModes;
        this.localPrefs = localPrefs;
        this.title = this.strings.get("GUI:SkirmishGame");
        this.musicType = MusicType.Intro;
    }
    onEnter(): void {
        this.controller.toggleMainVideo(false);
        this.lobbyForm = undefined;
        this.initFormModel();
        this.createGame();
    }
    private async createGame(): Promise<void> {
        try {
            await this.initOptions();
        }
        catch (error) {
            this.handleError(error, (error as any)?.name === 'DownloadError'
                ? this.strings.get("TXT_DOWNLOAD_FAILED")
                : this.strings.get("WOL:MatchErrorCreatingGame"));
            return;
        }
        this.updateMapPreview();
        this.updateFormModel();
        this.controller.toggleSidebarPreview(true);
        this.initView();
    }
    onViewportChange(): void {
    }
    async onStack(): Promise<void> {
        await this.unrender();
    }
    onUnstack(params?: SkirmishUnstackParams): void {
        if (params) {
            const modeChanged = params.gameMode.id !== this.gameOpts.gameMode;
            this.gameOpts.gameMode = params.gameMode.id;
            const mapEntry = this.mapList.getByName(params.mapName);
            const mapFile = params.changedMapFile ?? this.currentMapFile;
            this.currentMapFile = mapFile;
            const lastUsedSlotIndex = findIndexReverse(this.slotsInfo, (slot) => slot.type === NetSlotType.Ai ||
                slot.type === NetSlotType.Player ||
                slot.type === NetSlotType.Open);
            const observerBonus = this.isHumanObserver() ? 1 : 0;
            const slotsToClose = Math.max(0, lastUsedSlotIndex + 1 - (mapEntry.maxSlots + observerBonus));
            for (let i = 0; i < slotsToClose; i++) {
                this.slotsInfo[lastUsedSlotIndex - i].type = NetSlotType.Closed;
                this.gameOpts.aiPlayers[lastUsedSlotIndex - i] = undefined;
            }
            const mpDialogSettings = this.gameModes.getById(this.gameOpts.gameMode).mpDialogSettings;
            [...this.gameOpts.humanPlayers, ...this.gameOpts.aiPlayers].forEach((player) => {
                if (player) {
                    if (player.startPos > mapEntry.maxSlots - 1) {
                        player.startPos = RANDOM_START_POS;
                    }
                    if (modeChanged) {
                        player.teamId = mpDialogSettings.alliesAllowed && mpDialogSettings.mustAlly ? 0 : NO_TEAM_ID;
                    }
                }
            });
            this.applyGameOption((opts) => {
                opts.mapName = mapEntry.fileName;
                opts.mapDigest = MapDigest.compute(mapFile);
                opts.mapSizeBytes = mapFile.getSize();
                opts.mapTitle = mapEntry.getFullMapTitle(this.strings);
                opts.maxSlots = mapEntry.maxSlots;
                opts.mapOfficial = (mapEntry as any).official ?? false;
            });
            this.localPrefs.setItem(StorageKey.LastMap, mapEntry.fileName);
            this.localPrefs.setItem(StorageKey.LastMode, String(params.gameMode.id));
            this.saveBotSettings();
        }
        this.updateMapPreview();
        this.initView();
    }
    private isHumanObserver(): boolean {
        return this.gameOpts?.humanPlayers?.[0]?.countryId === OBS_COUNTRY_ID;
    }
    private sanitizeLastBotSettings(aiPlayers: (any | undefined)[], savedColor: string | undefined, savedStartPos: string | undefined, maxSlots: number, mpDialogSettings: any, humanIsObserver: boolean = false): void {
        const maxAi = humanIsObserver ? maxSlots : maxSlots - 1;
        let aiCount = 0;
        for (let index = 0; index < aiPlayers.length; ++index) {
            if (aiPlayers[index]) {
                aiCount += 1;
                if (aiCount > maxAi) {
                    aiPlayers[index] = undefined;
                }
            }
        }
        const usedColors = savedColor !== undefined ? [Number(savedColor)] : [];
        const usedStartPositions = savedStartPos !== undefined ? [Number(savedStartPos)] : [];
        for (const ai of aiPlayers) {
            if (!ai) {
                continue;
            }
            if (ai.difficulty !== AiDifficulty.Easy && ai.difficulty !== AiDifficulty.Normal && ai.difficulty !== AiDifficulty.Custom) {
                ai.difficulty = AiDifficulty.Easy;
            }
            if (ai.countryId !== undefined && ai.countryId >= this.getAvailablePlayerCountries().length) {
                ai.countryId = RANDOM_COUNTRY_ID;
            }
            if (ai.colorId !== undefined && ai.colorId !== RANDOM_COLOR_ID) {
                if (ai.colorId >= this.getAvailablePlayerColors().length || usedColors.includes(ai.colorId)) {
                    ai.colorId = RANDOM_COLOR_ID;
                }
                else {
                    usedColors.push(ai.colorId);
                }
            }
            if (ai.startPos !== undefined && ai.startPos !== RANDOM_START_POS) {
                if (ai.startPos >= this.getAvailableStartPositionsForMax(maxSlots).length || usedStartPositions.includes(ai.startPos)) {
                    ai.startPos = RANDOM_START_POS;
                }
                else {
                    usedStartPositions.push(ai.startPos);
                }
            }
            if (ai.teamId !== NO_TEAM_ID) {
                if (ai.teamId >= 4 || !mpDialogSettings.alliesAllowed) {
                    ai.teamId = mpDialogSettings.mustAlly ? 3 : NO_TEAM_ID;
                }
            }
            else if (mpDialogSettings.mustAlly) {
                ai.teamId = 3;
            }
        }
    }
    private async initOptions(): Promise<void> {
        const savedOpts = this.localPrefs.getItem(StorageKey.PreferredGameOpts);
        const savedCountry = this.localPrefs.getItem(StorageKey.LastPlayerCountry);
        const savedColor = this.localPrefs.getItem(StorageKey.LastPlayerColor);
        const savedStartPos = this.localPrefs.getItem(StorageKey.LastPlayerStartPos);
        const savedTeam = this.localPrefs.getItem(StorageKey.LastPlayerTeam);
        const savedMap = this.localPrefs.getItem(StorageKey.LastMap);
        const savedMode = this.localPrefs.getItem(StorageKey.LastMode);
        const savedBots = this.localPrefs.getItem(StorageKey.LastBots);
        let selectedMap = savedMap ? this.mapList.getByName(savedMap) : undefined;
        let selectedModeId = selectedMap && savedMode && this.gameModes.getAll().find(m => m.id === Number(savedMode)) ? Number(savedMode) : 1;
        let selectedMode = this.gameModes.getById(selectedModeId);
        if (!selectedMap || !(selectedMap as any)?.gameModes?.find((mode: any) => mode.mapFilter === (selectedMode as any).mapFilter)) {
            selectedModeId = 1;
            selectedMode = this.gameModes.getById(selectedModeId);
            selectedMap = this.mapList
                .getAll()
                .find((map) => (map as any).gameModes?.find((mode: any) => (selectedMode as any).mapFilter === mode.mapFilter));
        }
        this.currentMapFile = await this.mapFileLoader.load(selectedMap!.fileName);
        const preferredOpts = (this.preferredHostOpts = new PreferredHostOpts());
        if (savedOpts) {
            preferredOpts.unserialize(savedOpts);
        }
        else {
            preferredOpts.applyMpDialogSettings(this.rules.mpDialogSettings);
        }
        const mpDialogSettings = this.gameModes.getById(selectedModeId).mpDialogSettings;
        const lastBots = savedBots ? new Parser().parseAiOpts(savedBots) : undefined;
        const defaultAiDifficulty = AiDifficulty.Easy;
        const humanCountryId = savedCountry !== undefined &&
            Number(savedCountry) < this.getAvailablePlayerCountries().length
            ? Number(savedCountry)
            : RANDOM_COUNTRY_ID;
        const humanIsObserver = humanCountryId === OBS_COUNTRY_ID;
        const effectiveMaxSlots = humanIsObserver ? selectedMap!.maxSlots + 1 : selectedMap!.maxSlots;
        if (lastBots) {
            this.sanitizeLastBotSettings(lastBots, savedColor, savedStartPos, selectedMap!.maxSlots, mpDialogSettings, humanIsObserver);
        }
        this.gameOpts = {
            gameMode: selectedModeId,
            shortGame: preferredOpts.shortGame,
            mcvRepacks: preferredOpts.mcvRepacks,
            cratesAppear: preferredOpts.cratesAppear,
            superWeapons: preferredOpts.superWeapons,
            gameSpeed: preferredOpts.gameSpeed,
            credits: preferredOpts.credits,
            unitCount: preferredOpts.unitCount,
            buildOffAlly: preferredOpts.buildOffAlly,
            hostTeams: false,
            destroyableBridges: preferredOpts.destroyableBridges,
            multiEngineer: preferredOpts.multiEngineer,
            noDogEngiKills: preferredOpts.noDogEngiKills,
            humanPlayers: [
                {
                    name: this.playerName,
                    countryId: savedCountry !== undefined &&
                        Number(savedCountry) < this.getAvailablePlayerCountries().length
                        ? Number(savedCountry)
                        : RANDOM_COUNTRY_ID,
                    colorId: savedColor !== undefined &&
                        Number(savedColor) < this.getAvailablePlayerColors().length
                        ? Number(savedColor)
                        : RANDOM_COLOR_ID,
                    startPos: savedStartPos !== undefined &&
                        Number(savedStartPos) < this.getAvailableStartPositionsForMax(selectedMap!.maxSlots).length
                        ? Number(savedStartPos)
                        : RANDOM_START_POS,
                    teamId: savedTeam !== undefined && mpDialogSettings.alliesAllowed && Number(savedTeam) < 4
                        ? Number(savedTeam)
                        : mpDialogSettings.mustAlly ? 0 : NO_TEAM_ID,
                },
            ],
            aiPlayers: new Array(8).fill(undefined).map((_, index) => {
                if (index && !(index > effectiveMaxSlots - 1)) {
                    const difficulty = index > 1 || lastBots ? lastBots?.[index]?.difficulty : defaultAiDifficulty;
                    if (difficulty !== undefined) {
                        return {
                            difficulty,
                            countryId: lastBots?.[index]?.countryId ?? RANDOM_COUNTRY_ID,
                            colorId: lastBots?.[index]?.colorId ?? RANDOM_COLOR_ID,
                            startPos: lastBots?.[index]?.startPos ?? RANDOM_START_POS,
                            teamId: lastBots?.[index]?.teamId ?? (mpDialogSettings.mustAlly ? 3 : NO_TEAM_ID),
                        } as any;
                    }
                }
                return undefined;
            }),
            mapName: selectedMap!.fileName,
            mapDigest: MapDigest.compute(this.currentMapFile),
            mapSizeBytes: this.currentMapFile.getSize(),
            mapTitle: selectedMap!.getFullMapTitle(this.strings),
            maxSlots: selectedMap!.maxSlots,
            mapOfficial: (selectedMap! as any).official ?? false,
        };
        this.slotsInfo = [{ type: NetSlotType.Player, name: this.playerName }];
        for (let i = 1; i < 8; ++i) {
            if (i < effectiveMaxSlots && this.gameOpts.aiPlayers[i]) {
                this.slotsInfo.push({ type: NetSlotType.Ai, difficulty: (this.gameOpts.aiPlayers[i] as any).difficulty });
            }
            else {
                const type = i < effectiveMaxSlots
                    ? (preferredOpts.slotsClosed.has(i) ? NetSlotType.Closed : NetSlotType.Open)
                    : NetSlotType.Closed;
                this.slotsInfo.push({ type });
            }
        }
        this.syncDebugState();
    }
    private initFormModel(): void {
        const mpDialogSettings = this.rules.mpDialogSettings;
        const countryUiNameEntries: [
            string,
            string
        ][] = [
            [RANDOM_COUNTRY_NAME, RANDOM_COUNTRY_UI_NAME],
            [OBS_COUNTRY_NAME, OBS_COUNTRY_UI_NAME],
            ...this.getAvailablePlayerCountryRules().map((c: any) => [c.name, c.uiName] as [
                string,
                string
            ]),
        ];
        const countryUiTooltipEntries: [
            string,
            string
        ][] = [
            [RANDOM_COUNTRY_NAME, RANDOM_COUNTRY_UI_TOOLTIP],
            [OBS_COUNTRY_NAME, OBS_COUNTRY_UI_TOOLTIP],
            ...this.getAvailablePlayerCountryRules()
                .filter((c: any) => c.uiTooltip)
                .map((c: any) => [c.name, c.uiTooltip] as [
                string,
                string
            ]),
        ];
        this.formModel = {
            strings: this.strings,
            countryUiNames: new Map<string, string>(countryUiNameEntries),
            countryUiTooltips: new Map<string, string>(countryUiTooltipEntries),
            availablePlayerCountries: [RANDOM_COUNTRY_NAME, OBS_COUNTRY_NAME].concat(this.getAvailablePlayerCountries()),
            availablePlayerColors: [],
            availableAiNames: new Map([...aiUiNames.entries()]),
            availableStartPositions: [],
            maxTeams: 4,
            lobbyType: LobbyType.Singleplayer,
            mpDialogSettings: mpDialogSettings,
            onCountrySelect: this.handleCountrySelect.bind(this),
            onColorSelect: this.handleColorSelect.bind(this),
            onStartPosSelect: this.handleStartPosSelect.bind(this),
            onTeamSelect: this.handleTeamSelect.bind(this),
            onSlotChange: this.handleSlotChange.bind(this),
            onToggleShortGame: (value: boolean) => this.applyGameOption((opts) => (opts.shortGame = value)),
            onToggleMcvRepacks: (value: boolean) => this.applyGameOption((opts) => (opts.mcvRepacks = value)),
            onToggleCratesAppear: (value: boolean) => this.applyGameOption((opts) => (opts.cratesAppear = value)),
            onToggleSuperWeapons: (value: boolean) => this.applyGameOption((opts) => (opts.superWeapons = value)),
            onToggleBuildOffAlly: (value: boolean) => this.applyGameOption((opts) => (opts.buildOffAlly = value)),
            onToggleHostTeams: (value: boolean) => this.applyGameOption((opts) => (opts.hostTeams = value)),
            onToggleDestroyableBridges: (value: boolean) => this.applyGameOption((opts) => (opts.destroyableBridges = value)),
            onToggleMultiEngineer: (value: boolean) => this.applyGameOption((opts) => (opts.multiEngineer = value)),
            onToggleNoDogEngiKills: (value: boolean) => this.applyGameOption((opts) => (opts.noDogEngiKills = value)),
            onChangeGameSpeed: (value: number) => this.applyGameOption((opts) => (opts.gameSpeed = value)),
            onChangeCredits: (value: number) => this.applyGameOption((opts) => (opts.credits = value)),
            onChangeUnitCount: (value: number) => this.applyGameOption((opts) => (opts.unitCount = value)),
            activeSlotIndex: 0,
            teamsAllowed: true,
            teamsRequired: false,
            playerSlots: [],
            shortGame: true,
            mcvRepacks: true,
            cratesAppear: true,
            superWeapons: true,
            buildOffAlly: true,
            hostTeams: false,
            destroyableBridges: true,
            multiEngineer: false,
            multiEngineerCount: Math.ceil((1 - ((this.rules as any).general?.engineerCaptureLevel || 0.5)) /
                ((this.rules as any).general?.engineerDamage || 0.25)) + 1,
            noDogEngiKills: false,
            gameSpeed: 6,
            credits: mpDialogSettings.money,
            unitCount: mpDialogSettings.unitCount,
        };
        this.syncDebugState();
    }
    private getAvailablePlayerCountries(): string[] {
        return this.rules.getMultiplayerCountries().map((country: any) => country.name);
    }
    private getAvailablePlayerColors(): string[] {
        return [...this.rules.getMultiplayerColors().values()].map((color: any) => color.asHexString());
    }
    private getAvailableStartPositionsForMax(maxSlots: number): number[] {
        return new Array(maxSlots).fill(0).map((_, index) => index);
    }
    private getAvailablePlayerCountryRules(): any[] {
        return this.rules.getMultiplayerCountries();
    }
    private applyGameOption(modifier: (opts: GameOpts) => void): void {
        modifier(this.gameOpts);
        this.updateFormModel();
        this.savePreferences();
    }
    private handleCountrySelect(countryName: string, slotIndex: number): void {
        const wasObserver = this.isHumanObserver();
        this.updatePlayerInfo(this.getCountryIdByName(countryName), this.getColorIdByName(this.formModel.playerSlots[slotIndex].color), this.formModel.playerSlots[slotIndex].startPos, this.formModel.playerSlots[slotIndex].team, slotIndex);
        const isNowObserver = this.isHumanObserver();
        if (!wasObserver && isNowObserver) {
            // Switching to observer: open the extra slot so all map positions can be AI
            const extraSlotIdx = this.gameOpts.maxSlots;
            if (extraSlotIdx < 8 && this.slotsInfo[extraSlotIdx]?.type === NetSlotType.Closed) {
                this.slotsInfo[extraSlotIdx].type = NetSlotType.Open;
            }
        } else if (wasObserver && !isNowObserver) {
            // Switching from observer: close the extra slot
            const extraSlotIdx = this.gameOpts.maxSlots;
            if (extraSlotIdx < 8) {
                this.slotsInfo[extraSlotIdx].type = NetSlotType.Closed;
                this.gameOpts.aiPlayers[extraSlotIdx] = undefined as any;
            }
        }
        this.updateFormModel();
    }
    private handleColorSelect(colorName: string, slotIndex: number): void {
        this.updatePlayerInfo(this.getCountryIdByName(this.formModel.playerSlots[slotIndex].country), this.getColorIdByName(colorName), this.formModel.playerSlots[slotIndex].startPos, this.formModel.playerSlots[slotIndex].team, slotIndex);
        this.updateFormModel();
    }
    private handleStartPosSelect(startPos: number, slotIndex: number): void {
        this.updatePlayerInfo(this.getCountryIdByName(this.formModel.playerSlots[slotIndex].country), this.getColorIdByName(this.formModel.playerSlots[slotIndex].color), startPos, this.formModel.playerSlots[slotIndex].team, slotIndex);
    }
    private handleTeamSelect(teamId: number, slotIndex: number): void {
        if (teamId === OBS_TEAM_ID) {
            if (slotIndex === 0 && !this.isHumanObserver()) {
                this.handleCountrySelect(OBS_COUNTRY_NAME, slotIndex);
            }
            return;
        }
        if (slotIndex === 0 && this.isHumanObserver()) {
            this.updatePlayerInfo(
                RANDOM_COUNTRY_ID,
                this.getColorIdByName(this.formModel.playerSlots[slotIndex].color),
                this.formModel.playerSlots[slotIndex].startPos,
                teamId,
                slotIndex
            );
            const extraSlotIdx = this.gameOpts.maxSlots;
            if (extraSlotIdx < 8) {
                this.slotsInfo[extraSlotIdx].type = NetSlotType.Closed;
                this.gameOpts.aiPlayers[extraSlotIdx] = undefined as any;
            }
            this.updateFormModel();
            return;
        }
        this.updatePlayerInfo(this.getCountryIdByName(this.formModel.playerSlots[slotIndex].country), this.getColorIdByName(this.formModel.playerSlots[slotIndex].color), this.formModel.playerSlots[slotIndex].startPos, teamId, slotIndex);
    }
    private handleSlotChange(occupation: SlotOccupation, slotIndex: number, aiDifficulty?: any): void {
        this.changeSlotType(occupation, slotIndex, aiDifficulty);
        this.saveBotSettings();
    }
    private changeSlotType(occupation: SlotOccupation, slotIndex: number, aiDifficulty?: any): void {
        if (slotIndex === 0) {
            throw new Error("Change slot type of host");
        }
        if (occupation === SlotOccupation.Occupied && aiDifficulty !== undefined) {
            const mpDialogSettings = this.gameModes.getById(this.gameOpts.gameMode).mpDialogSettings;
            const slot = this.slotsInfo[slotIndex];
            slot.type = NetSlotType.Ai;
            slot.difficulty = aiDifficulty;
            if (!this.gameOpts.aiPlayers[slotIndex]) {
                this.gameOpts.aiPlayers[slotIndex] = {
                    difficulty: aiDifficulty,
                    countryId: RANDOM_COUNTRY_ID,
                    colorId: RANDOM_COLOR_ID,
                    startPos: RANDOM_START_POS,
                    teamId: mpDialogSettings.mustAlly ? 3 : NO_TEAM_ID,
                } as any;
            }
            this.gameOpts.aiPlayers[slotIndex]!.difficulty = aiDifficulty;
        }
        if (occupation === SlotOccupation.Closed) {
            this.slotsInfo[slotIndex].type = NetSlotType.Closed;
            this.gameOpts.aiPlayers[slotIndex] = undefined as any;
        }
        this.updateFormModel();
    }
    private getCountryNameById(countryId: number): string {
        if (countryId === RANDOM_COUNTRY_ID)
            return RANDOM_COUNTRY_NAME;
        if (countryId === OBS_COUNTRY_ID)
            return OBS_COUNTRY_NAME;
        return this.getAvailablePlayerCountries()[countryId];
    }
    private getCountryIdByName(name: string): number {
        if (name === RANDOM_COUNTRY_NAME)
            return RANDOM_COUNTRY_ID;
        if (name === OBS_COUNTRY_NAME)
            return OBS_COUNTRY_ID;
        const idx = this.getAvailablePlayerCountries().indexOf(name);
        return idx;
    }
    private getColorNameById(colorId: number): string {
        return colorId === RANDOM_COLOR_ID ? RANDOM_COLOR_NAME : this.getAvailablePlayerColors()[colorId];
    }
    private getColorIdByName(name: string): number {
        if (name === RANDOM_COLOR_NAME)
            return RANDOM_COLOR_ID;
        const idx = this.getAvailablePlayerColors().indexOf(name);
        if (idx === -1)
            throw new Error(`Color ${name} not found in available player colors`);
        return idx;
    }
    private getSelectablePlayerColors(playerSlots: any[]): string[] {
        const usedColors: string[] = [];
        playerSlots.forEach((slot) => {
            if (slot)
                usedColors.push(slot.color);
        });
        const available = this.getAvailablePlayerColors();
        return [RANDOM_COLOR_NAME].concat(available.filter((c) => c && !usedColors.includes(c)));
    }
    private getSelectableStartPositions(playerSlots: any[], maxSlots: number): number[] {
        const used: number[] = [];
        playerSlots.forEach((slot) => {
            if (slot)
                used.push(slot.startPos);
        });
        const positions = this.getAvailableStartPositionsForMax(maxSlots);
        return [RANDOM_START_POS].concat(positions.filter((p) => !used.includes(p)));
    }
    private updatePlayerInfo(countryId: number, colorId: number, startPos: number, teamId: number, slotIndex: number): void {
        const slot = this.slotsInfo[slotIndex];
        if (slot.type === NetSlotType.Ai) {
            const ai = this.gameOpts.aiPlayers[slotIndex];
            if (!ai)
                throw new Error("No AI found on slot " + slotIndex);
            ai.countryId = countryId;
            ai.colorId = colorId;
            ai.startPos = startPos;
            ai.teamId = teamId;
            this.saveBotSettings();
        }
        else if (slot.type === NetSlotType.Player) {
            const human = this.gameOpts.humanPlayers.find((p) => p.name === slot.name);
            if (!human)
                throw new Error("No player found on slot " + slotIndex);
            human.countryId = countryId;
            human.colorId = colorId;
            human.startPos = startPos;
            human.teamId = teamId;
            if (countryId !== RANDOM_COUNTRY_ID) {
                this.localPrefs.setItem(StorageKey.LastPlayerCountry, String(countryId));
            }
            else {
                this.localPrefs.removeItem(StorageKey.LastPlayerCountry);
            }
            if (colorId !== RANDOM_COLOR_ID) {
                this.localPrefs.setItem(StorageKey.LastPlayerColor, String(colorId));
            }
            else {
                this.localPrefs.removeItem(StorageKey.LastPlayerColor);
            }
            if (startPos !== RANDOM_START_POS) {
                this.localPrefs.setItem(StorageKey.LastPlayerStartPos, String(startPos));
            }
            else {
                this.localPrefs.removeItem(StorageKey.LastPlayerStartPos);
            }
            if (teamId !== NO_TEAM_ID) {
                this.localPrefs.setItem(StorageKey.LastPlayerTeam, String(teamId));
            }
            else {
                this.localPrefs.removeItem(StorageKey.LastPlayerTeam);
            }
        }
        else {
            throw new Error("Unexpected slot type " + slot.type);
        }
        this.updateFormModel();
    }
    private updateFormModel(): void {
        const e = this.gameOpts;
        this.formModel.gameSpeed = e.gameSpeed;
        this.formModel.credits = e.credits;
        this.formModel.unitCount = e.unitCount;
        this.formModel.shortGame = e.shortGame;
        this.formModel.superWeapons = e.superWeapons;
        this.formModel.buildOffAlly = e.buildOffAlly;
        this.formModel.mcvRepacks = e.mcvRepacks;
        this.formModel.cratesAppear = e.cratesAppear;
        this.formModel.destroyableBridges = e.destroyableBridges;
        this.formModel.multiEngineer = e.multiEngineer;
        this.formModel.noDogEngiKills = e.noDogEngiKills;
        const observerActive = this.isHumanObserver();
        let remaining = observerActive ? e.maxSlots + 1 : e.maxSlots;
        this.slotsInfo.forEach((_, t) => {
            if (remaining) {
                remaining--;
                this.formModel.playerSlots[t] = {
                    country: RANDOM_COUNTRY_NAME,
                    color: RANDOM_COLOR_NAME,
                    startPos: RANDOM_START_POS,
                    team: NO_TEAM_ID,
                };
            }
            else {
                this.formModel.playerSlots[t] = undefined;
            }
        });
        this.slotsInfo.forEach((slot, i) => {
            if (!this.formModel.playerSlots[i])
                return;
            const s = this.formModel.playerSlots[i];
            if (slot.type === NetSlotType.Closed)
                s.occupation = SlotOccupation.Closed;
            else if (slot.type === NetSlotType.Open || (slot as any).type === NetSlotType.OpenObserver)
                s.occupation = SlotOccupation.Open;
            else
                s.occupation = SlotOccupation.Occupied;
            if (slot.type === NetSlotType.Ai) {
                s.aiDifficulty = slot.difficulty;
                s.type = UiSlotType.Ai;
            }
            else if (slot.type === NetSlotType.Player) {
                s.name = slot.name;
                s.type = UiSlotType.Player;
            }
            s.status = PlayerStatus.NotReady;
        });
        const humans = this.gameOpts ? this.gameOpts.humanPlayers : [];
        const ais = this.gameOpts ? this.gameOpts.aiPlayers : [];
        const mp = this.gameModes.getById(this.gameOpts.gameMode).mpDialogSettings;
        this.formModel.playerSlots.forEach((ps: any, idx: number) => {
            if (!ps)
                return;
            if (ps.occupation === SlotOccupation.Occupied) {
                let h = humans.find((p: any) => p.name === ps.name);
                if (h) {
                    ps.country = this.getCountryNameById(h.countryId);
                    ps.color = this.getColorNameById(h.colorId);
                    ps.startPos = h.startPos;
                    ps.team = h.teamId;
                    return;
                }
                const a = ais[idx];
                if (a) {
                    ps.country = this.getCountryNameById(a.countryId);
                    ps.color = this.getColorNameById(a.colorId);
                    ps.startPos = a.startPos;
                    ps.team = a.teamId;
                }
            }
            else {
                ps.country = RANDOM_COUNTRY_NAME;
                ps.team = mp.mustAlly ? 0 : NO_TEAM_ID;
            }
        });
        this.formModel.availablePlayerColors = this.getSelectablePlayerColors(this.formModel.playerSlots);
        this.formModel.availableStartPositions = this.getSelectableStartPositions(this.formModel.playerSlots, e.maxSlots);
        this.formModel.teamsAllowed = this.gameModes.getById(e.gameMode).mpDialogSettings.alliesAllowed;
        this.formModel.teamsRequired = this.gameModes.getById(e.gameMode).mpDialogSettings.mustAlly;
        this.syncDebugState();
        this.lobbyForm && this.lobbyForm.refresh();
    }
    private saveBotSettings(): void {
        this.localPrefs.setItem(StorageKey.LastBots, new Serializer().serializeAiOpts(this.gameOpts.aiPlayers));
    }
    private savePreferences(): void {
        this.localPrefs.setItem(StorageKey.PreferredGameOpts, this.preferredHostOpts!.applyGameOpts(this.gameOpts).serialize());
    }
    private syncDebugState(): void {
        const debugRoot = ((window as any).__ra2debug ??= {});
        debugRoot.skirmishLobby = {
            gameOpts: this.gameOpts ? JSON.parse(JSON.stringify(this.gameOpts)) : undefined,
            slotsInfo: this.slotsInfo ? JSON.parse(JSON.stringify(this.slotsInfo)) : undefined,
            formModel: this.formModel ? {
                playerSlots: JSON.parse(JSON.stringify(this.formModel.playerSlots ?? [])),
                availablePlayerCountries: [...(this.formModel.availablePlayerCountries ?? [])],
                availablePlayerColors: [...(this.formModel.availablePlayerColors ?? [])],
                availableStartPositions: [...(this.formModel.availableStartPositions ?? [])],
                teamsAllowed: this.formModel.teamsAllowed,
                teamsRequired: this.formModel.teamsRequired,
                gameSpeed: this.formModel.gameSpeed,
                credits: this.formModel.credits,
                unitCount: this.formModel.unitCount,
            } : undefined,
            startGame: () => this.handleStartGame(),
        };
    }
    private initView(): void {
        this.initLobbyForm();
        this.refreshSidebarButtons();
        this.refreshSidebarMpText();
        this.controller.showSidebarButtons();
    }
    private initLobbyForm(): void {
        const [component] = this.jsxRenderer.render(jsx(HtmlView, {
            innerRef: (ref: any) => (this.lobbyForm = ref),
            component: LobbyForm,
            props: this.formModel,
        }));
        this.controller.setMainComponent(component);
    }
    private refreshSidebarButtons(): void {
        this.controller.setSidebarButtons([
            {
                label: this.strings.get("GUI:StartGame"),
                tooltip: this.strings.get("STT:SkirmishButtonStartGame"),
                onClick: () => {
                    this.handleStartGame();
                },
            },
            {
                label: this.strings.get("GUI:ChooseMap"),
                tooltip: this.strings.get("STT:SkirmishButtonChooseMap"),
                onClick: () => {
                    this.controller?.pushScreen(MainMenuScreenType.MapSelection, {
                        lobbyType: LobbyType.Singleplayer,
                        gameOpts: this.gameOpts,
                        usedSlots: () => 1 + findIndexReverse(this.slotsInfo, (slot) => slot.type === NetSlotType.Ai || slot.type === NetSlotType.Player),
                    });
                },
            },
            {
                label: this.strings.get("GUI:BotUpload") || "Upload AI Bot",
                tooltip: this.strings.get("STT:SkirmishButtonUploadBot") || "Upload a custom AI bot script package",
                onClick: () => {
                    this.showBotUploadDialog();
                },
            },
            {
                label: this.strings.get("GUI:Back"),
                tooltip: this.strings.get("STT:SkirmishButtonBack"),
                isBottom: true,
                onClick: () => {
                    this.controller?.goToScreen(MainMenuScreenType.Home);
                },
            },
        ], true);
    }
    private refreshSidebarMpText(): void {
        if (this.gameOpts) {
            this.controller.setSidebarMpContent({
                text: this.strings.get(this.gameModes.getById(this.gameOpts.gameMode).label) +
                    "\n\n" +
                    this.gameOpts.mapTitle,
                icon: this.gameOpts.mapOfficial ? "gt18.pcx" : "settings.png",
                tooltip: this.gameOpts.mapOfficial
                    ? this.strings.get("STT:VerifiedMap")
                    : this.strings.get("STT:UnverifiedMap"),
            });
        }
        else {
            this.controller.setSidebarMpContent({ text: "" });
        }
    }
    private updateMapPreview(): void {
        try {
            const preview = new MapPreviewRenderer(this.strings).render(new MapFile(this.currentMapFile), LobbyType.Singleplayer, this.controller.getSidebarPreviewSize());
            this.controller.setSidebarPreview(preview);
        }
        catch (error) {
            console.error("Failed to render map preview");
            console.error(error);
            this.controller.setSidebarPreview();
        }
    }
    private handleStartGame(): void {
        const aiCount = this.gameOpts.aiPlayers.filter(isNotNullOrUndefined).length;
        const humanIsObserver = this.gameOpts.humanPlayers.length > 0
            && this.gameOpts.humanPlayers[0].countryId === OBS_COUNTRY_ID;
        const minAiRequired = humanIsObserver ? 2 : 1;
        if (aiCount < minAiRequired) {
            this.messageBoxApi.show(this.strings.get("TXT_NEED_AT_LEAST_TWO_PLAYERS"), this.strings.get("GUI:Ok"));
            return;
        }
        if (!this.meetsMinimumTeams()) {
            this.messageBoxApi.show(this.strings.get("TXT_CANNOT_ALLY"), this.strings.get("GUI:Ok"));
            return;
        }
        const gameId = "0";
        const timestamp = Date.now();
        const fallbackRoute = new MainMenuRoute(MainMenuScreenType.Skirmish, {});
        this.rootController.createGame(gameId, timestamp, "", this.playerName, this.gameOpts, true, false, false, false, fallbackRoute);
    }
    private meetsMinimumTeams(): boolean {
        const allPlayers = [
            ...this.gameOpts.humanPlayers,
            ...this.gameOpts.aiPlayers,
        ]
            .filter(isNotNullOrUndefined)
            .filter((player) => player.countryId !== OBS_COUNTRY_ID);
        const firstTeamId = allPlayers[0].teamId;
        return firstTeamId === NO_TEAM_ID || allPlayers.some((player) => player.teamId !== firstTeamId);
    }
    private handleError(error: any, message: string): void {
        this.errorHandler.handle(error, message, () => {
            this.controller?.goToScreen(MainMenuScreenType.Home);
        });
    }
    private showBotUploadDialog(): void {
        const overlay = document.createElement('div');
        overlay.className = 'bot-upload-dialog-overlay';
        overlay.innerHTML = `
            <div class="bot-upload-dialog" onclick="event.stopPropagation()">
                <div class="bot-upload-header">
                    <h3>${this.strings.get("GUI:BotUpload:Title") || "Upload AI Bot Script"}</h3>
                    <button class="bot-upload-close" id="bot-upload-close-btn">×</button>
                </div>
                <div class="bot-upload-body">
                    <div class="bot-upload-section">
                        <label class="bot-upload-label">${this.strings.get("GUI:BotUpload:Select") || "Select Bot Zip File"}</label>
                        <input type="file" accept=".zip" class="bot-upload-input" id="bot-upload-file" />
                        <div class="bot-upload-hint">${this.strings.get("GUI:BotUpload:Hint") || "Upload a .zip file containing bot.ts or index.ts"}</div>
                    </div>
                    <div id="bot-upload-message"></div>
                    <div class="bot-upload-section">
                        <h4>${this.strings.get("GUI:BotUpload:Manage") || "Manage Bots"}</h4>
                        <div id="bot-upload-list"></div>
                    </div>
                </div>
                <div class="bot-upload-footer">
                    <button class="dialog-button" id="bot-upload-ok-btn">${this.strings.get("GUI:Ok") || "OK"}</button>
                </div>
            </div>
        `;

        const closeDialog = () => {
            overlay.remove();
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeDialog();
        });

        document.getElementById('ra2web-root')?.appendChild(overlay);

        document.getElementById('bot-upload-close-btn')?.addEventListener('click', closeDialog);
        document.getElementById('bot-upload-ok-btn')?.addEventListener('click', closeDialog);

        const fileInput = document.getElementById('bot-upload-file') as HTMLInputElement;
        fileInput?.addEventListener('change', async () => {
            const file = fileInput.files?.[0];
            if (!file) return;

            const msgDiv = document.getElementById('bot-upload-message');
            if (msgDiv) {
                msgDiv.innerHTML = '<div class="bot-upload-status">Loading...</div>';
            }

            try {
                const { BotUploader } = await import('@/game/ai/thirdpartbot/BotUploader');
                const result = await BotUploader.processUpload(file);

                if (result.success && result.meta && msgDiv) {
                    msgDiv.innerHTML = `<div class="bot-upload-message bot-upload-message-success">${this.strings.get("GUI:BotUpload:Success") || "Bot uploaded successfully!"}</div>`;
                    this.refreshBotList();
                } else if (msgDiv) {
                    msgDiv.innerHTML = `<div class="bot-upload-message bot-upload-message-error">${(result.errors || ["Upload failed"]).join("\\n")}</div>`;
                }
            } catch (e) {
                if (msgDiv) {
                    msgDiv.innerHTML = `<div class="bot-upload-message bot-upload-message-error">Error: ${(e as Error).message}</div>`;
                }
            }
            fileInput.value = '';
        });

        this.refreshBotList();
    }

    private refreshBotList(): void {
        const listDiv = document.getElementById('bot-upload-list');
        if (!listDiv) return;

        import('@/game/ai/thirdpartbot/BotRegistry').then(({ BotRegistry }) => {
            const bots = BotRegistry.getInstance().getUploadedBots();
            if (bots.length === 0) {
                listDiv.innerHTML = `<div class="bot-upload-empty">${this.strings.get("GUI:BotUpload:NoBot") || "No custom bots uploaded"}</div>`;
                return;
            }

            listDiv.innerHTML = bots.map(bot => `
                <div class="bot-upload-item">
                    <div class="bot-upload-item-info">
                        <span class="bot-upload-item-name">${bot.displayName}</span>
                        <span class="bot-upload-item-version">v${bot.version}</span>
                        <span class="bot-upload-item-author">by ${bot.author}</span>
                    </div>
                    <button class="bot-upload-item-remove" data-bot-id="${bot.id}">${this.strings.get("GUI:BotUpload:Remove") || "Remove"}</button>
                </div>
            `).join('');

            listDiv.querySelectorAll('.bot-upload-item-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    const botId = (btn as HTMLElement).dataset.botId;
                    if (botId) {
                        BotRegistry.getInstance().unregister(botId);
                        this.refreshBotList();
                    }
                });
            });
        });
    }
    async onLeave(): Promise<void> {
        this.disposables.dispose();
        this.currentMapFile = undefined;
        this.gameOpts = undefined as any;
        this.preferredHostOpts = undefined;
        this.slotsInfo = undefined as any;
        const debugRoot = (window as any).__ra2debug;
        if (debugRoot) {
            delete debugRoot.skirmishLobby;
        }
        this.controller.toggleSidebarPreview(false);
        await this.unrender();
    }
    private async unrender(): Promise<void> {
        await this.controller.hideSidebarButtons();
        this.lobbyForm = undefined;
    }
}
