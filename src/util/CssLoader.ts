export class CssLoader {
    private document: Document;
    constructor(document: Document) {
        this.document = document;
    }
    async load(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.type = "text/css";
            link.href = url;
            if ("onload" in link) {
                link.onload = () => resolve();
            }
            if ("onerror" in link) {
                link.onerror = () => reject(new Error(`Couldn't load CSS at "${url}"`));
            }
            this.document.head.appendChild(link);
            if (!("onload" in link)) {
                resolve();
            }
        });
    }
}
