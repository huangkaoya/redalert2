export interface Disposable {
    dispose(): void;
}
export interface Destroyable {
    destroy(): void;
}
export type DisposableFunction = () => void;
export type DisposableItem = Disposable | Destroyable | DisposableFunction;
export class CompositeDisposable implements Disposable {
    private disposables = new Set<DisposableItem>();
    add(...items: DisposableItem[]): void {
        items.forEach(item => {
            if (typeof item === 'function') {
                this.disposables.add(item);
            }
            else {
                this.disposables.add(item);
            }
        });
    }
    remove(...items: DisposableItem[]): void {
        items.forEach(item => {
            this.disposables.delete(item);
        });
    }
    dispose(): void {
        this.disposables.forEach(item => {
            if (typeof item === 'function') {
                item();
            }
            else if ('dispose' in item) {
                item.dispose();
            }
            else if ('destroy' in item) {
                item.destroy();
            }
        });
        this.disposables.clear();
    }
}
