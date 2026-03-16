export interface LoadingScreenApi {
    start(...args: any[]): Promise<void>;
    onLoadProgress(percent: number): void;
    dispose(): void;
    updateViewport(): void;
}
