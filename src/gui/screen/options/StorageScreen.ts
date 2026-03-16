import { jsx } from '../../jsx/jsx';
import { HtmlView } from '../../jsx/HtmlView';
import StorageExplorer from './component/StorageExplorer';
import { MainMenuScreen } from '../mainMenu/MainMenuScreen';
import { Strings } from '../../../data/Strings';
import { JsxRenderer } from '../../jsx/JsxRenderer';
import { MessageBoxApi } from '../../component/MessageBoxApi';
import { Engine } from '../../../engine/Engine';

export class StorageScreen extends MainMenuScreen {
  private strings: Strings;
  private messageBoxApi: MessageBoxApi;
  private appVersion: string;
  private storageEnabled: boolean;
  private quickMatchEnabled: boolean;
  declare title: string;

  constructor(
    strings: Strings,
    messageBoxApi: MessageBoxApi,
    appVersion: string,
    storageEnabled: boolean = false,
    quickMatchEnabled: boolean = false
  ) {
    super();
    this.strings = strings;
    this.messageBoxApi = messageBoxApi;
    this.appVersion = appVersion;
    this.storageEnabled = storageEnabled;
    this.quickMatchEnabled = quickMatchEnabled;
    this.title = this.strings.get("GUI:Storage") || "Storage";
  }

  onEnter(params?: any): void {
    console.log('[StorageScreen] Entering storage screen');
    
    // Set sidebar buttons (only Back button as per original)
    if (this.controller) {
      this.controller.setSidebarButtons([
        {
          label: this.strings.get("GUI:Back") || "Back",
          isBottom: true,
          onClick: () => {
            console.log('[StorageScreen] Back button clicked');
            this.controller?.leaveCurrentScreen();
          },
        },
      ]);
      this.controller.showSidebarButtons();

      // Get dependencies from Engine and controller
      const mainMenuController = this.controller as any;
      const jsxRenderer = mainMenuController.mainMenu?.jsxRenderer;
      const rfs = Engine.rfs;
      
      if (!jsxRenderer) {
        console.error('[StorageScreen] JSX renderer not available from main menu');
        return;
      }

      // Create and render the storage explorer component
      const storageDirHandle = rfs?.getRootDirectoryHandle();
      
      if (!storageDirHandle) {
        console.error('[StorageScreen] No storage directory handle available');
        // Show error message
        const ErrorComponent = () => {
          return jsx('div', { style: { padding: '20px', textAlign: 'center' } },
            jsx('h3', null, 'Storage Error'),
            jsx('p', null, 'No storage directory handle available. Please ensure the game resources are properly imported.')
          );
        };
        
        const [errorElement] = jsxRenderer.render(
          jsx(HtmlView, {
            width: "100%",
            height: "100%",
            component: ErrorComponent,
            props: {}
          })
        );
        this.controller.setMainComponent(errorElement);
        return;
      }

      // Use the MessageBoxApi passed through constructor (from GUI system)
      const messageBoxApi = this.messageBoxApi;

      // Render the storage explorer
      const [element] = jsxRenderer.render(
        jsx(HtmlView, {
          width: "100%",
          height: "100%",
          component: StorageExplorer,
          props: {
            strings: this.strings,
            messageBoxApi: messageBoxApi,
            storageDirHandle: storageDirHandle,
            startIn: params?.startIn,
            onFileSystemChange: () => {
              console.log('[StorageScreen] File system changed, updating sidebar');
              // Update sidebar to show "Exit and Reload" button as per original
              this.controller?.setSidebarButtons([
                {
                  label: this.strings.get("GUI:ExitAndReload") || "Exit and Reload",
                  isBottom: true,
                  onClick: () => {
                    console.log('[StorageScreen] Exit and Reload clicked');
                    location.reload();
                  },
                },
              ]);
            },
          },
        })
      );

      this.controller.setMainComponent(element);
    }
  }

  async onLeave(): Promise<void> {
    console.log('[StorageScreen] Leaving storage screen');
    if (this.controller) {
      await this.controller.hideSidebarButtons();
    }
  }
} 
