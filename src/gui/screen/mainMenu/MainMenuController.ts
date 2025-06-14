import { Controller, Screen } from '../Controller';
import { MainMenuScreenType } from '../ScreenType';
import { EventDispatcher } from '../../../util/event';
import { SoundKey } from '../../../engine/sound/SoundKey';
import { ChannelType } from '../../../engine/sound/ChannelType';

export class MainMenuController extends Controller {
  private mainMenu: any; // MainMenu component
  private sound?: any; // Sound system
  private music?: any; // Music system

  constructor(mainMenu: any, sound?: any, music?: any) {
    super();
    this.mainMenu = mainMenu;
    this.sound = sound;
    this.music = music;
    
    console.log('[MainMenuController] Initialized');
  }

  // Override to use MainMenuScreenType
  async goToScreenBlocking(screenType: MainMenuScreenType, params?: any): Promise<void> {
    return super.goToScreenBlocking(screenType, params);
  }

  goToScreen(screenType: MainMenuScreenType, params?: any): void {
    return super.goToScreen(screenType, params);
  }

  async pushScreen(screenType: MainMenuScreenType, params?: any): Promise<void> {
    // Clear main component and sidebar title before pushing
    this.setMainComponent();
    this.setSidebarTitle("");
    
    await super.pushScreen(screenType, params);
    
    // Set sidebar title from the new screen if it has one (like original)
    const screen = this.screens.get(screenType);
    if (screen?.title) {
      this.setSidebarTitle(screen.title);
    }
    
    // Play music based on screen's musicType (match original project logic)
    if (screen && 'musicType' in screen && screen.musicType !== undefined && this.music) {
      console.log(`[MainMenuController] Playing music for screen ${screenType}: ${screen.musicType}`);
      try {
        await this.music.play(screen.musicType);
      } catch (error) {
        console.error(`[MainMenuController] Failed to play music for screen ${screenType}:`, error);
      }
    }
  }

  async popScreen(): Promise<void> {
    // Clear main component and sidebar title before popping
    this.setMainComponent();
    this.setSidebarTitle("");
    
    await super.popScreen();
    
    // Set sidebar title from the restored screen if it has one
    const currentScreen = this.getCurrentScreen();
    if (currentScreen?.title) {
      this.setSidebarTitle(currentScreen.title);
    }
  }

  // Main menu specific methods
  setSidebarButtons(buttons: any[]): void {
    console.log(`[MainMenuController] Setting ${buttons.length} sidebar buttons`);
    if (this.mainMenu && this.mainMenu.setButtons) {
      this.mainMenu.setButtons(buttons);
    }
  }

  showSidebarButtons(): void {
    console.log('[MainMenuController] Showing sidebar buttons');
    if (this.mainMenu && this.mainMenu.isSidebarCollapsed && this.mainMenu.isSidebarCollapsed()) {
      // Play move in sound (match original project)
      if (this.sound) {
        this.sound.play(SoundKey.GUIMoveInSound, ChannelType.Ui);
      }
      if (this.mainMenu.showButtons) {
        this.mainMenu.showButtons();
      }
    }
  }

  async hideSidebarButtons(): Promise<void> {
    console.log('[MainMenuController] Hiding sidebar buttons');
    if (this.mainMenu && this.mainMenu.isSidebarCollapsed && !this.mainMenu.isSidebarCollapsed()) {
      // Play move out sound (match original project)
      if (this.sound) {
        this.sound.play(SoundKey.GUIMoveOutSound, ChannelType.Ui);
      }
      
      // Return a promise that resolves when animation completes (match original project)
      return new Promise((resolve) => {
        if (this.mainMenu && this.mainMenu.onSidebarToggle) {
          const handler = () => {
            this.mainMenu!.onSidebarToggle.unsubscribe(handler);
            resolve();
          };
          this.mainMenu.onSidebarToggle.subscribe(handler);
          this.mainMenu.hideButtons();
        } else {
          // Fallback if onSidebarToggle is not available
          if (this.mainMenu && this.mainMenu.hideButtons) {
            this.mainMenu.hideButtons();
          }
          setTimeout(resolve, 300); // Match animation time
        }
      });
    }
  }

  toggleMainVideo(show: boolean): void {
    console.log(`[MainMenuController] ${show ? 'Showing' : 'Hiding'} main video`);
    if (this.mainMenu && this.mainMenu.toggleVideo) {
      this.mainMenu.toggleVideo(show);
    }
  }

  showVersion(version: string): void {
    console.log(`[MainMenuController] Showing version: ${version}`);
    if (this.mainMenu && this.mainMenu.showVersion) {
      this.mainMenu.showVersion(version);
    }
  }

  hideVersion(): void {
    console.log('[MainMenuController] Hiding version');
    if (this.mainMenu && this.mainMenu.hideVersion) {
      this.mainMenu.hideVersion();
    }
  }

  setSidebarTitle(title: string): void {
    console.log(`[MainMenuController] Setting sidebar title: ${title}`);
    if (this.mainMenu && this.mainMenu.setSidebarTitle) {
      this.mainMenu.setSidebarTitle(title);
    }
  }

  setMainComponent(component?: any): void {
    if (this.mainMenu && this.mainMenu.setContentComponent) {
      this.mainMenu.setContentComponent(component);
    }
  }

  rerenderCurrentScreen(): void {
    console.log('[MainMenuController] Rerendering current screen');
    // Force current screen to re-enter if it exists
    const currentScreen = this.getCurrentScreen();
    const currentScreenType = this.getCurrentScreenType();
    
    if (currentScreen && currentScreenType !== undefined) {
      // Re-enter the current screen to refresh its state
      currentScreen.onLeave();
      currentScreen.onEnter();
    }
  }

  destroy(): void {
    console.log('[MainMenuController] Destroying');
    super.destroy();
  }
} 