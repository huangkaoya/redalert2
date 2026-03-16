export class ScriptLoader {
    private document: Document;
    constructor(document: Document) {
        this.document = document;
    }
    async load(url: string, options: {
        type?: string;
        charset?: string;
        async?: boolean;
        attrs?: Record<string, string>;
        text?: string;
    } = {}): Promise<void> {
        return new Promise((resolve, reject) => {
            const head = this.document.head;
            const script = this.document.createElement("script");
            script.type = options.type || "text/javascript";
            script.charset = options.charset || "utf8";
            script.async = options.async ?? true;
            script.src = url;
            if (options.attrs) {
                Object.keys(options.attrs).forEach(key => script.setAttribute(key, options.attrs![key]));
            }
            if (options.text) {
                script.text = options.text;
            }
            script.onload = () => resolve();
            const error = new Error(`Failed to load script "${url}"`);
            script.onerror = () => reject(error);
            head.appendChild(script);
        });
    }
}
