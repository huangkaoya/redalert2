import { CompositeDisposable } from '../../util/disposable/CompositeDisposable';
import { BoxedVar } from '../../util/BoxedVar';
import { Strings } from '../../data/Strings';
import { HtmlReactElement } from '../HtmlReactElement';
import { Dialog } from './Dialog';
import { ReactFormat } from '../ReactFormat';
export class BasicErrorBoxApi {
    private viewport: BoxedVar<{
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
    private strings: Strings;
    private rootEl: HTMLElement;
    private disposables: CompositeDisposable;
    private component?: HtmlReactElement;
    constructor(viewport: BoxedVar<{
        x: number;
        y: number;
        width: number;
        height: number;
    }>, strings: Strings, rootEl: HTMLElement) {
        this.viewport = viewport;
        this.strings = strings;
        this.rootEl = rootEl;
        this.disposables = new CompositeDisposable();
    }
    async show(message: string, fatal: boolean = false): Promise<void> {
        return new Promise((resolve) => {
            this.component = HtmlReactElement.factory(Dialog, {
                children: ReactFormat.formatMultiline(message, (line) => ReactFormat.formatUrls(line)),
                className: 'basic-error-box',
                viewport: this.viewport.value,
                buttons: fatal
                    ? []
                    : [
                        {
                            label: this.strings.get('GUI:Ok'),
                            onClick: () => {
                                this.destroy();
                                resolve();
                            }
                        }
                    ]
            });
            const handleViewportChange = (viewport: {
                x: number;
                y: number;
                width: number;
                height: number;
            }) => {
                if (this.component) {
                    this.component.setSize(viewport.width, viewport.height);
                    this.component.applyOptions((props) => {
                        props.viewport = viewport;
                    });
                }
            };
            this.viewport.onChange.subscribe(handleViewportChange);
            this.component.setSize(this.viewport.value.width, this.viewport.value.height);
            this.component.render();
            this.rootEl.appendChild(this.component.getElement()!);
            this.disposables.add(() => this.viewport.onChange.unsubscribe(handleViewportChange), () => {
                if (this.component?.getElement() && this.rootEl.contains(this.component.getElement()!)) {
                    this.rootEl.removeChild(this.component.getElement()!);
                }
            }, () => this.component?.unrender(), () => { this.component = undefined; });
        });
    }
    destroy(): void {
        this.disposables.dispose();
    }
}
