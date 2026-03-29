import { StorageKey } from '@/LocalPrefs';
import { GameOpts, AiDifficulty } from '@/game/gameopts/GameOpts';
import {
    RANDOM_COUNTRY_ID,
    RANDOM_COLOR_ID,
    RANDOM_START_POS,
    NO_TEAM_ID,
    OBS_TEAM_ID,
    OBS_COUNTRY_ID,
    OBS_COUNTRY_NAME,
    RANDOM_COUNTRY_NAME,
    RANDOM_COUNTRY_UI_NAME,
    RANDOM_COUNTRY_UI_TOOLTIP,
    OBS_COUNTRY_UI_NAME,
    OBS_COUNTRY_UI_TOOLTIP,
    RANDOM_COLOR_NAME,
    aiUiNames,
} from '@/game/gameopts/constants';
import { LobbyType, SlotOccupation, PlayerStatus, SlotType as UiSlotType } from '@/gui/screen/mainMenu/lobby/component/viewmodel/lobby';
import { SlotType as NetSlotType, SlotInfo } from '@/network/gameopt/SlotInfo';
import { MapDigest } from '@/engine/MapDigest';
import { findIndexReverse } from '@/util/array';
import { PreferredHostOpts } from '@/gui/screen/mainMenu/lobby/PreferredHostOpts';
import { Parser } from '@/network/gameopt/Parser';
import { Serializer } from '@/network/gameopt/Serializer';

interface Rules {
    getMultiplayerCountries(): any[];
    getMultiplayerColors(): Map<number, any>;
    mpDialogSettings: any;
    general?: any;
}

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
    official?: boolean;
    getFullMapTitle(strings: any): string;
}

interface MapList {
    getAll(): MapListEntry[];
    getByName(name: string): MapListEntry | undefined;
}

interface MapFileLoader {
    load(mapName: string): Promise<any>;
}

interface LocalPrefs {
    getItem(key: string): string | undefined;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export interface PregameMapSelectionResult {
    gameMode: GameMode;
    mapName: string;
    changedMapFile?: any;
}

export interface PregameSnapshot {
    gameOpts: GameOpts;
    slotsInfo: SlotInfo[];
    currentMapFile?: any;
}

export interface PregameLobbyFormOptions {
    lobbyType: LobbyType;
    activeSlotIndex: number;
    selectedGameServer?: string;
    messages?: any[];
    localUsername?: string;
    channels?: any[];
    chatHistory?: any;
    onSendMessage?: (message: string) => void;
    onStateChange?: () => void;
    decoratePlayerSlot?: (playerSlot: any, slotInfo: SlotInfo | undefined, slotIndex: number) => void;
}

function cloneAiPlayer(ai: any) {
    return ai
        ? {
            difficulty: ai.difficulty,
            countryId: ai.countryId,
            colorId: ai.colorId,
            startPos: ai.startPos,
            teamId: ai.teamId,
        }
        : undefined;
}

function cloneHumanPlayer(player: any) {
    return {
        name: player.name,
        countryId: player.countryId,
        colorId: player.colorId,
        startPos: player.startPos,
        teamId: player.teamId,
    };
}

function cloneGameOpts(gameOpts: GameOpts): GameOpts {
    return {
        gameMode: gameOpts.gameMode,
        gameSpeed: gameOpts.gameSpeed,
        credits: gameOpts.credits,
        unitCount: gameOpts.unitCount,
        shortGame: gameOpts.shortGame,
        superWeapons: gameOpts.superWeapons,
        buildOffAlly: gameOpts.buildOffAlly,
        mcvRepacks: gameOpts.mcvRepacks,
        cratesAppear: gameOpts.cratesAppear,
        hostTeams: gameOpts.hostTeams,
        destroyableBridges: gameOpts.destroyableBridges,
        multiEngineer: gameOpts.multiEngineer,
        noDogEngiKills: gameOpts.noDogEngiKills,
        mapName: gameOpts.mapName,
        mapTitle: gameOpts.mapTitle,
        mapDigest: gameOpts.mapDigest,
        mapSizeBytes: gameOpts.mapSizeBytes,
        maxSlots: gameOpts.maxSlots,
        mapOfficial: gameOpts.mapOfficial,
        humanPlayers: gameOpts.humanPlayers.map(cloneHumanPlayer),
        aiPlayers: gameOpts.aiPlayers.map(cloneAiPlayer),
        unknown: gameOpts.unknown,
    };
}

function cloneSlotsInfo(slotsInfo: SlotInfo[]): SlotInfo[] {
    return slotsInfo.map((slot) => ({
        type: slot.type,
        name: slot.name,
        difficulty: slot.difficulty,
    }));
}

export class PregameController {
    private gameOpts?: GameOpts;
    private slotsInfo?: SlotInfo[];
    private currentMapFile?: any;
    private preferredHostOpts?: PreferredHostOpts;

