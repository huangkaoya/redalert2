import { jsx } from "@/gui/jsx/jsx";
import { NewAccountBox } from "@/gui/screen/mainMenu/newAccount/NewAccountBox";
import { ScreenType } from "@/gui/screen/mainMenu/ScreenType";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { Task } from "@puzzl/core/lib/async/Task";
import { sleep } from "@/util/time";
import { StorageKey } from "LocalPrefs";
import { MainMenuScreen } from "@/gui/screen/mainMenu/MainMenuScreen";
import { HttpRequest } from "@/network/HttpRequest";
interface Region {
    id: string;
    apiRegUrl: string;
}
interface ServerRegions {
    isAvailable(regionId: string): boolean;
    get(regionId: string): Region;
    getFirstAvailable(): Region | undefined;
    getAll(): Region[];
    setSelectedRegion(regionId: string): void;
}
interface LocalPrefs {
    getItem(key: string): string | undefined;
    setItem(key: string, value: string): void;
}
interface MessageBoxApi {
    show(message: string, buttonText?: string, onClose?: () => void): void;
    destroy(): void;
}
interface ErrorHandler {
    handle(error: any, message: string, onClose: () => void): void;
}
interface NewAccountFormData {
    user: string;
    pass: string;
    passMatch: boolean;
    regionId: string;
}
interface NewAccountScreenParams {
    regionId?: string;
    afterLogin?: (params: any) => void;
}
interface ApiResponse {
    error?: string;
}
export class NewAccountScreen extends MainMenuScreen {
    private appLocale: string;
    private strings: any;
    private jsxRenderer: any;
    private messageBoxApi: MessageBoxApi;
    private serverRegions: ServerRegions;
    private errorHandler: ErrorHandler;
    private localPrefs: LocalPrefs;
    private newAccountBox?: any;
    private isBusy: boolean = false;
    constructor(appLocale: string, strings: any, jsxRenderer: any, messageBoxApi: MessageBoxApi, serverRegions: ServerRegions, errorHandler: ErrorHandler, localPrefs: LocalPrefs) {
        super();
        this.appLocale = appLocale;
        this.strings = strings;
        this.jsxRenderer = jsxRenderer;
        this.messageBoxApi = messageBoxApi;
        this.serverRegions = serverRegions;
        this.errorHandler = errorHandler;
        this.localPrefs = localPrefs;
        this.title = this.strings.get("GUI:NewAccount");
        this.handleSubmit = async (formData: NewAccountFormData, afterLogin?: (params: any) => void) => {
            if (!this.isBusy && this.controller) {
                this.isBusy = true;
                await this.controller.hideSidebarButtons();
                const { user, pass, passMatch, regionId } = formData;
                if (passMatch) {
                    if (user.match(/^[A-Za-z0-9-_]+$/)) {
                        await this.createAccount(user, pass, regionId, afterLogin);
                    }
                    else {
                        this.handleValidationError(this.strings.get("TS:BadNickname"));
                    }
                }
                else {
                    this.handleValidationError(this.strings.get("TXT_PASSWORD_VERIFY"));
                }
            }
        };
    }
    private handleSubmit: (formData: NewAccountFormData, afterLogin?: (params: any) => void) => Promise<void>;
    async onEnter(params: NewAccountScreenParams): Promise<void> {
        this.controller.toggleMainVideo(false);
        this.isBusy = false;
        const savedRegionId = params.regionId ?? this.localPrefs.getItem(StorageKey.PreferredServerRegion);
        const selectedRegion = savedRegionId && this.serverRegions.isAvailable(savedRegionId)
            ? this.serverRegions.get(savedRegionId)
            : this.serverRegions.getFirstAvailable();
        if (selectedRegion) {
            this.controller.setSidebarButtons([
                {
                    label: this.strings.get("GUI:Ok"),
                    onClick: () => this.submitForm(),
                },
                {
                    label: this.strings.get("GUI:Back"),
                    isBottom: true,
                    onClick: () => {
                        this.controller?.goToScreen(ScreenType.Login, {
                            afterLogin: params.afterLogin,
                        });
                    },
                },
            ]);
            this.controller.showSidebarButtons();
            const [component] = this.jsxRenderer.render(jsx(HtmlView, {
                width: "100%",
                height: "100%",
                component: NewAccountBox,
                props: {
                    ref: (ref: any) => (this.newAccountBox = ref),
                    strings: this.strings,
                    regions: this.serverRegions.getAll(),
                    initialRegion: selectedRegion,
                    onRegionChange: (regionId: string) => {
                        this.localPrefs.setItem(StorageKey.PreferredServerRegion, regionId);
                    },
                    onSubmit: (formData: NewAccountFormData) => this.handleSubmit(formData, params.afterLogin),
                },
            }));
            this.controller.setMainComponent(component);
        }
        else {
            this.handleWolError("No servers available", this.strings.get("gui:noserversavailable"), { fatal: true });
        }
    }
    private submitForm(): void {
        if (!this.isBusy && this.controller) {
            this.newAccountBox?.submit();
        }
    }
    private async createAccount(username: string, password: string, regionId: string, afterLogin?: (params: any) => void): Promise<void> {
        const region = this.serverRegions.get(regionId);
        this.serverRegions.setSelectedRegion(regionId);
        const connectingTask = new Task(async (cancellationToken) => {
            await sleep(1000);
            if (!cancellationToken.isCancelled()) {
                this.messageBoxApi.show(this.strings.get("TXT_CONNECTING"));
            }
        });
        connectingTask.start();
        try {
            const requestBody = {
                locale: this.appLocale,
                user: username,
                pass: password,
            };
            const response = await new HttpRequest().fetchJson<ApiResponse>(region.apiRegUrl, undefined, {
                method: "POST",
                body: JSON.stringify(requestBody),
            });
            connectingTask.cancel();
            this.messageBoxApi.destroy();
            if (response.error) {
                this.handleValidationError(response.error);
                return;
            }
            this.controller?.goToScreen(ScreenType.Login, {
                useCredentials: { regionId: region.id, user: username, pass: password },
                afterLogin: afterLogin,
            });
        }
        catch (error) {
            connectingTask.cancel();
            this.messageBoxApi.destroy();
            this.handleWolError(error, this.strings.get("TS:ConnectFailed"), { fatal: false });
        }
    }
    private handleValidationError(message: string): void {
        this.messageBoxApi.show(message, this.strings.get("GUI:Ok"), () => {
            this.isBusy = false;
            this.controller?.showSidebarButtons();
        });
    }
    private handleWolError(error: any, message: string, { fatal }: {
        fatal: boolean;
    }): void {
        this.errorHandler.handle(error, message, () => {
            this.isBusy = false;
            if (this.controller) {
                if (fatal) {
                    this.controller.goToScreen(ScreenType.Home);
                }
                else {
                    this.controller.showSidebarButtons();
                }
            }
        });
    }
    async onLeave(): Promise<void> {
        this.newAccountBox = undefined;
        if (!this.isBusy && this.controller) {
            await this.controller.hideSidebarButtons();
        }
        this.isBusy = false;
    }
}
