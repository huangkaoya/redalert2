export class ArchiveDownloadError extends Error {
    public url: string;
    public cause?: any;
    constructor(url: string, message: string, options?: {
        cause?: any;
    }) {
        super(message);
        this.name = "ArchiveDownloadError";
        this.url = url;
        if (options?.cause) {
            this.cause = options.cause;
        }
    }
}
