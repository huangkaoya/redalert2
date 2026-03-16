export class IOError extends Error {
    public cause?: Error;
    constructor(message: string, cause?: Error) {
        super(message);
        this.name = "IOError";
        if (cause) {
            this.cause = cause;
        }
        Object.setPrototypeOf(this, IOError.prototype);
    }
}
