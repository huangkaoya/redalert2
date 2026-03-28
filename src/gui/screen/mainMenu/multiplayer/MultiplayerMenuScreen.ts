import { Screen } from '../../Controller';
import { MainMenuController } from '../MainMenuController';
import { MainMenuScreenType } from '../../ScreenType';
import { Strings } from '../../../../data/Strings';

interface SidebarButton {
  label: string;
  tooltip?: string;
  disabled?: boolean;
  isBottom?: boolean;
  onClick: () => void | Promise<void>;
}

export class MultiplayerMenuScreen implements Screen {
  private strings: Strings;
  private controller?: MainMenuController;

  public title: string;

  constructor(strings: Strings) {
    this.strings = strings;
    this.title = '联机';
  }

  setController(controller: MainMenuController): void {
    this.controller = controller;
  }

  onEnter(): void {
    console.log('[MultiplayerMenuScreen] Entering multiplayer menu');

    const buttons: SidebarButton[] = [
      {
        label: '局域网',
        tooltip: '通过局域网与其他玩家联机对战',
        onClick: () => {
          this.controller?.pushScreen(MainMenuScreenType.LanGame);
        },
      },
      {
        label: '游戏大厅',
        tooltip: '通过公网服务器浏览和加入多人游戏',
        onClick: () => {
          this.controller?.pushScreen(MainMenuScreenType.PublicLobby);
        },
      },
      {
        label: '自动匹配',
        tooltip: '自动匹配对手（开发中）',
        onClick: () => {
          this.controller?.pushScreen(MainMenuScreenType.AutoMatch);
        },
      },
      {
        label: this.strings.get('GUI:Back') || '返回',
        tooltip: '返回主菜单',
        isBottom: true,
        onClick: () => {
          this.controller?.goToScreen(MainMenuScreenType.Home);
        },
      },
    ];

    this.controller?.setSidebarButtons(buttons);
    this.controller?.showSidebarButtons();
    this.controller?.toggleMainVideo(false);
  }

  async onLeave(): Promise<void> {
    console.log('[MultiplayerMenuScreen] Leaving multiplayer menu');
    if (this.controller) {
      await this.controller.hideSidebarButtons();
    }
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