    constructor(
        private readonly strings: any,
        private readonly rules: Rules,
        private readonly mapFileLoader: MapFileLoader,
        private readonly mapList: MapList,
        private readonly gameModes: GameModes,
        private readonly localPrefs: LocalPrefs,
        private readonly playerName: string
    ) {
    }

    async initialize(): Promise<void> {
        await this.initOptions();
    }

    isInitialized(): boolean {
        return Boolean(this.gameOpts && this.slotsInfo);
    }

    getSnapshot(): PregameSnapshot {
        return {
            gameOpts: cloneGameOpts(this.requireGameOpts()),
            slotsInfo: cloneSlotsInfo(this.requireSlotsInfo()),
            currentMapFile: this.currentMapFile,
        };
    }

    hydrate(snapshot: PregameSnapshot): void {
        this.gameOpts = cloneGameOpts(snapshot.gameOpts);
        this.slotsInfo = cloneSlotsInfo(snapshot.slotsInfo);
        this.currentMapFile = snapshot.currentMapFile;
    }

    getGameOpts(): GameOpts {
        return this.requireGameOpts();
    }

    getSlotsInfo(): SlotInfo[] {
        return this.requireSlotsInfo();
    }

    getCurrentMapFile(): any {
        return this.currentMapFile;
    }

    getUsedSlots(): number {
        return 1 + findIndexReverse(this.requireSlotsInfo(), (slot) => slot.type === NetSlotType.Ai || slot.type === NetSlotType.Player);
    }

    isHumanObserver(): boolean {
        return this.requireGameOpts().humanPlayers[0]?.countryId === OBS_COUNTRY_ID;
    }

    meetsMinimumTeams(): boolean {
        const gameOpts = this.requireGameOpts();
        const allPlayers = [
            ...gameOpts.humanPlayers,
            ...gameOpts.aiPlayers,
        ]
            .filter(Boolean)
            .filter((player: any) => player.countryId !== OBS_COUNTRY_ID);

        if (!allPlayers.length) {
            return false;
        }

        const firstTeamId = allPlayers[0].teamId;
        return firstTeamId === NO_TEAM_ID || allPlayers.some((player: any) => player.teamId !== firstTeamId);
    }

    updateSelfName(playerName: string): void {
        const gameOpts = this.requireGameOpts();
        const slotsInfo = this.requireSlotsInfo();
        const currentHuman = gameOpts.humanPlayers[0];
        if (!currentHuman || currentHuman.name === playerName) {
            return;
        }
        currentHuman.name = playerName;
        const hostSlot = slotsInfo.find((slot) => slot.type === NetSlotType.Player && slot.name === this.playerName) ?? slotsInfo[0];
        if (hostSlot) {
            hostSlot.name = playerName;
        }
    }

