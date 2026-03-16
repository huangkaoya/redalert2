import { EventDispatcher } from '@/util/event';
export class GameEventBus {
    private dispatcher: EventDispatcher;
    private dispatchersByType: Map<string, EventDispatcher>;
    constructor() {
        this.dispatcher = new EventDispatcher();
        this.dispatchersByType = new Map();
    }
    dispatch(event: any): void {
        this.dispatcher.dispatch(undefined, event);
        this.dispatchersByType.get(event.type)?.dispatch(undefined, event);
    }
    subscribe(typeOrHandler: string | ((event: any) => void), handler?: (event: any) => void): () => void {
        let type: string | undefined;
        let callback: (event: any) => void;
        if (typeof typeOrHandler === 'function') {
            callback = typeOrHandler;
        }
        else {
            type = typeOrHandler;
            callback = handler!;
        }
        if (type === undefined) {
            this.dispatcher.subscribe(callback);
            return () => this.unsubscribe(callback);
        }
        else {
            return this.subscribeType(type, callback);
        }
    }
    unsubscribe(typeOrHandler: string | ((event: any) => void), handler?: (event: any) => void): void {
        let type: string | undefined;
        let callback: (event: any) => void;
        if (typeof typeOrHandler === 'function') {
            callback = typeOrHandler;
        }
        else {
            type = typeOrHandler;
            callback = handler!;
        }
        if (type === undefined) {
            this.dispatcher.unsubscribe(callback);
        }
        else {
            this.unsubscribeType(type, callback);
        }
    }
    private subscribeType(type: string, handler: (event: any) => void): () => void {
        let dispatcher = this.dispatchersByType.get(type);
        if (!dispatcher) {
            dispatcher = new EventDispatcher();
            this.dispatchersByType.set(type, dispatcher);
        }
        dispatcher.subscribe(handler);
        return () => this.unsubscribeType(type, handler);
    }
    private unsubscribeType(type: string, handler: (event: any) => void): void {
        this.dispatchersByType.get(type)?.unsubscribe(handler);
    }
}
