import { ScreenType } from '@/gui/screen/game/gameMenu/ScreenType';
import { FullScreen } from '@/gui/FullScreen';
import { getHumanReadableKey } from '@/gui/screen/options/component/getHumanReadableKey';
import { GameMenuScreen } from '@/gui/screen/game/GameMenuScreen';

// Type definitions
interface Strings {
  get(key: string, ...args: any[]): string;
}

interface GameMenuHomeParams {
  onCancel: () => void;
  onQuit?: () => void;
  onObserve?: () => void;
  observeAllowed?: boolean;
}

interface SidebarButton {
  label: string;
  isBottom?: boolean;
  tooltip?: string;
  disabled?: boolean;
  onClick: () => void;
}

interface GameMenuController {
  toggleContentAreaVisibility(visible: boolean): void;
  setSidebarButtons(buttons: SidebarButton[]): void;
  showSidebarButtons(): void;
  hideSidebarButtons(): void;
  pushScreen?(screenType: ScreenType, params?: any): Promise<void>;
}

export class GameMenuHomeScreen extends GameMenuScreen {
  private strings: Strings;
  private fullScreen: FullScreen;
  private params?: GameMenuHomeParams;
  declare controller?: GameMenuController;

  constructor(strings: Strings, fullScreen: FullScreen) {
    super();
    this.strings = strings;
    this.fullScreen = fullScreen;
  }

  onEnter(params: GameMenuHomeParams): void {
    this.params = params;
    this.controller?.toggleContentAreaVisibility(true);
    this.initView(params);
  }

  private initView(params: GameMenuHomeParams): void {
    const strings = this.strings;
    const buttons: SidebarButton[] = [
      {
        label: strings.get("GUI:Options"),
        onClick: () => {
          this.controller?.pushScreen?.(ScreenType.Options);
        },
      },
      {
        label: strings.get(
          "GUI:Fullscreen",
          getHumanReadableKey(FullScreen.hotKey)
        ),
        tooltip: strings.get("STT:Fullscreen"),
        disabled: !this.fullScreen.isAvailable(),
        onClick: () => this.fullScreen.toggle(),
      },
      {
        label: strings.get("GUI:AbortMission"),
        onClick: () => {
          this.controller?.pushScreen?.(
            ScreenType.QuitConfirm,
            this.params
          );
        },
      },
      {
        label: strings.get("GUI:ResumeMission"),
        isBottom: true,
        onClick: params.onCancel,
      },
    ];

    this.controller?.setSidebarButtons(buttons);
    this.controller?.showSidebarButtons();
  }

  async onLeave(): Promise<void> {
    this.controller?.hideSidebarButtons();
    this.controller?.toggleContentAreaVisibility(false);
  }

  async onStack(): Promise<void> {
    this.controller?.hideSidebarButtons();
  }

  onUnstack(): void {
    if (this.params) {
      this.initView(this.params);
    }
  }
}
  
