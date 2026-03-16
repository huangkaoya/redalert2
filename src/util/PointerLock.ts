import { EventDispatcher } from "./event";
import { CompositeDisposable } from "./disposable/CompositeDisposable";
export class PointerLock {
    private element: HTMLElement;
    private document: Document;
    private _onChange: EventDispatcher<PointerLock, boolean>;
    private disposables: CompositeDisposable;
    private listening: boolean;
    get onChange() {
        return this._onChange.asEvent();
    }
    constructor(element: HTMLElement, document: Document) {
        this.element = element;
        this.document = document;
        this._onChange = new EventDispatcher();
        this.disposables = new CompositeDisposable();
        this.listening = false;
    }
    async request(options?: {
        unadjustedMovement?: boolean;
    }): Promise<void> {
        if (options?.unadjustedMovement) {
            try {
                await this.requestInternal({ unadjustedMovement: true });
            }
            catch (e) {
                if ((e as Error).name !== "NotSupportedError")
                    throw e;
                await this.requestInternal();
            }
        }
        else {
            await this.requestInternal();
        }
    }
    private async requestInternal(options?: PointerLockOptions): Promise<void> {
        if (!this.isActive()) {
            if (!this.listening) {
                this.listening = true;
                const changeHandler = () => {
                    this._onChange.dispatch(this, this.isActive());
                };
                this.document.addEventListener("pointerlockchange", changeHandler, false);
                this.disposables.add(() => this.document.removeEventListener("pointerlockchange", changeHandler, false));
                const touchHandler = () => {
                    this.exit().catch((e) => console.error(e));
                };
                this.document.addEventListener("touchstart", touchHandler, false);
                this.disposables.add(() => this.document.removeEventListener("touchstart", touchHandler, false));
            }
            return new Promise<void>((resolve, reject) => {
                const changeHandler = () => {
                    this.document.removeEventListener("pointerlockchange", changeHandler, false);
                    this.document.removeEventListener("pointerlockerror", errorHandler, false);
                    resolve();
                };
                const errorHandler = (e: Event) => {
                    this.document.removeEventListener("pointerlockchange", changeHandler, false);
                    this.document.removeEventListener("pointerlockerror", errorHandler, false);
                    console.error(e);
                    reject(new Error("Pointer lock error"));
                };
                this.document.addEventListener("pointerlockerror", errorHandler, false);
                this.document.addEventListener("pointerlockchange", changeHandler, false);
                this.element.requestPointerLock(options)?.catch?.(reject);
            });
        }
    }
    async exit(): Promise<void> {
        if (this.isActive()) {
            return new Promise<void>((resolve, reject) => {
                const changeHandler = () => {
                    this.document.removeEventListener("pointerlockchange", changeHandler, false);
                    this.document.removeEventListener("pointerlockerror", errorHandler, false);
                    resolve();
                };
                const errorHandler = (e: Event) => {
                    this.document.removeEventListener("pointerlockchange", changeHandler, false);
                    this.document.removeEventListener("pointerlockerror", errorHandler, false);
                    console.error(e);
                    reject(new Error("Pointer lock error"));
                };
                this.document.addEventListener("pointerlockerror", errorHandler, false);
                this.document.addEventListener("pointerlockchange", changeHandler, false);
                this.document.exitPointerLock();
            });
        }
    }
    isActive(): boolean {
        return this.element === this.document.pointerLockElement;
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
