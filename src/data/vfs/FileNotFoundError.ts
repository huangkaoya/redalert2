export class FileNotFoundError extends Error {
    public cause?: Error;
    constructor(message?: string, cause?: Error) {
        super(message);
        this.name = "FileNotFoundError";
        if (cause) {
            this.cause = cause;
        }
        Object.setPrototypeOf(this, FileNotFoundError.prototype);
    }
}
