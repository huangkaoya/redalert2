import { BoxedVar } from '../util/BoxedVar';
export type CommandHandler = () => void;
declare global {
    interface Window {
        r?: Record<string, any>;
    }
}
export class DevToolsApi {
    private static cmdHandlers = new Map<string, CommandHandler>();
    private static runtimeVars = new Map<string, BoxedVar<any>>();
    static getPublicNamespace(): Record<string, any> {
        if (!window.r) {
            window.r = Object.create(null);
        }
        return window.r;
    }
    static registerCommand(name: string, handler: CommandHandler): void {
        const namespace = this.getPublicNamespace();
        if (namespace[name]) {
            console.error(`Command ${name} is already registered`);
            return;
        }
        this.cmdHandlers.set(name, handler);
        Object.defineProperty(namespace, name, {
            configurable: true,
            get: () => {
                const cmd = this.cmdHandlers.get(name);
                return cmd ? cmd() : undefined;
            },
        });
    }
    static unregisterCommand(name: string): void {
        if (this.cmdHandlers.has(name)) {
            this.cmdHandlers.delete(name);
            const namespace = this.getPublicNamespace();
            delete namespace[name];
        }
        else {
            console.error(`Command ${name} is not registered`);
        }
    }
    static registerVar<T>(name: string, boxedVar: BoxedVar<T>): void {
        const namespace = this.getPublicNamespace();
        if (namespace[name]) {
            console.error(`Runtime variable ${name} is already registered`);
            return;
        }
        this.runtimeVars.set(name, boxedVar);
        Object.defineProperty(namespace, name, {
            configurable: true,
            get: () => {
                const variable = this.runtimeVars.get(name);
                return variable ? variable.value : undefined;
            },
            set: (value: T) => {
                const variable = this.runtimeVars.get(name);
                if (variable) {
                    variable.value = value;
                }
            },
        });
    }
    static unregisterVar(name: string): void {
        if (this.runtimeVars.has(name)) {
            this.runtimeVars.delete(name);
            const namespace = this.getPublicNamespace();
            delete namespace[name];
        }
        else {
            console.error(`Runtime variable ${name} is not registered`);
        }
    }
    static listVars(): IterableIterator<string> {
        return this.runtimeVars.keys();
    }
    static listCommands(): IterableIterator<string> {
        return this.cmdHandlers.keys();
    }
}
