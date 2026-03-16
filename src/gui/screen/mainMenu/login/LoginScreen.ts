import { jsx } from "@/gui/jsx/jsx";
import { WolError } from "@/network/WolError";
import { LoginBox } from "@/gui/screen/mainMenu/login/LoginBox";
import { ScreenType } from "@/gui/screen/mainMenu/ScreenType";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { Task } from "@puzzl/core/lib/async/Task";
import { sleep } from "@puzzl/core/lib/async/sleep";
import { StorageKey } from "LocalPrefs";
import { MainMenuScreen } from "@/gui/screen/mainMenu/MainMenuScreen";
import { ServerPings } from "@/gui/screen/mainMenu/login/ServerPings";
import { OperationCanceledError, CancellationToken } from "@puzzl/core/lib/async/cancellation";
import { MainMenuRoute } from "@/gui/screen/mainMenu/MainMenuRoute";
interface Region {
    id: string;
    wolUrl: string;
    wladderUrl: string;
    wgameresUrl: string;
    mapTransferUrl: string;
}
interface ServerRegions {
    load(regions: any[]): void;
    isAvailable(regionId: string): boolean;
    get(regionId: string): Region;
    getAll(): Region[];
    getFirstAvailable(): Region | undefined;
    setSelectedRegion(regionId: string): void;
}
interface WolService {
    loadServerList(url: string, cancellationToken?: CancellationToken): Promise<any[]>;
    validateGameVersion(region: Region): Promise<void>;
    isConnected(): boolean;
    getConnection(): {
        getCurrentUser(): string;
    };
    connectAndLogin(config: {
        url: string;
        user: string;
        pass: string;
    }, onQueue?: (status: {
        position: number;
        avgWaitSeconds: number;
    }) => void): Promise<any[]>;
    closeWolConnection(): void;
}
interface WladderService {
    setUrl(url: string): void;
}
interface WgameresService {
    setUrl(url: string): void;
}
interface MapTransferService {
    setUrl(url: string): void;
}
interface MessageBoxApi {
    show(message: string, buttonText?: string, onClose?: () => void): void;
    destroy(): void;
}
interface ErrorHandler {
    handle(error: any, message: string, onClose: () => void): void;
}
interface LocalPrefs {
    getItem(key: string): string | undefined;
    setItem(key: string, value: string): void;
}
interface RootController {
    goToScreen(screenType: any, params: any): void;
}
interface LoginScreenParams {
    clearCredentials?: boolean;
    useCredentials?: {
        regionId: string;
        user: string;
        pass: string;
    };
    forceUser?: string;
    afterLogin: (messages: any[]) => MainMenuRoute | {
        screenType: any;
        params: any;
    };
}
interface LoginBoxApi {
    submit(): void;
}
let savedCredentials: {
    regionId: string;
    user: string;
    pass: string;
} | undefined = undefined;
export class LoginScreen extends MainMenuScreen {
    private wolService: WolService;
    private wladderService: WladderService;
    private wgameresService: WgameresService;
    private mapTransferService: MapTransferService;
    private strings: any;
    private jsxRenderer: any;
    private messageBoxApi: MessageBoxApi;
    private serverRegions: ServerRegions;
    private serversUrl: string;
    private breakingNewsUrl: string;
    private wolLogger: any;
    private errorHandler: ErrorHandler;
    private localPrefs: LocalPrefs;
    private rootController: RootController;
    private params!: LoginScreenParams;
    private needsServerListRefresh: boolean = false;
    private selectedRegion?: Region;
    private serverPings!: ServerPings;
    private loginBoxApi?: LoginBoxApi | null;
    private loginBox?: any;
    private isBusy: boolean = false;
    private formRendered: boolean = false;
    private serversUpdateTask?: Task<void>;
    constructor(wolService: WolService, wladderService: WladderService, wgameresService: WgameresService, mapTransferService: MapTransferService, strings: any, jsxRenderer: any, messageBoxApi: MessageBoxApi, serverRegions: ServerRegions, serversUrl: string, breakingNewsUrl: string, wolLogger: any, errorHandler: ErrorHandler, localPrefs: LocalPrefs, rootController: RootController) {
        super();
        this.wolService = wolService;
        this.wladderService = wladderService;
        this.wgameresService = wgameresService;
        this.mapTransferService = mapTransferService;
        this.strings = strings;
        this.jsxRenderer = jsxRenderer;
        this.messageBoxApi = messageBoxApi;
        this.serverRegions = serverRegions;
        this.serversUrl = serversUrl;
        this.breakingNewsUrl = breakingNewsUrl;
        this.wolLogger = wolLogger;
        this.errorHandler = errorHandler;
        this.localPrefs = localPrefs;
        this.rootController = rootController;
        this.title = this.strings.get("GUI:Login");
        this.needsServerListRefresh = false;
        this.handleLoginSubmit = async (username: string, password: string) => {
            if (!this.isBusy && this.loginBoxApi && this.controller) {
                this.isBusy = true;
                const region = this.selectedRegion;
                if (region) {
                    await this.controller.hideSidebarButtons();
                    await this.login(username, password, region.id);
                }
            }
        };
    }
    private handleLoginSubmit: (username: string, password: string) => Promise<void>;
    async onEnter(params: LoginScreenParams): Promise<void> {
        this.params = params;
        this.formRendered = false;
        this.controller.toggleMainVideo(false);
        if (params.clearCredentials) {
            savedCredentials = undefined;
        }
        else if (params.useCredentials) {
            savedCredentials = params.useCredentials;
        }
        try {
            await this.loadServerList();
        }
        catch (error) {
            this.handleWolError(error, this.strings.get("TXT_NO_SERV_LIST"), { fatal: true });
            return;
        }
        this.needsServerListRefresh = false;
        this.serverPings = new ServerPings(this.serverRegions, this.wolLogger);
        if (savedCredentials && this.serverRegions.isAvailable(savedCredentials.regionId)) {
            this.isBusy = true;
            this.login(savedCredentials.user, savedCredentials.pass, savedCredentials.regionId);
        }
        else {
            this.isBusy = false;
            this.initView(true);
        }
    }
    private async loadServerList(cancellationToken?: CancellationToken): Promise<void> {
        let isShowingConnecting = false;
        const timeout = setTimeout(async () => {
            this.messageBoxApi.show(this.strings.get("TXT_CONNECTING"));
            isShowingConnecting = true;
        }, 1000);
        try {
            const serverList = await this.wolService.loadServerList(this.serversUrl, cancellationToken);
            if (cancellationToken?.isCancelled())
                return;
            this.serverRegions.load(serverList);
            if (this.selectedRegion) {
                this.selectedRegion = this.serverRegions
                    .getAll()
                    .find((region) => region.id === this.selectedRegion!.id);
            }
        }
        finally {
            clearTimeout(timeout);
            if (isShowingConnecting) {
                this.messageBoxApi.destroy();
            }
        }
    }
    private initView(updateServers: boolean = false): void {
        if (!this.controller)
            return;
        this.updateSidebarButtons();
        if (!this.isBusy) {
            this.controller.showSidebarButtons();
        }
        if (!this.selectedRegion) {
            const savedRegionId = this.localPrefs.getItem(StorageKey.PreferredServerRegion);
            const candidateRegion = savedRegionId && this.serverRegions.isAvailable(savedRegionId)
                ? this.serverRegions.get(savedRegionId)
                : this.serverRegions.getFirstAvailable();
            const pings = this.serverPings.getPings();
            if (!candidateRegion || (pings.has(candidateRegion) && pings.get(candidateRegion) === undefined)) {
                this.selectedRegion = undefined;
            }
            else {
                this.selectedRegion = candidateRegion;
            }
        }
        if (updateServers && !this.params.forceUser && this.selectedRegion) {
            this.updateServers();
        }
        const [component] = this.jsxRenderer.render(jsx(HtmlView, {
            width: "100%",
            height: "100%",
            component: LoginBox,
            props: {
                ref: (ref: LoginBoxApi) => (this.loginBoxApi = ref),
                regions: this.serverRegions.getAll(),
                selectedRegion: this.selectedRegion,
                selectedUser: this.params.forceUser,
                pings: this.serverPings.getPings(),
                breakingNewsUrl: this.breakingNewsUrl,
                strings: this.strings,
                onRegionChange: (regionId: string) => {
                    this.selectedRegion = this.serverRegions.get(regionId);
                    this.loginBox?.applyOptions((options: any) => {
                        options.selectedRegion = this.selectedRegion;
                    });
                    this.updateSidebarButtons();
                },
                onRequestRegionRefresh: () => {
                    this.needsServerListRefresh = true;
                    this.updateServers();
                },
                onSubmit: this.handleLoginSubmit,
            },
            innerRef: (ref: any) => (this.loginBox = ref),
        }));
        this.controller.setMainComponent(component);
        this.updateSidebarButtons();
        this.formRendered = true;
    }
    private updateSidebarButtons(): void {
        if (!this.controller)
            return;
        this.controller.setSidebarButtons([
            {
                label: this.strings.get("GUI:Login"),
                disabled: !this.selectedRegion,
                onClick: () => {
                    this.submitLoginForm();
                },
            },
            {
                label: this.strings.get("GUI:NewAccount"),
                disabled: !!this.params.forceUser,
                onClick: () => {
                    this.controller?.goToScreen(ScreenType.NewAccount, {
                        regionId: this.selectedRegion?.id,
                        afterLogin: this.params.afterLogin,
                    });
                },
            },
            {
                label: this.strings.get("GUI:Back"),
                isBottom: true,
                onClick: () => {
                    this.controller?.goToScreen(ScreenType.Home);
                },
            },
        ]);
    }
    private updateServers(): void {
        if (this.isBusy || this.serversUpdateTask)
            return;
        this.serverPings.getPings().clear();
        this.handleServerPingsUpdate();
        this.serversUpdateTask = new Task(async (cancellationToken) => {
            if (!this.formRendered) {
                await sleep(500, cancellationToken);
            }
            if (this.needsServerListRefresh) {
                this.needsServerListRefresh = false;
                try {
                    await this.loadServerList(cancellationToken);
                }
                catch (error) {
                    this.handleWolError(error, this.strings.get("TXT_NO_SERV_LIST"), { fatal: true });
                    this.serversUpdateTask = undefined;
                    return;
                }
            }
            this.loginBox?.applyOptions((options: any) => {
                options.selectedRegion = this.selectedRegion;
                options.regions = this.serverRegions.getAll();
            });
            this.updateSidebarButtons();
            try {
                await this.serverPings.update(() => this.handleServerPingsUpdate(), cancellationToken);
            }
            finally {
                this.serversUpdateTask = undefined;
            }
            this.handleServerPingsUpdate();
        });
        this.serversUpdateTask.start().catch((error) => {
            if (!(error instanceof OperationCanceledError)) {
                console.error(error);
            }
        });
    }
    private handleServerPingsUpdate(): void {
        if (!this.loginBoxApi)
            return;
        const currentRegion = this.selectedRegion;
        const pings = this.serverPings.getPings();
        if (currentRegion && pings.has(currentRegion) && pings.get(currentRegion) === undefined) {
            this.selectedRegion = undefined;
            this.loginBox?.applyOptions((options: any) => {
                options.selectedRegion = undefined;
            });
            this.updateSidebarButtons();
        }
        this.loginBox?.refresh();
    }
    private submitLoginForm(): void {
        if (!this.isBusy && this.loginBoxApi && this.controller && this.selectedRegion) {
            this.loginBoxApi.submit();
        }
    }
    private async login(username: string, password: string, regionId: string): Promise<void> {
        if (!username.match(/^[A-Za-z0-9-_]+$/)) {
            this.handleBadPass();
            return;
        }
        this.serversUpdateTask?.cancel();
        this.serversUpdateTask = undefined;
        const connectingTask = new Task(async (cancellationToken) => {
            await sleep(1000, cancellationToken);
            if (!cancellationToken.isCancelled()) {
                this.messageBoxApi.show(this.strings.get("TXT_CONNECTING"));
            }
        });
        connectingTask.start().catch((error) => {
            if (!(error instanceof OperationCanceledError)) {
                console.error(error);
            }
        });
        const region = this.serverRegions.get(regionId);
        this.serverRegions.setSelectedRegion(regionId);
        try {
            await this.wolService.validateGameVersion(region);
        }
        catch (error) {
            connectingTask.cancel();
            this.messageBoxApi.destroy();
            const message = error instanceof WolError && error.code === WolError.Code.OutdatedClient
                ? this.strings.get("TS:OutdatedClient")
                : this.strings.get("TXT_NO_SERV_LIST");
            this.handleWolError(error, message, { fatal: false });
            return;
        }
        let wasCancelled = false;
        try {
            let messages: any[] = [];
            if (!this.wolService.isConnected() || !this.wolService.getConnection().getCurrentUser()) {
                messages = await this.wolService.connectAndLogin({ url: region.wolUrl, user: username, pass: password }, ({ position, avgWaitSeconds }) => {
                    connectingTask.cancel();
                    this.messageBoxApi.show(this.strings.get("TS:ServerFull") +
                        "\n\n\n" +
                        this.strings.get("TS:LoginPositionInQueue", position) +
                        "\n" +
                        this.strings.get("TS:LoginAvgWaitTime") +
                        (avgWaitSeconds > 0 && avgWaitSeconds < 3600
                            ? this.strings.get("TS:LoginAvgWaitTimeMinutes", avgWaitSeconds < 60 ? "<1" : "~" + Math.ceil(avgWaitSeconds / 60))
                            : this.strings.get("TS:LoginAvgWaitTimeUnavail")), this.strings.get("GUI:Cancel"), () => {
                        wasCancelled = true;
                        this.wolService.closeWolConnection();
                    });
                });
                this.wladderService.setUrl(region.wladderUrl);
                this.wgameresService.setUrl(region.wgameresUrl);
                this.mapTransferService.setUrl(region.mapTransferUrl);
                savedCredentials = { user: username, pass: password, regionId };
            }
            connectingTask.cancel();
            this.messageBoxApi.destroy();
            this.localPrefs.setItem(StorageKey.PreferredServerRegion, regionId);
            const result = this.params.afterLogin(messages);
            if (result instanceof MainMenuRoute) {
                this.controller?.goToScreen(result.screenType, result.params);
            }
            else {
                this.rootController.goToScreen(result.screenType, result.params);
            }
        }
        catch (error) {
            connectingTask.cancel();
            this.messageBoxApi.destroy();
            if (wasCancelled) {
                this.isBusy = false;
                if (this.formRendered) {
                    this.updateSidebarButtons();
                    this.controller?.showSidebarButtons();
                }
                else {
                    this.initView();
                }
                return;
            }
            if (error instanceof WolError && error.code === WolError.Code.OutdatedClient) {
                this.handleWolError(error, this.strings.get("TS:OutdatedClient"), { fatal: false });
                return;
            }
            if (error instanceof WolError && error.code === WolError.Code.BadLogin) {
                this.wolService.closeWolConnection();
                this.handleBadPass();
            }
            else if (error instanceof WolError && error.code === WolError.Code.BannedFromServer) {
                this.wolService.closeWolConnection();
                this.handleLoginError(error.reason ?? "This account is banned");
            }
            else if (error instanceof WolError && error.code === WolError.Code.ServerFull) {
                this.handleLoginError(this.strings.get("TS:ServerFull"));
            }
            else {
                this.handleWolError(error, this.strings.get("TS:ConnectFailed"), {
                    fatal: false,
                    netError: true,
                });
            }
        }
    }
    private handleBadPass(): void {
        this.handleLoginError(this.strings.get("TXT_BADPASS"));
    }
    private handleLoginError(message: string): void {
        this.messageBoxApi.show(message, this.strings.get("GUI:Ok"), () => {
            this.isBusy = false;
            if (this.formRendered) {
                this.updateSidebarButtons();
                this.controller.showSidebarButtons();
            }
            else {
                this.initView();
            }
        });
    }
    private handleWolError(error: any, message: string, { fatal, netError }: {
        fatal: boolean;
        netError?: boolean;
    } = { fatal: false }): void {
        this.errorHandler.handle(error, message, () => {
            this.isBusy = false;
            this.serversUpdateTask?.cancel();
            this.serversUpdateTask = undefined;
            this.wolService.closeWolConnection();
            if (fatal) {
                this.controller?.goToScreen(ScreenType.Home);
            }
            else if (this.formRendered) {
                this.updateSidebarButtons();
                this.controller?.showSidebarButtons();
            }
            else {
                if (netError) {
                    this.needsServerListRefresh = true;
                }
                this.initView(!!netError);
            }
        });
    }
    async onLeave(): Promise<void> {
        this.loginBoxApi = null;
        this.loginBox = undefined;
        this.formRendered = false;
        this.serversUpdateTask?.cancel();
        this.serversUpdateTask = undefined;
        if (!this.isBusy) {
            await this.controller.hideSidebarButtons();
        }
        this.isBusy = false;
    }
}
