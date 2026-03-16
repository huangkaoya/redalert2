import { Screen } from './Controller';
export abstract class RootScreen implements Screen {
    constructor() {
    }
    abstract onEnter(params?: any): void | Promise<void>;
    abstract onLeave(): void | Promise<void>;
    onStack?(): void | Promise<void> {
    }
    onUnstack?(): void | Promise<void> {
    }
    update?(deltaTime: number): void {
    }
    destroy?(): void {
    }
    abstract onViewportChange?(): void;
}