    applyMapSelection(params: PregameMapSelectionResult): void {
        const gameOpts = this.requireGameOpts();
        const slotsInfo = this.requireSlotsInfo();
        const modeChanged = params.gameMode.id !== gameOpts.gameMode;
        gameOpts.gameMode = params.gameMode.id;
        const mapEntry = this.mapList.getByName(params.mapName);
        if (!mapEntry) {
            throw new Error(`Map ${params.mapName} not found`);
        }
        const mapFile = params.changedMapFile ?? this.currentMapFile;
        this.currentMapFile = mapFile;
        const lastUsedSlotIndex = findIndexReverse(slotsInfo, (slot) => slot.type === NetSlotType.Ai ||
            slot.type === NetSlotType.Player ||
            slot.type === NetSlotType.Open);
        const observerBonus = this.isHumanObserver() ? 1 : 0;
        const slotsToClose = Math.max(0, lastUsedSlotIndex + 1 - (mapEntry.maxSlots + observerBonus));
        for (let index = 0; index < slotsToClose; index += 1) {
            slotsInfo[lastUsedSlotIndex - index].type = NetSlotType.Closed;
            gameOpts.aiPlayers[lastUsedSlotIndex - index] = undefined;
        }
        const mpDialogSettings = this.gameModes.getById(gameOpts.gameMode).mpDialogSettings;
        [...gameOpts.humanPlayers, ...gameOpts.aiPlayers].forEach((player: any) => {
            if (!player) {
                return;
            }
            if (player.startPos > mapEntry.maxSlots - 1) {
                player.startPos = RANDOM_START_POS;
            }
            if (modeChanged) {
                player.teamId = mpDialogSettings.alliesAllowed && mpDialogSettings.mustAlly ? 0 : NO_TEAM_ID;
            }
        });
        this.applyGameOption((opts) => {
            opts.mapName = mapEntry.fileName;
            opts.mapDigest = MapDigest.compute(mapFile);
            opts.mapSizeBytes = mapFile.getSize();
            opts.mapTitle = mapEntry.getFullMapTitle(this.strings);
            opts.maxSlots = mapEntry.maxSlots;
            opts.mapOfficial = mapEntry.official ?? false;
        });
        this.localPrefs.setItem(StorageKey.LastMap, mapEntry.fileName);
        this.localPrefs.setItem(StorageKey.LastMode, String(params.gameMode.id));
        this.saveBotSettings();
    }

