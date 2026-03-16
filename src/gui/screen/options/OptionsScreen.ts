import { jsx } from "@/gui/jsx/jsx";
import { MainMenuController } from "@/gui/screen/mainMenu/MainMenuController";
import { GameMenuController } from "@/gui/screen/game/gameMenu/GameMenuController";
import { ScreenType as GameScreenType } from "@/gui/screen/game/gameMenu/ScreenType";
import { MainMenuScreenType } from "@/gui/screen/ScreenType";
import { StorageKey } from "@/LocalPrefs";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { GeneralOpts } from "@/gui/screen/options/component/GeneralOpts";
import { GeneralOptions } from "@/gui/screen/options/GeneralOptions";

interface ScreenController {
  setSidebarButtons(buttons: SidebarButton[]): void;
  showSidebarButtons(): void;
  hideSidebarButtons(): Promise<void>;
  setMainComponent(component: any): void;
  leaveCurrentScreen?(): void;
  pushScreen(screenType: any, params?: any): void;
  toggleMainVideo?(enabled: boolean): void;
}

interface SidebarButton {
  label: string;
  isBottom?: boolean;
  onClick: () => void;
}

interface Strings {
  get(key: string): string;
}

interface LocalPrefs {
  setItem(key: StorageKey, value: string): void;
}

interface FullScreen {
  // Add methods as needed
}

interface JsxRenderer {
  render(element: any): [any];
}

export class OptionsScreen {
  private controller!: ScreenController;
  private initialOptionsStr: string = "";
  public title: string;

  constructor(
    private strings: Strings,
    private jsxRenderer: JsxRenderer,
    private options: GeneralOptions,
    private localPrefs: LocalPrefs,
    private fullScreen: FullScreen,
    private inGame: boolean,
    private storageOptsEnabled: boolean
  ) {
    this.title = this.strings.get("GUI:Options");
  }

  setController(controller: ScreenController): void {
    this.controller = controller;
  }

  onEnter(): void {
    this.initialOptionsStr = this.options.serialize();
    
    if (this.controller instanceof MainMenuController) {
      this.controller.toggleMainVideo?.(false);
    }
    
    const buttons: SidebarButton[] = [
      {
        label: this.strings.get("GUI:Sound"),
        onClick: () => {
          if (this.controller instanceof GameMenuController) {
            this.controller.pushScreen(GameScreenType.OptionsSound);
          } else {
            this.controller?.pushScreen(MainMenuScreenType.OptionsSound);
          }
        },
      },
      {
        label: this.strings.get("GUI:Keyboard"),
        onClick: () => {
          if (this.controller instanceof GameMenuController) {
            this.controller.pushScreen(GameScreenType.OptionsKeyboard);
          } else {
            this.controller?.pushScreen(MainMenuScreenType.OptionsKeyboard);
          }
        },
      },
    ];

    // Add storage button if enabled and in main menu
    if (this.controller instanceof MainMenuController && this.storageOptsEnabled) {
      buttons.push({
        label: this.strings.get("GUI:Storage"),
        onClick: () => {
          (this.controller as MainMenuController).pushScreen(
            MainMenuScreenType.OptionsStorage,
            {}
          );
        },
      });
    }

    buttons.push({
      label: this.strings.get("GUI:Back"),
      isBottom: true,
      onClick: () => {
        this.controller?.leaveCurrentScreen();
      },
    });

    this.controller.setSidebarButtons(buttons);
    this.controller.showSidebarButtons();
    
    const [component] = this.jsxRenderer.render(
      jsx(HtmlView, {
        width: "100%",
        height: "100%",
        component: GeneralOpts,
        props: {
          options: this.options,
          fullScreen: this.fullScreen,
          strings: this.strings,
          inGame: this.inGame,
        },
      })
    );
    
    this.controller.setMainComponent(component);
  }

  async onLeave(): Promise<void> {
    const optionsStr = this.options.serialize();
    
    if (optionsStr !== this.initialOptionsStr) {
      this.localPrefs.setItem(StorageKey.Options, optionsStr);
    }
    
    await this.controller.hideSidebarButtons();
  }

  async onStack(): Promise<void> {
    await this.onLeave();
  }

  onUnstack(): void {
    this.onEnter();
  }
}
