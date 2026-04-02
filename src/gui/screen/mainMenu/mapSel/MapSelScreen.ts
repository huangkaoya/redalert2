import { jsx } from "@/gui/jsx/jsx";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { MapSel, SortType } from "@/gui/screen/mainMenu/mapSel/component/MapSel";
import { MapPreviewRenderer } from "@/gui/screen/mainMenu/lobby/MapPreviewRenderer";
import { DownloadError } from "@/network/HttpRequest";
import { Task } from "@puzzl/core/lib/async/Task";
import { CancellationTokenSource, OperationCanceledError, CancellationToken } from "@puzzl/core/lib/async/cancellation";
import { MainMenuScreen } from "@/gui/screen/mainMenu/MainMenuScreen";
import { GameModeType } from "@/game/ini/GameModeType";
import { StorageKey } from "@/LocalPrefs";
import { MapFile } from "@/data/MapFile";
import { VirtualFile } from "@/data/vfs/VirtualFile";
import { MapSupport } from "@/engine/MapSupport";
import { IOError } from "@/data/vfs/IOError";
import { StorageQuotaError } from "@/data/vfs/StorageQuotaError";
import { FileNotFoundError } from "@/data/vfs/FileNotFoundError";
import { Engine } from "@/engine/Engine";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { MapManifest } from "@/engine/MapManifest";
import { NameNotAllowedError } from "@/data/vfs/NameNotAllowedError";
interface GameMode {
    id: number;
    label: string;
    type: GameModeType;
}
interface MapData {
    mapName: string;
    mapTitle: string;
    maxSlots: number;
    gameModes: {
        id: number;
    }[];
}
interface GameModes {
    getAll(): GameMode[];
}
interface MapListEntry {
    fileName: string;
    maxSlots: number;
    gameModes: {
        id: number;
    }[];
    getFullMapTitle(strings: any): string;
}
interface MapList {
    getAll(): MapListEntry[];
    getByName(name: string): MapListEntry | undefined;
    add(manifest: MapManifest): void;
}
interface MapFileLoader {
    load(mapName: string, cancellationToken?: CancellationToken): Promise<VirtualFile>;
}
interface ErrorHandler {
    handle(error: any, message: string, onClose: () => void): void;
}
interface MessageBoxApi {
    alert(message: string, buttonText: string): Promise<void>;
    confirm(message: string, confirmText: string, cancelText: string): Promise<boolean>;
    destroy(): void;
}
interface LocalPrefs {
    getItem(key: string): string | undefined;
    setItem(key: string, value: string): void;
}
interface MapDirectory {
    writeFile(file: VirtualFile): Promise<void>;
}
interface FsAccessLib {
    showOpenFilePicker(options: any): Promise<any>;
}
interface Sentry {
    captureException(error: Error): void;
}
interface LobbyType {
}
interface MapSelScreenParams {
    gameOpts: {
        gameMode: number;
        mapName: string;
    };
    usedSlots: () => number;
    lobbyType: LobbyType;
}
interface MapSelScreenResult {
    gameMode: GameMode;
    mapName: string;
    changedMapFile?: VirtualFile;
}
export class MapSelScreen extends MainMenuScreen {
    private strings: any;
    private jsxRenderer: any;
    private mapFileLoader: MapFileLoader;
    private errorHandler: ErrorHandler;
    private messageBoxApi: MessageBoxApi;
    private localPrefs: LocalPrefs;
    private mapList: MapList;
    private gameModes: GameModes;
    private mapDir: MapDirectory;
    private fsAccessLib: FsAccessLib;
    private sentry: Sentry;
    private disposables: CompositeDisposable;
    private availableGameModes?: GameMode[];
    private allMaps?: MapData[];
    private selectedGameMode!: GameMode;
    private selectedMapName!: string;
    private lobbyType!: LobbyType;
    private computeUsedSlots?: () => number;
    private form?: any;
    private mapFileUpdateTask?: Task<void>;
    private changedMapFile?: VirtualFile;
    constructor(strings: any, jsxRenderer: any, mapFileLoader: MapFileLoader, errorHandler: ErrorHandler, messageBoxApi: MessageBoxApi, localPrefs: LocalPrefs, mapList: MapList, gameModes: GameModes, mapDir: MapDirectory, fsAccessLib: FsAccessLib, sentry: Sentry) {
        super();
        this.strings = strings;
        this.jsxRenderer = jsxRenderer;
        this.mapFileLoader = mapFileLoader;
        this.errorHandler = errorHandler;
        this.messageBoxApi = messageBoxApi;
        this.localPrefs = localPrefs;
        this.mapList = mapList;
        this.gameModes = gameModes;
        this.mapDir = mapDir;
        this.fsAccessLib = fsAccessLib;
        this.sentry = sentry;
        this.title = this.strings.get("GUI:ChooseMap");
        this.disposables = new CompositeDisposable();
        this.handleSelectMap = (mapName: string, doubleClick: boolean) => {
            const isNewMap = this.selectedMapName !== mapName;
            this.selectedMapName = mapName;
            this.refreshMapInfo();
            if (isNewMap) {
                this.updateMapDeferred({ updatePreview: !doubleClick });
                this.initSidebar();
            }
            this.form.applyOptions((options: any) => {
                options.selectedMapName = mapName;
            });
            if (doubleClick) {
                this.handleSubmit();
            }
        };
        this.handleSelectGameMode = (gameMode: GameMode) => {
            this.selectedGameMode = gameMode;
            const availableMaps = this.computeAvailableMaps();
            if (!availableMaps.find((map) => map.mapName === this.selectedMapName)) {
                this.handleSelectMap(availableMaps[0].mapName, false);
            }
            this.refreshMapInfo();
            this.form.applyOptions((options: any) => {
                options.selectedGameMode = gameMode;
                options.maps = availableMaps;
            });
        };
        this.handleSelectSort = (sortType: SortType) => {
            this.localPrefs.setItem(StorageKey.LastSortMap, sortType);
        };
    }
    private handleSelectMap: (mapName: string, doubleClick: boolean) => void;
    private handleSelectGameMode: (gameMode: GameMode) => void;
    private handleSelectSort: (sortType: SortType) => void;
    onEnter({ gameOpts, usedSlots, lobbyType }: MapSelScreenParams): void {
        this.updateMapsAndModes();
        this.selectedGameMode = this.availableGameModes!.find((mode) => mode.id === gameOpts.gameMode)!;
        this.selectedMapName = gameOpts.mapName;
        this.lobbyType = lobbyType;
        this.computeUsedSlots = usedSlots;
        this.initSidebar();
        this.initForm();
    }
    private updateMapsAndModes(): void {
        const availableGameModes = this.gameModes
            .getAll()
            .filter((gameMode) => this.mapList
            .getAll()
            .find((map) => map.gameModes.some((mode) => mode.id === gameMode.id)));
        const allMaps = this.mapList.getAll().map((map) => ({
            mapName: map.fileName,
            mapTitle: map.getFullMapTitle(this.strings),
            maxSlots: map.maxSlots,
            gameModes: map.gameModes,
        }));
        this.availableGameModes = availableGameModes
            .filter((mode) => mode.type !== GameModeType.Cooperative)
            .sort((a, b) => a.id - b.id);
        this.allMaps = allMaps;
    }
    private initForm(): void {
        this.controller.setMainComponent(this.jsxRenderer.render(jsx(HtmlView, {
            innerRef: (ref: any) => (this.form = ref),
            component: MapSel,
            props: {
                strings: this.strings,
                maps: this.computeAvailableMaps(),
                gameModes: this.availableGameModes,
                selectedMapName: this.selectedMapName,
                selectedGameMode: this.selectedGameMode,
                initialSortType: this.readInitialSort(),
                onSelectMap: this.handleSelectMap,
                onSelectGameMode: this.handleSelectGameMode,
                onSelectSort: this.handleSelectSort,
            },
        }))[0]);
    }
    private readInitialSort(): SortType {
        let sortType = this.localPrefs.getItem(StorageKey.LastSortMap) as SortType;
        if (!sortType || !Object.values(SortType).includes(sortType)) {
            sortType = SortType.None;
        }
        return sortType;
    }
    private initSidebar(): void {
        const buttons = [
            {
                label: this.strings.get("GUI:UseMap"),
                tooltip: this.strings.get("STT:ScenarioButtonUseMap"),
                onClick: () => {
                    this.handleSubmit();
                },
            },
            ...(this.mapDir
                ? [
                    {
                        label: this.strings.get("TS:ImportMap"),
                        tooltip: this.strings.get("STT:ImportMap"),
                        onClick: async () => {
                            const cancellationSource = new CancellationTokenSource();
                            const cleanup = () => cancellationSource.cancel();
                            this.disposables.add(cleanup);
                            try {
                                await this.importMap(cancellationSource.token);
                            }
                            catch (error) {
                                if (!(error instanceof OperationCanceledError)) {
                                    this.handleMapImportError(error);
                                }
                            }
                            finally {
                                this.disposables.remove(cleanup);
                            }
                        },
                    },
                ]
                : []),
            {
                label: this.strings.get("GUI:Cancel"),
                tooltip: this.strings.get("STT:ScenarioButtonCancel"),
                isBottom: true,
                onClick: () => {
                    this.controller?.popScreen();
                },
            },
        ];
        this.controller.setSidebarButtons(buttons, true);
        this.refreshMapInfo();
        this.controller.showSidebarButtons();
    }
    private async importMap(cancellationToken: CancellationToken): Promise<void> {
        let file: File;
        try {
            const fileHandle = await this.fsAccessLib.showOpenFilePicker({
                types: [
                    {
                        description: "RA2 Map",
                        accept: {
                            "text/plain": Engine.supportedMapTypes.map((type) => "." + type),
                        },
                    },
                ],
                excludeAcceptAllOption: true,
            });
            const handle = Array.isArray(fileHandle) ? fileHandle[0] : fileHandle;
            file = await handle.getFile();
        }
        catch (error: any) {
            if (error.name === "AbortError")
                return;
            if (error instanceof DOMException) {
                const err = new IOError(`File could not be read (${error.name})`);
                (err as any).cause = error;
                throw err;
            }
            throw error;
        }
        if (!Engine.supportedMapTypes.some((type) => file.name.toLowerCase().endsWith("." + type))) {
            await this.messageBoxApi.alert(this.strings.get("TS:ImportMapUnsupportedType", Engine.supportedMapTypes.map((type) => "*." + type).join(", ")), this.strings.get("GUI:Ok"));
            return;
        }
        if (this.mapList.getByName(file.name)) {
            await this.messageBoxApi.alert(this.strings.get("TS:ImportMapDuplicateError", file.name), this.strings.get("GUI:Ok"));
            return;
        }
        const virtualFile = await VirtualFile.fromRealFile(file);
        let mapFile: MapFile;
        let manifest: MapManifest;
        try {
            mapFile = new MapFile(virtualFile);
            const supportError = MapSupport.check(mapFile, this.strings);
            if (supportError) {
                await this.messageBoxApi.alert(supportError, this.strings.get("GUI:Ok"));
                return;
            }
            manifest = new MapManifest().fromMapFile(virtualFile, this.gameModes.getAll() as any);
        }
        catch (error) {
            console.error(error);
            await this.messageBoxApi.alert(this.strings.get("TXT_MAP_ERROR"), this.strings.get("GUI:Ok"));
            return;
        }
        if (mapFile.unknownActionTypes.size || mapFile.unknownEventTypes.size) {
            if (!(await this.messageBoxApi.confirm(this.strings.get("TS:MapUnsupportedTriggers"), this.strings.get("GUI:Continue"), this.strings.get("GUI:Cancel")))) {
                return;
            }
        }
        const gameModes = manifest.gameModes;
        if (!gameModes.length) {
            await this.messageBoxApi.alert(this.strings.get("TS:MapUnsupportedGameMode"), this.strings.get("GUI:Ok"));
            return;
        }
        await this.mapDir.writeFile(virtualFile);
        this.mapList.add(manifest);
        cancellationToken.throwIfCancelled();
        this.updateMapsAndModes();
        this.form.applyOptions((options: any) => {
            options.gameModes = this.availableGameModes;
            options.maps = this.computeAvailableMaps();
        });
        if (!gameModes.some((mode) => this.selectedGameMode.id === mode.id)) {
            this.handleSelectGameMode(gameModes[0]);
        }
        this.handleSelectMap(virtualFile.filename, false);
    }
    private handleMapImportError(error: any): void {
        const strings = this.strings;
        let message = strings.get("TS:ImportMapError");
        if (error.name === "QuotaExceededError" || error instanceof StorageQuotaError) {
            message += "\n\n" + strings.get("ts:storage_quota_exceeded");
        }
        else if (error instanceof NameNotAllowedError) {
            message += "\n\n" + strings.get("TS:FileNameError");
        }
        else if (!(error instanceof IOError || error instanceof FileNotFoundError)) {
            this.sentry?.captureException(new Error("Map import failed " + (error.message ?? error.name), { cause: error }));
        }
        this.errorHandler.handle(error, message, () => { });
    }
    private async handleSubmit(): Promise<void> {
        const cancellationSource = new CancellationTokenSource();
        const cleanup = () => cancellationSource.cancel();
        this.disposables.add(cleanup);
        try {
            await this.submitMap(cancellationSource.token);
        }
        catch (error) {
            if (!(error instanceof OperationCanceledError)) {
                throw error;
            }
        }
        finally {
            this.disposables.remove(cleanup);
        }
    }
    private async submitMap(cancellationToken: CancellationToken): Promise<void> {
        let isFormHidden = false;
        if (this.mapFileUpdateTask) {
            this.form.hide();
            this.controller?.hideSidebarButtons();
            isFormHidden = true;
            try {
                await this.mapFileUpdateTask.wait();
            }
            catch (error) {
            }
        }
        cancellationToken.throwIfCancelled();
        if (this.changedMapFile) {
            try {
                const mapFile = new MapFile(this.changedMapFile);
                const supportError = MapSupport.check(mapFile, this.strings);
                if (supportError) {
                    await this.messageBoxApi.alert(supportError, this.strings.get("GUI:Ok"));
                    return;
                }
            }
            catch (error) {
                console.error(error);
                await this.messageBoxApi.alert(this.strings.get("TXT_MAP_ERROR"), this.strings.get("GUI:Ok"));
                if (isFormHidden) {
                    this.form.show();
                    this.controller?.showSidebarButtons();
                }
                return;
            }
        }
        const selectedMap = this.allMaps!.find((map) => map.mapName === this.selectedMapName)!;
        const shouldProceed = this.computeUsedSlots!() <= selectedMap.maxSlots ||
            (await this.messageBoxApi.confirm(this.strings.get("GUI:EjectPlayers"), this.strings.get("GUI:Ok"), this.strings.get("GUI:Cancel")));
        cancellationToken.throwIfCancelled();
        if (shouldProceed) {
            await (this.controller as any)?.popScreen({
                gameMode: this.selectedGameMode,
                mapName: this.selectedMapName,
                changedMapFile: this.changedMapFile,
            });
        }
        else if (isFormHidden) {
            this.form.show();
            this.controller?.showSidebarButtons();
        }
    }
    private computeAvailableMaps(): MapData[] {
        return this.allMaps!.filter((map) => map.gameModes.some((mode) => mode.id === this.selectedGameMode.id));
    }
    private refreshMapInfo(): void {
        const selectedMap = this.allMaps!.find((map) => map.mapName === this.selectedMapName);
        this.controller?.setSidebarMpContent({
            text: this.strings.get(this.selectedGameMode.label) +
                "\n\n" +
                selectedMap?.mapTitle,
        });
    }
    async onLeave(): Promise<void> {
        this.computeUsedSlots = undefined;
        this.availableGameModes = undefined;
        this.allMaps = undefined;
        this.messageBoxApi.destroy();
        this.form = undefined;
        this.mapFileUpdateTask?.cancel();
        this.mapFileUpdateTask = undefined;
        this.controller.setMainComponent();
        this.disposables.dispose();
        await this.controller.hideSidebarButtons();
    }
    private updateMapDeferred({ updatePreview }: {
        updatePreview: boolean;
    }): void {
        this.mapFileUpdateTask?.cancel();
        this.mapFileUpdateTask = new Task(async (cancellationToken) => {
            if (!this.controller)
                return;
            if (updatePreview) {
                this.controller.setSidebarPreview();
            }
            this.changedMapFile = undefined;
            let mapFile: VirtualFile;
            try {
                mapFile = this.changedMapFile = await this.mapFileLoader.load(this.selectedMapName, cancellationToken);
            }
            catch (error) {
                if (error instanceof DownloadError) {
                    this.errorHandler.handle(error, this.strings.get("TXT_DOWNLOAD_FAILED"), () => {
                        this.controller?.popScreen();
                    });
                    return;
                }
                throw error;
            }
            if (updatePreview && !cancellationToken.isCancelled()) {
                const preview = new MapPreviewRenderer(this.strings).render(new MapFile(mapFile), this.lobbyType as any, this.controller.getSidebarPreviewSize());
                this.controller.setSidebarPreview(preview);
            }
            this.mapFileUpdateTask = undefined;
        });
        this.mapFileUpdateTask.start().catch((error) => {
            if (!(error instanceof OperationCanceledError)) {
                console.error("Failed to render map preview");
                console.error(error);
            }
        });
    }
}
