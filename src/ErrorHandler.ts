interface MessageBoxApi {
    show(message: string, buttonText?: string, callback?: () => void): void;
}
interface StringsApi {
    get(key: string): string;
}
export class ErrorHandler {
    private messageBoxApi: MessageBoxApi;
    private strings: StringsApi;
    private isErrorState: boolean = false;
    constructor(messageBoxApi: MessageBoxApi, strings: StringsApi) {
        this.messageBoxApi = messageBoxApi;
        this.strings = strings;
    }
    handle(error: any, message: string, callback?: () => void): void {
        if (!this.isErrorState) {
            if (callback) {
                this.messageBoxApi.show(message, this.strings.get("GUI:Ok"), () => {
                    this.isErrorState = false;
                    callback();
                });
            }
            else {
                this.messageBoxApi.show(message);
            }
        }
        console.error("Handled error:", error);
        this.isErrorState = true;
    }
}
