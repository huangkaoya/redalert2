import { CancellationTokenSource, CancellationToken } from '@puzzl/core/lib/async/cancellation';
import { Task } from '@puzzl/core/lib/async/Task';
import { HtmlView } from '../../../jsx/HtmlView';
import { jsx } from '../../../jsx/jsx';
import { LADDER_REFRESH_INTERVAL } from '../../../../network/ladder/wladderConfig';
import { WLadderService } from '../../../../network/ladder/WLadderService';
import { CompositeDisposable } from '../../../../util/disposable/CompositeDisposable';
import { MainMenuScreen } from '../MainMenuScreen';
import { Ladder } from './component/Ladder';
import { HttpRequest } from '../../../../network/HttpRequest';
interface LadderScreenParams {
}
export class LadderScreen extends MainMenuScreen {
    public title: string;
    private strings: any;
    private wladderService: WLadderService;
    private jsxRenderer: any;
    private disposables = new CompositeDisposable();
    private ladderComponent?: any;
    private refreshTask?: Task<void>;
    constructor(strings: any, wladderService: WLadderService, jsxRenderer: any) {
        super();
        this.strings = strings;
        this.wladderService = wladderService;
        this.jsxRenderer = jsxRenderer;
        this.title = this.strings.get("GUI:Ladder") || "Ladder";
    }
    private initView() {
        const [component] = this.jsxRenderer.render(jsx(HtmlView, {
            innerRef: (ref: any) => (this.ladderComponent = ref),
            component: Ladder,
            props: {
                strings: this.strings,
                wladderService: this.wladderService,
                onError: (error: any) => this.handleError(error),
            },
        }));
        this.controller.setMainComponent(component);
        this.refreshSidebarButtons();
        this.controller.showSidebarButtons();
    }
    private refreshSidebarButtons() {
        const buttons = [
            {
                label: this.strings.get("GUI:Refresh"),
                tooltip: this.strings.get("STT:RefreshLadder"),
                onClick: () => this.refreshLadder(),
            },
            {
                label: this.strings.get("GUI:Back"),
                tooltip: this.strings.get("STT:Back"),
                isBottom: true,
                onClick: () => this.goBack(),
            },
        ];
        this.controller.setSidebarButtons(buttons);
    }
    private refreshLadder() {
        this.ladderComponent?.refresh();
    }
    private goBack() {
        this.controller?.goBack();
    }
    private handleError(error: any) {
        console.error('Ladder error:', error);
        let message = this.strings.get("ERR:LadderError");
        if (error instanceof HttpRequest.NetworkError) {
            message = this.strings.get("ERR:NetworkError");
        }
        else if (error instanceof HttpRequest.TimeoutError) {
            message = this.strings.get("ERR:TimeoutError");
        }
        console.error('Ladder error:', message, error);
    }
    private startPeriodicRefresh(cancellationToken: CancellationToken) {
        this.refreshTask = new Task(async (token) => {
            while (!token.isCancelled()) {
                await new Promise(resolve => setTimeout(resolve, LADDER_REFRESH_INTERVAL));
                if (!token.isCancelled()) {
                    this.refreshLadder();
                }
            }
        });
        this.refreshTask.start().catch(error => {
            console.error('Periodic refresh error:', error);
        });
    }
    async onEnter(params?: LadderScreenParams): Promise<void> {
        console.log('[LadderScreen] Entering ladder screen');
        this.controller.toggleMainVideo(false);
        const tokenSource = new CancellationTokenSource();
        this.disposables.add(() => tokenSource.cancel());
        if (!this.wladderService.getUrl()) {
            this.handleError(new Error('Ladder service not available'));
            return;
        }
        this.initView();
        this.startPeriodicRefresh(tokenSource.token);
    }
    async onLeave(): Promise<void> {
        console.log('[LadderScreen] Leaving ladder screen');
        this.disposables.dispose();
        if (this.refreshTask) {
            this.refreshTask.cancel();
            this.refreshTask = undefined;
        }
        await this.controller.hideSidebarButtons();
        this.ladderComponent = undefined;
    }
    onStack(): void {
        if (this.refreshTask) {
            this.refreshTask.cancel();
        }
    }
    onUnstack(): void {
        const tokenSource = new CancellationTokenSource();
        this.disposables.add(() => tokenSource.cancel());
        this.startPeriodicRefresh(tokenSource.token);
    }
}
