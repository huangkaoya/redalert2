export interface IDisposable {
    dispose(): void;
}
export class Disposable implements IDisposable {
    private _isDisposed: boolean = false;
    public get isDisposed(): boolean {
        return this._isDisposed;
    }
    public dispose(): void {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
    }
}