    createLobbyFormProps(options: PregameLobbyFormOptions): any {
        const gameOpts = this.requireGameOpts();
        const slotsInfo = this.requireSlotsInfo();
        const mpDialogSettings = this.gameModes.getById(gameOpts.gameMode).mpDialogSettings;
        const onStateChange = () => options.onStateChange?.();
        const playerSlots = this.buildPlayerSlots(options.decoratePlayerSlot);

        return {
            strings: this.strings,
            countryUiNames: new Map<string, string>([
                [RANDOM_COUNTRY_NAME, RANDOM_COUNTRY_UI_NAME],
                [OBS_COUNTRY_NAME, OBS_COUNTRY_UI_NAME],
                ...this.getAvailablePlayerCountryRules().map((country: any) => [country.name, country.uiName] as [string, string]),
            ]),
            countryUiTooltips: new Map<string, string>([
                [RANDOM_COUNTRY_NAME, RANDOM_COUNTRY_UI_TOOLTIP],
                [OBS_COUNTRY_NAME, OBS_COUNTRY_UI_TOOLTIP],
                ...this.getAvailablePlayerCountryRules()
                    .filter((country: any) => country.uiTooltip)
                    .map((country: any) => [country.name, country.uiTooltip] as [string, string]),
            ]),
            availablePlayerCountries: [RANDOM_COUNTRY_NAME, OBS_COUNTRY_NAME].concat(this.getAvailablePlayerCountries()),
            availablePlayerColors: this.getSelectablePlayerColors(playerSlots),
            availableAiNames: new Map([...aiUiNames.entries()]),
            availableStartPositions: this.getSelectableStartPositions(playerSlots, gameOpts.maxSlots),
            maxTeams: 4,
            lobbyType: options.lobbyType,
            mpDialogSettings,
            selectedGameServer: options.selectedGameServer,
            activeSlotIndex: options.activeSlotIndex,
            teamsAllowed: this.gameModes.getById(gameOpts.gameMode).mpDialogSettings.alliesAllowed,
            teamsRequired: this.gameModes.getById(gameOpts.gameMode).mpDialogSettings.mustAlly,
            playerSlots,
            shortGame: gameOpts.shortGame,
            mcvRepacks: gameOpts.mcvRepacks,
            cratesAppear: gameOpts.cratesAppear,
            superWeapons: gameOpts.superWeapons,
            buildOffAlly: gameOpts.buildOffAlly,
            hostTeams: gameOpts.hostTeams ?? false,
            destroyableBridges: gameOpts.destroyableBridges,
            multiEngineer: gameOpts.multiEngineer,
            multiEngineerCount: Math.ceil((1 - ((this.rules as any).general?.engineerCaptureLevel || 0.5)) /
                ((this.rules as any).general?.engineerDamage || 0.25)) + 1,
            noDogEngiKills: gameOpts.noDogEngiKills,
            gameSpeed: gameOpts.gameSpeed,
            credits: gameOpts.credits,
            unitCount: gameOpts.unitCount,
            messages: options.messages,
            localUsername: options.localUsername,
            channels: options.channels,
            chatHistory: options.chatHistory,
            onSendMessage: options.onSendMessage,
            onCountrySelect: (country: string, slotIndex: number) => {
                this.handleCountrySelect(country, slotIndex);
                onStateChange();
            },
            onColorSelect: (color: string, slotIndex: number) => {
                this.handleColorSelect(color, slotIndex);
                onStateChange();
            },
            onStartPosSelect: (startPos: number, slotIndex: number) => {
                this.handleStartPosSelect(startPos, slotIndex);
                onStateChange();
            },
            onTeamSelect: (team: number, slotIndex: number) => {
                this.handleTeamSelect(team, slotIndex);
                onStateChange();
            },
            onSlotChange: (occupation: SlotOccupation, slotIndex: number, aiDifficulty?: AiDifficulty) => {
                this.handleSlotChange(occupation, slotIndex, aiDifficulty);
                onStateChange();
            },
            onToggleShortGame: (value: boolean) => {
                this.applyGameOption((opts) => (opts.shortGame = value));
                onStateChange();
            },
            onToggleMcvRepacks: (value: boolean) => {
                this.applyGameOption((opts) => (opts.mcvRepacks = value));
                onStateChange();
            },
            onToggleCratesAppear: (value: boolean) => {
                this.applyGameOption((opts) => (opts.cratesAppear = value));
                onStateChange();
            },
            onToggleSuperWeapons: (value: boolean) => {
                this.applyGameOption((opts) => (opts.superWeapons = value));
                onStateChange();
            },
            onToggleBuildOffAlly: (value: boolean) => {
                this.applyGameOption((opts) => (opts.buildOffAlly = value));
                onStateChange();
            },
            onToggleHostTeams: (value: boolean) => {
                this.applyGameOption((opts) => (opts.hostTeams = value));
                onStateChange();
            },
            onToggleDestroyableBridges: (value: boolean) => {
                this.applyGameOption((opts) => (opts.destroyableBridges = value));
                onStateChange();
            },
            onToggleMultiEngineer: (value: boolean) => {
                this.applyGameOption((opts) => (opts.multiEngineer = value));
                onStateChange();
            },
            onToggleNoDogEngiKills: (value: boolean) => {
                this.applyGameOption((opts) => (opts.noDogEngiKills = value));
                onStateChange();
            },
            onChangeGameSpeed: (value: number) => {
                this.applyGameOption((opts) => (opts.gameSpeed = value));
                onStateChange();
            },
            onChangeCredits: (value: number) => {
                this.applyGameOption((opts) => (opts.credits = value));
                onStateChange();
            },
            onChangeUnitCount: (value: number) => {
                this.applyGameOption((opts) => (opts.unitCount = value));
                onStateChange();
            },
        };
    }

