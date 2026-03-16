import { ScriptLoader } from "./ScriptLoader";
interface SentryConfig {
    dsn: string;
    env: string;
    defaultIntegrations?: boolean;
    lazyLoad?: boolean;
}
interface SentrySDK {
    init: (config: any) => void;
    onLoad: (callback: () => void) => void;
    forceLoad: () => void;
    captureException: (error: Error, context?: any) => void;
    configureScope: (callback: (scope: any) => void) => void;
    addBreadcrumb: (breadcrumb: any) => void;
}
declare global {
    interface Window {
        Sentry: SentrySDK;
    }
}
export class Sentry {
    private sdk?: SentrySDK;
    async init(config: SentryConfig, release: string): Promise<void> {
        await new ScriptLoader(document).load(`https://js.sentry-cdn.com/${config.dsn}.min.js`);
        let sdk = (this.sdk = window.Sentry);
        const initTime = new Date();
        sdk.init({
            environment: config.env,
            release: release,
            denyUrls: [/^file:/],
            ignoreErrors: [
                /init message from worker/,
                /The object can not be found here/,
                /itemsclipboard/,
                /A requested file or directory could not be found/,
                /The requested file could not be read/,
                /The play\(\) request/,
                /^db$/,
            ],
            initialScope: (scope: any) => scope
                .setTags({ locale: navigator.language })
                .setExtra("initTime", initTime),
            ...(config.defaultIntegrations ? {} : { defaultIntegrations: false }),
        });
        sdk.onLoad(() => {
            this.sdk = window.Sentry;
        });
        if (!config.lazyLoad) {
            sdk.forceLoad();
        }
    }
    captureException(error: Error, context?: any): void {
        this.sdk?.captureException(error, context);
    }
    configureScope(callback: (scope: any) => void): void {
        this.sdk?.configureScope(callback);
    }
    addBreadcrumb(breadcrumb: any): void {
        this.sdk?.addBreadcrumb(breadcrumb);
    }
}
