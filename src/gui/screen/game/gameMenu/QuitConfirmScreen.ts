import { GameMenuScreen } from '@/gui/screen/game/GameMenuScreen';

// Type definitions
interface Strings {
  get(key: string, ...args: any[]): string;
}

interface QuitConfirmParams {
  onQuit: () => void;
  onCancel: () => void;
  onObserve?: () => void;
  observeAllowed?: boolean;
}

interface SidebarButton {
  label: string;
  isBottom?: boolean;
  onClick: () => void;
}

interface GameMenuController {
  setSidebarButtons(buttons: SidebarButton[]): void;
  showSidebarButtons(): void;
  hideSidebarButtons(): void;
}

export class QuitConfirmScreen extends GameMenuScreen {
  private strings: Strings;
  declare controller?: GameMenuController;

  constructor(strings: Strings) {
    super();
    this.strings = strings;
  }

  onEnter(params: QuitConfirmParams): void {
    this.initView(params);
  }

  private initView(params: QuitConfirmParams): void {
    const strings = this.strings;
    const buttons: SidebarButton[] = [
      { label: strings.get("GUI:Quit"), onClick: params.onQuit },
      ...(params.observeAllowed
        ? [{ label: strings.get("GUI:Observe"), onClick: params.onObserve! }]
        : []),
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
  }
}
  