    getCountryNameById(countryId: number): string {
        if (countryId === RANDOM_COUNTRY_ID) {
            return RANDOM_COUNTRY_NAME;
        }
        if (countryId === OBS_COUNTRY_ID) {
            return OBS_COUNTRY_NAME;
        }
        return this.getAvailablePlayerCountries()[countryId];
    }

    getCountryIdByName(name: string): number {
        if (name === RANDOM_COUNTRY_NAME) {
            return RANDOM_COUNTRY_ID;
        }
        if (name === OBS_COUNTRY_NAME) {
            return OBS_COUNTRY_ID;
        }
        return this.getAvailablePlayerCountries().indexOf(name);
    }

    getColorNameById(colorId: number): string {
        return colorId === RANDOM_COLOR_ID ? RANDOM_COLOR_NAME : this.getAvailablePlayerColors()[colorId];
    }

    getColorIdByName(name: string): number {
        if (name === RANDOM_COLOR_NAME) {
            return RANDOM_COLOR_ID;
        }
        const index = this.getAvailablePlayerColors().indexOf(name);
        if (index === -1) {
            throw new Error(`Color ${name} not found in available player colors`);
        }
        return index;
    }

    private requireGameOpts(): GameOpts {
        if (!this.gameOpts) {
            throw new Error('Pregame options are not initialized');
        }
        return this.gameOpts;
    }

    private requireSlotsInfo(): SlotInfo[] {
        if (!this.slotsInfo) {
            throw new Error('Pregame slots are not initialized');
        }
        return this.slotsInfo;
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
        let selectedModeId = selectedMap && savedMode && this.gameModes.getAll().find((mode) => mode.id === Number(savedMode))
            ? Number(savedMode)
            : 1;
        let selectedMode = this.gameModes.getById(selectedModeId);

        if (!selectedMap || !(selectedMap as any)?.gameModes?.find((mode: any) => mode.mapFilter === (selectedMode as any).mapFilter)) {
            selectedModeId = 1;
            selectedMode = this.gameModes.getById(selectedModeId);
            selectedMap = this.mapList
                .getAll()
                .find((map) => (map as any).gameModes?.find((mode: any) => (selectedMode as any).mapFilter === mode.mapFilter));
        }

        if (!selectedMap) {
            throw new Error('Unable to resolve an initial map for pregame setup');
        }

        this.currentMapFile = await this.mapFileLoader.load(selectedMap.fileName);
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
        const effectiveMaxSlots = humanIsObserver ? selectedMap.maxSlots + 1 : selectedMap.maxSlots;

        if (lastBots) {
            this.sanitizeLastBotSettings(lastBots, savedColor, savedStartPos, selectedMap.maxSlots, mpDialogSettings, humanIsObserver);
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
                    countryId: humanCountryId,
                    colorId: savedColor !== undefined &&
                        Number(savedColor) < this.getAvailablePlayerColors().length
                        ? Number(savedColor)
                        : RANDOM_COLOR_ID,
                    startPos: savedStartPos !== undefined &&
                        Number(savedStartPos) < this.getAvailableStartPositionsForMax(selectedMap.maxSlots).length
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
            mapName: selectedMap.fileName,
            mapDigest: MapDigest.compute(this.currentMapFile),
            mapSizeBytes: this.currentMapFile.getSize(),
            mapTitle: selectedMap.getFullMapTitle(this.strings),
            maxSlots: selectedMap.maxSlots,
            mapOfficial: selectedMap.official ?? false,
        };

        this.slotsInfo = [{ type: NetSlotType.Player, name: this.playerName }];
        for (let index = 1; index < 8; index += 1) {
            if (index < effectiveMaxSlots && this.gameOpts.aiPlayers[index]) {
                this.slotsInfo.push({ type: NetSlotType.Ai, difficulty: (this.gameOpts.aiPlayers[index] as any).difficulty });
            }
            else {
                const type = index < effectiveMaxSlots
                    ? (preferredOpts.slotsClosed.has(index) ? NetSlotType.Closed : NetSlotType.Open)
                    : NetSlotType.Closed;
                this.slotsInfo.push({ type });
            }
        }
    }

