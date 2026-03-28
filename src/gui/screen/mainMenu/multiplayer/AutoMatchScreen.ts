import { Screen } from '../../Controller';
import { MainMenuController } from '../MainMenuController';
import { Strings } from '../../../../data/Strings';
import { jsx } from '@/gui/jsx/jsx';
import { HtmlView } from '@/gui/jsx/HtmlView';
import { AutoMatchPlaceholder } from './component/AutoMatchPlaceholder';

interface SidebarButton {
  label: string;
  tooltip?: string;
  disabled?: boolean;
  isBottom?: boolean;
  onClick: () => void | Promise<void>;
}

export class AutoMatchScreen implements Screen {
  private strings: Strings;
  private jsxRenderer: any;
  private controller?: MainMenuController;

  public title: string;

  constructor(strings: Strings, _messageBoxApi: unknown, jsxRenderer: any) {
    this.strings = strings;
    this.jsxRenderer = jsxRenderer;
    this.title = '自动匹配';
  }

  setController(controller: MainMenuController): void {
    this.controller = controller;
  }

  onEnter(): void {
    console.log('[AutoMatchScreen] Entering auto-match screen');
    this.controller?.toggleMainVideo(false);
    this.initUI();
    this.refreshSidebarButtons();
    this.controller?.showSidebarButtons();
  }

  private initUI(): void {
    const [component] = this.jsxRenderer.render(jsx(HtmlView, {
      component: AutoMatchPlaceholder,
      props: {},
    }));
    this.controller?.setMainComponent(component);
  }

  private refreshSidebarButtons(): void {
    const buttons: SidebarButton[] = [
      {
        label: this.strings.get('GUI:Back') || '返回',
        isBottom: true,
        onClick: () => {
          this.controller?.leaveCurrentScreen();
        },
      },
    ];
    this.controller?.setSidebarButtons(buttons);
  }

  async onLeave(): Promise<void> {
    console.log('[AutoMatchScreen] Leaving auto-match screen');
    if (this.controller) {
      await this.controller.hideSidebarButtons();
    }
    this.controller?.setMainComponent();
  }

  async onStack(): Promise<void> {
    await this.onLeave();
  }

  onUnstack(): void {
    this.onEnter();
  }

  update(_deltaTime: number): void {}

  destroy(): void {}
}
