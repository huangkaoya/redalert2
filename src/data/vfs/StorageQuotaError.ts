export class StorageQuotaError extends Error {
    public cause?: Error;
    constructor(message: string = "Storage quota exceeded", cause?: Error) {
        super(message);
        this.name = "StorageQuotaError";
        if (cause) {
            this.cause = cause;
        }
        Object.setPrototypeOf(this, StorageQuotaError.prototype);
    }
}