    private sanitizeLastBotSettings(aiPlayers: (any | undefined)[], savedColor: string | undefined, savedStartPos: string | undefined, maxSlots: number, mpDialogSettings: any, humanIsObserver: boolean = false): void {
        const maxAi = humanIsObserver ? maxSlots : maxSlots - 1;
        let aiCount = 0;
        for (let index = 0; index < aiPlayers.length; index += 1) {
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

    private getAvailablePlayerCountries(): string[] {
        return this.rules.getMultiplayerCountries().map((country: any) => country.name);
    }

    private getAvailablePlayerCountryRules(): any[] {
        return this.rules.getMultiplayerCountries();
    }

    private getAvailablePlayerColors(): string[] {
        return [...this.rules.getMultiplayerColors().values()].map((color: any) => color.asHexString());
    }

    private getAvailableStartPositionsForMax(maxSlots: number): number[] {
        return new Array(maxSlots).fill(0).map((_, index) => index);
    }

    private applyGameOption(modifier: (opts: GameOpts) => void): void {
        modifier(this.requireGameOpts());
        this.savePreferences();
    }

    private handleCountrySelect(countryName: string, slotIndex: number): void {
        const playerSlots = this.buildPlayerSlots();
        const wasObserver = this.isHumanObserver();
        this.updatePlayerInfo(this.getCountryIdByName(countryName), this.getColorIdByName(playerSlots[slotIndex].color), playerSlots[slotIndex].startPos, playerSlots[slotIndex].team, slotIndex);
        const isNowObserver = this.isHumanObserver();
        const slotsInfo = this.requireSlotsInfo();
        const gameOpts = this.requireGameOpts();
        if (!wasObserver && isNowObserver) {
            const extraSlotIndex = gameOpts.maxSlots;
            if (extraSlotIndex < 8 && slotsInfo[extraSlotIndex]?.type === NetSlotType.Closed) {
                slotsInfo[extraSlotIndex].type = NetSlotType.Open;
            }
        }
        else if (wasObserver && !isNowObserver) {
            const extraSlotIndex = gameOpts.maxSlots;
            if (extraSlotIndex < 8) {
                slotsInfo[extraSlotIndex].type = NetSlotType.Closed;
                gameOpts.aiPlayers[extraSlotIndex] = undefined as any;
            }
        }
    }

    private handleColorSelect(colorName: string, slotIndex: number): void {
        const playerSlots = this.buildPlayerSlots();
        this.updatePlayerInfo(this.getCountryIdByName(playerSlots[slotIndex].country), this.getColorIdByName(colorName), playerSlots[slotIndex].startPos, playerSlots[slotIndex].team, slotIndex);
    }

    private handleStartPosSelect(startPos: number, slotIndex: number): void {
        const playerSlots = this.buildPlayerSlots();
        this.updatePlayerInfo(this.getCountryIdByName(playerSlots[slotIndex].country), this.getColorIdByName(playerSlots[slotIndex].color), startPos, playerSlots[slotIndex].team, slotIndex);
    }

    private handleTeamSelect(teamId: number, slotIndex: number): void {
        const playerSlots = this.buildPlayerSlots();
        if (teamId === OBS_TEAM_ID) {
            if (slotIndex === 0 && !this.isHumanObserver()) {
                this.handleCountrySelect(OBS_COUNTRY_NAME, slotIndex);
            }
            return;
        }
        if (slotIndex === 0 && this.isHumanObserver()) {
            this.updatePlayerInfo(RANDOM_COUNTRY_ID, this.getColorIdByName(playerSlots[slotIndex].color), playerSlots[slotIndex].startPos, teamId, slotIndex);
            const extraSlotIndex = this.requireGameOpts().maxSlots;
            if (extraSlotIndex < 8) {
                this.requireSlotsInfo()[extraSlotIndex].type = NetSlotType.Closed;
                this.requireGameOpts().aiPlayers[extraSlotIndex] = undefined as any;
            }
            return;
        }
        this.updatePlayerInfo(this.getCountryIdByName(playerSlots[slotIndex].country), this.getColorIdByName(playerSlots[slotIndex].color), playerSlots[slotIndex].startPos, teamId, slotIndex);
    }

    private handleSlotChange(occupation: SlotOccupation, slotIndex: number, aiDifficulty?: AiDifficulty): void {
        this.changeSlotType(occupation, slotIndex, aiDifficulty);
        this.saveBotSettings();
    }

    private changeSlotType(occupation: SlotOccupation, slotIndex: number, aiDifficulty?: AiDifficulty): void {
        if (slotIndex === 0) {
            throw new Error('Change slot type of host');
        }

        const slotsInfo = this.requireSlotsInfo();
        const gameOpts = this.requireGameOpts();
        if (occupation === SlotOccupation.Occupied && aiDifficulty !== undefined) {
            const mpDialogSettings = this.gameModes.getById(gameOpts.gameMode).mpDialogSettings;
            const slot = slotsInfo[slotIndex];
            slot.type = NetSlotType.Ai;
            slot.difficulty = aiDifficulty;
            if (!gameOpts.aiPlayers[slotIndex]) {
                gameOpts.aiPlayers[slotIndex] = {
                    difficulty: aiDifficulty,
                    countryId: RANDOM_COUNTRY_ID,
                    colorId: RANDOM_COLOR_ID,
                    startPos: RANDOM_START_POS,
                    teamId: mpDialogSettings.mustAlly ? 3 : NO_TEAM_ID,
                } as any;
            }
            gameOpts.aiPlayers[slotIndex]!.difficulty = aiDifficulty;
            return;
        }

        if (occupation === SlotOccupation.Closed) {
            slotsInfo[slotIndex].type = NetSlotType.Closed;
            gameOpts.aiPlayers[slotIndex] = undefined as any;
            return;
        }

        slotsInfo[slotIndex].type = NetSlotType.Open;
        gameOpts.aiPlayers[slotIndex] = undefined as any;
    }

    private updatePlayerInfo(countryId: number, colorId: number, startPos: number, teamId: number, slotIndex: number): void {
        const slot = this.requireSlotsInfo()[slotIndex];
        if (slot.type === NetSlotType.Ai) {
            const ai = this.requireGameOpts().aiPlayers[slotIndex];
            if (!ai) {
                throw new Error(`No AI found on slot ${slotIndex}`);
            }
            ai.countryId = countryId;
            ai.colorId = colorId;
            ai.startPos = startPos;
            ai.teamId = teamId;
            this.saveBotSettings();
            return;
        }

        if (slot.type === NetSlotType.Player) {
            const human = this.requireGameOpts().humanPlayers.find((player) => player.name === slot.name);
            if (!human) {
                throw new Error(`No player found on slot ${slotIndex}`);
            }
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
            return;
        }

        throw new Error(`Unexpected slot type ${slot.type}`);
    }

    private buildPlayerSlots(decoratePlayerSlot?: (playerSlot: any, slotInfo: SlotInfo | undefined, slotIndex: number) => void): any[] {
        const gameOpts = this.requireGameOpts();
        const slotsInfo = this.requireSlotsInfo();
        const observerActive = this.isHumanObserver();
        const playerSlots = new Array(8).fill(undefined);
        let remaining = observerActive ? gameOpts.maxSlots + 1 : gameOpts.maxSlots;

        slotsInfo.forEach((_, slotIndex) => {
            if (remaining) {
                remaining -= 1;
                playerSlots[slotIndex] = {
                    country: RANDOM_COUNTRY_NAME,
                    color: RANDOM_COLOR_NAME,
                    startPos: RANDOM_START_POS,
                    team: NO_TEAM_ID,
                };
            }
        });

        slotsInfo.forEach((slot, slotIndex) => {
            if (!playerSlots[slotIndex]) {
                return;
            }
            const playerSlot = playerSlots[slotIndex];
            if (slot.type === NetSlotType.Closed) {
                playerSlot.occupation = SlotOccupation.Closed;
            }
            else if (slot.type === NetSlotType.Open || slot.type === NetSlotType.OpenObserver) {
                playerSlot.occupation = SlotOccupation.Open;
            }
            else {
                playerSlot.occupation = SlotOccupation.Occupied;
            }

            if (slot.type === NetSlotType.Ai) {
                playerSlot.aiDifficulty = slot.difficulty;
                playerSlot.type = UiSlotType.Ai;
            }
            else if (slot.type === NetSlotType.Player) {
                playerSlot.name = slot.name;
                playerSlot.type = UiSlotType.Player;
            }

            playerSlot.status = PlayerStatus.NotReady;
        });

        const mpDialogSettings = this.gameModes.getById(gameOpts.gameMode).mpDialogSettings;
        playerSlots.forEach((playerSlot: any, slotIndex: number) => {
            if (!playerSlot) {
                return;
            }

            if (playerSlot.occupation === SlotOccupation.Occupied) {
                const human = gameOpts.humanPlayers.find((player) => player.name === playerSlot.name);
                if (human) {
                    playerSlot.country = this.getCountryNameById(human.countryId);
                    playerSlot.color = this.getColorNameById(human.colorId);
                    playerSlot.startPos = human.startPos;
                    playerSlot.team = human.teamId;
                }
                else {
                    const ai = gameOpts.aiPlayers[slotIndex];
                    if (ai) {
                        playerSlot.country = this.getCountryNameById(ai.countryId);
                        playerSlot.color = this.getColorNameById(ai.colorId);
                        playerSlot.startPos = ai.startPos;
                        playerSlot.team = ai.teamId;
                    }
                }
            }
            else {
                playerSlot.country = RANDOM_COUNTRY_NAME;
                playerSlot.team = mpDialogSettings.mustAlly ? 0 : NO_TEAM_ID;
            }

            decoratePlayerSlot?.(playerSlot, slotsInfo[slotIndex], slotIndex);
        });

        return playerSlots;
    }

    private getSelectablePlayerColors(playerSlots: any[]): string[] {
        const usedColors: string[] = [];
        playerSlots.forEach((slot) => {
            if (slot) {
                usedColors.push(slot.color);
            }
        });
        const availableColors = this.getAvailablePlayerColors();
        return [RANDOM_COLOR_NAME].concat(availableColors.filter((color) => color && !usedColors.includes(color)));
    }

    private getSelectableStartPositions(playerSlots: any[], maxSlots: number): number[] {
        const usedPositions: number[] = [];
        playerSlots.forEach((slot) => {
            if (slot) {
                usedPositions.push(slot.startPos);
            }
        });
        const positions = this.getAvailableStartPositionsForMax(maxSlots);
        return [RANDOM_START_POS].concat(positions.filter((position) => !usedPositions.includes(position)));
    }

    private saveBotSettings(): void {
        this.localPrefs.setItem(StorageKey.LastBots, new Serializer().serializeAiOpts(this.requireGameOpts().aiPlayers));
    }

    private savePreferences(): void {
        if (!this.preferredHostOpts) {
            return;
        }
        this.localPrefs.setItem(StorageKey.PreferredGameOpts, this.preferredHostOpts.applyGameOpts(this.requireGameOpts()).serialize());
    }
}
