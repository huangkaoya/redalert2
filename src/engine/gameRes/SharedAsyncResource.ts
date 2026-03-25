export class SharedAsyncResource<T> {
    private currentPromise?: Promise<T>;

    constructor(private readonly factory: () => Promise<T>) {
    }

    get(): Promise<T> {
        if (!this.currentPromise) {
            this.currentPromise = this.factory().catch((error) => {
                this.currentPromise = undefined;
                throw error;
            });
        }
        return this.currentPromise;
    }

    reset(): void {
        this.currentPromise = undefined;
    }
}
