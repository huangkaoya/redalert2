export class RendererError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'RendererError';
    }
}
