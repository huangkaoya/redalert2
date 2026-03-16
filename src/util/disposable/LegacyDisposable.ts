export class LegacyDisposable {
    private disposed: boolean = false;
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
    }
    public isDisposed(): boolean {
        return this.disposed;
    }
}
