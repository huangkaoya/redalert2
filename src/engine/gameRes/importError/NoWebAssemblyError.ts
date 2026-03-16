export class NoWebAssemblyError extends Error {
    public cause?: any;
    constructor(message: string, options?: {
        cause?: any;
    }) {
        super(message);
        this.name = "NoWebAssemblyError";
        if (options?.cause) {
            this.cause = options.cause;
        }
        Object.setPrototypeOf(this, NoWebAssemblyError.prototype);
    }
}
