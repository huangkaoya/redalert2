export class InvalidArchiveError extends Error {
    public cause?: any;
    constructor(message: string, options?: {
        cause?: any;
    }) {
        super(message);
        this.name = "InvalidArchiveError";
        if (options?.cause) {
            this.cause = options.cause;
        }
        Object.setPrototypeOf(this, InvalidArchiveError.prototype);
    }
}
