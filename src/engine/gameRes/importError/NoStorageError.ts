export class NoStorageError extends Error {
    constructor(message: string = "No available or functional storage adapters found.") {
        super(message);
        this.name = "NoStorageError";
    }
}
