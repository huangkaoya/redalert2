import { Renderer } from './engine/gfx/Renderer.js';
import { UiScene } from './gui/UiScene.js';
import { JsxRenderer } from './gui/jsx/JsxRenderer.js';
import { BoxedVar } from './util/BoxedVar.js';
import { RootController } from './gui/screen/RootController.js';
import { ScreenType, MainMenuScreenType } from './gui/screen/ScreenType.js';
import { MainMenuRootScreen } from './gui/screen/mainMenu/MainMenuRootScreen.js';
import { HomeScreen } from './gui/screen/mainMenu/main/HomeScreen.js';
import { StorageScreen } from './gui/screen/options/StorageScreen.js';
import { Config } from './Config.js';
import { Strings } from './data/Strings.js';
import { Engine } from './engine/Engine.js';
import { MusicType } from './engine/sound/Music.js';
import { MessageBoxApi } from './gui/component/MessageBoxApi.js';
import { ShpFile } from './data/ShpFile.js';
import { Palette } from './data/Palette.js';
import { UiAnimationLoop } from './engine/UiAnimationLoop.js';
import { Mixer } from './engine/sound/Mixer.js';
import { ChannelType } from './engine/sound/ChannelType.js';
import { AudioSystem } from './engine/sound/AudioSystem.js';
import { Sound } from './engine/sound/Sound.js';
import { SoundSpecs } from './engine/sound/SoundSpecs.js';
import { Music } from './engine/sound/Music.js';
import { MusicSpecs } from './engine/sound/MusicSpecs.js';
import { LocalPrefs, StorageKey } from './LocalPrefs.js';

export class Gui {
  private appVersion: string;
  private strings: Strings;
  private viewport: BoxedVar<{ x: number; y: number; width: number; height: number }>;
  private rootEl: HTMLElement;

  // Rendering
  private renderer?: Renderer;
  private uiScene?: UiScene;
  private jsxRenderer?: JsxRenderer;
  private uiAnimationLoop?: UiAnimationLoop;
  
  // Controllers
  private rootController?: RootController;
  private messageBoxApi?: MessageBoxApi;
  
  // 音频系统
  private mixer?: Mixer;
  private audioSystem?: AudioSystem;
  private sound?: Sound;
  private music?: Music;
  private localPrefs: LocalPrefs;
  
  // Resources
  private images: Map<string, ShpFile> = new Map();
  private palettes: Map<string, Palette> = new Map();
  
  // Animation loop
  private animationId?: number;
  private lastTime: number = 0;

  constructor(
    appVersion: string,
    strings: Strings,
    viewport: BoxedVar<{ x: number; y: number; width: number; height: number }>,
    rootEl: HTMLElement
  ) {
    this.appVersion = appVersion;
    this.strings = strings;
    this.viewport = viewport;
    this.rootEl = rootEl;
    this.localPrefs = new LocalPrefs(localStorage);
  }

  async init(): Promise<void> {
    console.log('[Gui] Initializing GUI system');
    
    // Initialize renderer
    this.initRenderer();
    
    // Initialize UI scene
    this.initUiScene();
    
    // Load game resources
    await this.loadGameResources();
    
    // Initialize audio system
    await this.initAudioSystem();
    
    // Initialize JSX renderer
    this.initJsxRenderer();
    
    // Initialize root controller
    this.initRootController();
    
    // Start animation loop (already started by UiAnimationLoop)
    this.startAnimationLoop();
    
    // Route to initial screen (includes audio permission check)
    await this.routeToInitialScreen();
  }

  private initRenderer(): void {
    console.log('[Gui] Initializing renderer');
    
    const { width, height } = this.viewport.value;
    this.renderer = new Renderer(width, height);
    this.renderer.init(this.rootEl);
    
    // Create and start UiAnimationLoop (match original project)
    this.uiAnimationLoop = new UiAnimationLoop(this.renderer);
    this.uiAnimationLoop.start();
    console.log('[Gui] UiAnimationLoop started');
    
    // Handle viewport changes (match original project)
    this.viewport.onChange.subscribe(this.handleViewportChange.bind(this));
  }

  private handleViewportChange(newViewport: { x: number; y: number; width: number; height: number }): void {
    console.log('[Gui] Viewport changed:', newViewport);
    
    // Update renderer size
    this.renderer?.setSize(newViewport.width, newViewport.height);
    
    if (this.uiScene) {
      // Create new camera for the new viewport
      const newCamera = UiScene.createCamera(newViewport);
      this.uiScene.setCamera(newCamera);
      this.uiScene.setViewport(newViewport);
      
      // Update JSX renderer camera
      if (this.jsxRenderer) {
        this.jsxRenderer.setCamera(newCamera);
      }
      
      // Rerender current screen
      this.rootController?.rerenderCurrentScreen();
    }
  }

  private initUiScene(): void {
    console.log('[Gui] Initializing UI scene');
    this.uiScene = UiScene.factory(this.viewport.value);
  }

  private initJsxRenderer(): void {
    console.log('[Gui] Initializing JSX renderer');
    
    if (!this.uiScene) {
      throw new Error('UiScene must be initialized before JsxRenderer');
    }
    
    // Use Engine's LazyResourceCollections directly since they have VFS access
    this.jsxRenderer = new JsxRenderer(
      Engine.images,
      Engine.palettes,
      this.uiScene.getCamera()
    );
    
    // Initialize MessageBoxApi
    this.messageBoxApi = new MessageBoxApi(
      this.viewport,
      this.uiScene,
      this.jsxRenderer
    );
  }

  private initRootController(): void {
    console.log('[Gui] Initializing root controller');
    this.rootController = new RootController();
  }

  private async loadGameResources(): Promise<void> {
    console.log('[Gui] Loading game resources');
    
    // Check if Engine.vfs is available
    if (!Engine.vfs) {
      console.warn('[Gui] Engine.vfs not available - skipping resource loading');
      return;
    }
    
    // Ensure Engine's LazyResourceCollections are connected to VFS
    Engine.images.setVfs(Engine.vfs);
    Engine.palettes.setVfs(Engine.vfs);
    
    console.log('[Gui] Engine LazyResourceCollections configured with VFS');
    
    // Test loading a few essential images to verify they work
    const testImages = ['mnscrnl.shp', 'lwscrnl.shp', 'sdtp.shp'];
    for (const imageName of testImages) {
      try {
        const shpFile = Engine.images.get(imageName);
        if (shpFile) {
          console.log(`[Gui] Successfully loaded test image: ${imageName} (${shpFile.width}x${shpFile.height})`);
        } else {
          console.warn(`[Gui] Failed to load test image: ${imageName}`);
        }
      } catch (error) {
        console.warn(`[Gui] Error loading test image ${imageName}:`, error);
      }
    }
  }

  private async getMainMenuVideoUrl(): Promise<string | File | undefined> {
    console.log('[Gui] Getting main menu video URL');
    
    const videoFileName = Engine.rfsSettings.menuVideoFileName;
    console.log('[Gui] Video file name:', videoFileName);
    
    try {
      // First check RFS (Real File System) - this is where imported videos are stored
      if (Engine.rfs) {
        console.log('[Gui] Checking RFS for video file...');
        try {
          const rfsContainsVideo = await Engine.rfs.containsEntry(videoFileName);
          console.log(`[Gui] RFS contains ${videoFileName}:`, rfsContainsVideo);
          
          if (rfsContainsVideo) {
            console.log('[Gui] Found video file in RFS:', videoFileName);
            const fileData = await Engine.rfs.getRawFile(videoFileName);
            const videoFile = new File([fileData], videoFileName, { type: "video/webm" });
            console.log('[Gui] Created video File object from RFS:', videoFile.name, videoFile.size, 'bytes');
            
            if (videoFile.size === 0) {
              console.warn('[Gui] Video file from RFS is empty!');
            } else {
              return videoFile;
            }
          }
        } catch (error) {
          console.warn('[Gui] Error checking RFS for video file:', error);
        }
      } else {
        console.warn('[Gui] Engine.rfs not available');
      }
      
      // Then check VFS (Virtual File System) - for original game files
      if (!Engine.vfs) {
        console.warn('[Gui] Engine.vfs not available - cannot load video');
        return undefined;
      }
      
      console.log('[Gui] Checking if video file exists in VFS...');
      console.log('[Gui] Available archives:', Engine.vfs.listArchives());
      
      // Check if video file exists in VFS
      console.log(`[Gui] Checking for video file: ${videoFileName}`);
      console.log(`[Gui] VFS fileExists result:`, Engine.vfs.fileExists(videoFileName));
      
      // Try to get video file from VFS
      if (Engine.vfs.fileExists(videoFileName)) {
        console.log('[Gui] Found video file in VFS:', videoFileName);
        const fileData = Engine.vfs.openFile(videoFileName).asFile();
        const videoFile = new File([fileData], videoFileName, { type: "video/webm" });
        console.log('[Gui] Created video File object:', videoFile.name, videoFile.size, 'bytes');
        
        // Test if the file data is valid
        if (videoFile.size === 0) {
          console.warn('[Gui] Video file is empty!');
          return undefined;
        }
        
        return videoFile;
      } else {
        console.warn('[Gui] Video file not found in VFS:', videoFileName);
        
        // Try alternative video file names - but don't create File objects for .bik files
        const alternativeNames = ['ra2ts_l.bik', 'ra2ts_l.mp4', 'menu.webm', 'menu.mp4', 'ra2ts_l.avi'];
        for (const altName of alternativeNames) {
          console.log(`[Gui] Checking alternative video file: ${altName}`);
          if (Engine.vfs.fileExists(altName)) {
            console.log('[Gui] Found alternative video file:', altName);
            
            // Only process .webm and .mp4 files, skip .bik files as they need conversion
            if (altName.endsWith('.bik')) {
              console.warn(`[Gui] Found .bik file but cannot play directly: ${altName}`);
              console.warn('[Gui] .bik files need to be converted to .webm during import process');
              continue;
            }
            
            const fileData = Engine.vfs.openFile(altName).asFile();
            const videoFile = new File([fileData], altName, { 
              type: altName.endsWith('.mp4') ? "video/mp4" : "video/webm" 
            });
            console.log('[Gui] Created alternative video File object:', videoFile.name, videoFile.size, 'bytes');
            return videoFile;
          }
        }
        
        console.warn('[Gui] No playable video file found, will proceed without video');
        
        return undefined;
      }
    } catch (error) {
      console.error('[Gui] Failed to read video file from VFS:', error);
      return undefined;
    }
  }

  private async routeToInitialScreen(): Promise<void> {
    console.log('[Gui] Routing to initial screen');
    
    if (!this.rootController || !this.uiScene || !this.jsxRenderer || !this.renderer || !this.messageBoxApi) {
      throw new Error('GUI components not properly initialized');
    }

    // Add UiScene to renderer (match original project architecture)
    this.renderer.addScene(this.uiScene);
    
    // Add UiScene's HTML container to DOM (critical for HTML elements to be visible)
    this.rootEl.appendChild(this.uiScene.getHtmlContainer().getElement()!);
    console.log('[Gui] Added UiScene HTML container to DOM');

    let hasShownDialog = false;

    // Check for audio permission (match original project logic)
    if (this.music && !hasShownDialog && this.audioSystem?.isSuspended()) {
      console.log('[Gui] Audio system is suspended, requesting permission');
      
      await new Promise<void>((resolve) => {
        this.messageBoxApi!.show(
          this.strings.get("GUI:RequestAudioPermission"),
          this.strings.get("GUI:OK"),
          async () => {
            try {
              await this.audioSystem!.initMusicLoop();
              console.log('[Gui] Audio permission granted and music loop initialized');
            } catch (error) {
              console.error('[Gui] Failed to initialize music loop:', error);
            }
            resolve();
          }
        );
      });
      
      hasShownDialog = true;
    }

    // Navigate to main menu
    await this.navigateToMainMenu();
  }

  private async navigateToMainMenu(): Promise<void> {
    console.log('[Gui] Navigating to main menu');
    
    if (!this.rootController || !this.uiScene || !this.jsxRenderer || !this.renderer || !this.messageBoxApi) {
      throw new Error('GUI components not properly initialized');
    }

    // Get video URL
    const videoSrc = await this.getMainMenuVideoUrl();
    console.log('[Gui] Video source:', videoSrc);

    // Create sub-screens map
    const subScreens = new Map<MainMenuScreenType, any>();
    subScreens.set(MainMenuScreenType.Home, HomeScreen);
    subScreens.set(MainMenuScreenType.OptionsStorage, StorageScreen);
    // 底层测试入口屏幕
    const { TestEntryScreen } = await import('./gui/screen/mainMenu/main/TestEntryScreen.js');
    subScreens.set(MainMenuScreenType.TestEntry, TestEntryScreen);
    
    // 添加信息与制作人员相关屏幕
    const { InfoAndCreditsScreen } = await import('./gui/screen/mainMenu/infoAndCredits/InfoAndCreditsScreen.js');
    const { CreditsScreen } = await import('./gui/screen/mainMenu/credits/CreditsScreen.js');
    subScreens.set(MainMenuScreenType.InfoAndCredits, InfoAndCreditsScreen);
    subScreens.set(MainMenuScreenType.Credits, CreditsScreen);
    
    // Create main menu root screen - use Engine's collections directly
    const mainMenuRootScreen = new MainMenuRootScreen(
      subScreens,
      this.uiScene,
      this.strings,
      Engine.images,  // Use Engine's LazyResourceCollection directly
      this.jsxRenderer,
      this.messageBoxApi,  // Pass MessageBoxApi to MainMenuRootScreen
      this.appVersion,
      videoSrc,  // Pass video source
      this.sound,  // Pass sound system
      this.music   // Pass music system
    );
    
    // Add screen to root controller
    this.rootController.addScreen(ScreenType.MainMenuRoot, mainMenuRootScreen);
    
    // Navigate to main menu
    this.rootController.goToScreen(ScreenType.MainMenuRoot);
  }

  private startAnimationLoop(): void {
    console.log('[Gui] Animation loop already started by UiAnimationLoop');
    // UiAnimationLoop handles the animation loop, we just need to update controllers
    // This method is kept for compatibility but the actual animation is handled by UiAnimationLoop
  }

  getRootController(): RootController {
    if (!this.rootController) {
      throw new Error('Root controller is not initialized');
    }
    return this.rootController;
  }

  getMessageBoxApi(): MessageBoxApi {
    if (!this.messageBoxApi) {
      throw new Error('MessageBoxApi is not initialized');
    }
    return this.messageBoxApi;
  }

  async destroy(): Promise<void> {
    console.log('[Gui] Destroying GUI system');

    // Clear static caches to avoid stale GPU resources across GUI instances
    try {
      // Clear SHP builder caches (textures, geometries, materials)
      const { ShpBuilder } = await import('./engine/renderable/builder/ShpBuilder.js');
      if (ShpBuilder?.clearCaches) {
        ShpBuilder.clearCaches();
        console.log('[Gui] Cleared ShpBuilder caches');
      }
      // Clear palette texture caches
      const TexUtils = await import('./engine/gfx/TextureUtils.js');
      if (TexUtils?.TextureUtils?.cache) {
        TexUtils.TextureUtils.cache.forEach((tex: any) => tex.dispose?.());
        TexUtils.TextureUtils.cache.clear();
        console.log('[Gui] Cleared TextureUtils caches');
      }
    } catch (e) {
      console.warn('[Gui] Failed to clear caches during destroy:', e);
    }

    // Destroy MessageBoxApi
    if (this.messageBoxApi) {
      this.messageBoxApi.destroy();
    }
    
    // Stop music and dispose audio system
    if (this.music) {
      this.music.stopPlaying();
      this.music.dispose();
    }
    
    if (this.sound) {
      this.sound.dispose();
    }
    
    if (this.audioSystem) {
      this.audioSystem.dispose();
    }
    
    // Save audio settings to local storage
    if (this.mixer) {
      this.localPrefs.setItem(StorageKey.Mixer, this.mixer.serialize());
    }
    
    if (this.music) {
      this.localPrefs.setItem(StorageKey.MusicOpts, this.music.serializeOptions());
    }
    
    // Stop UiAnimationLoop
    if (this.uiAnimationLoop) {
      this.uiAnimationLoop.destroy();
    }
    
    // Destroy root controller
    if (this.rootController) {
      this.rootController.destroy();
    }
    
    // Remove UI scene HTML container from DOM and destroy UI scene
    if (this.uiScene) {
      const htmlElement = this.uiScene.getHtmlContainer().getElement();
      if (htmlElement && this.rootEl.contains(htmlElement)) {
        this.rootEl.removeChild(htmlElement);
      }
      this.uiScene.destroy();
    }
    
    // Remove canvas from DOM and dispose renderer
    if (this.renderer) {
      this.rootEl.removeChild(this.renderer.getCanvas());
      this.renderer.dispose();
    }
  }

  private async initAudioSystem(): Promise<void> {
    console.log('[Gui] Initializing audio system');
    
    try {
      // 初始化Mixer
      let mixer: Mixer;
      const mixerData = this.localPrefs.getItem(StorageKey.Mixer);
      if (mixerData) {
        try {
          mixer = new Mixer().unserialize(mixerData);
          console.log('[Gui] Loaded mixer settings from local storage');
        } catch (error) {
          console.warn('Failed to read mixer values from local storage', error);
          mixer = this.createDefaultMixer();
        }
      } else {
        mixer = this.createDefaultMixer();
      }
      this.mixer = mixer;

      // 创建Mixer适配器用于AudioSystem
      const mixerAdapter = {
        onVolumeChange: {
          subscribe: (handler: (mixer: any, channel: ChannelType) => void) => {
            mixer.onVolumeChange.subscribe((data: [any, number]) => {
              handler(data[0], data[1]);
            });
          },
          unsubscribe: (handler: (mixer: any, channel: ChannelType) => void) => {
            // 这里需要保存原始的handler映射，暂时简化处理
            console.warn('[Gui] Mixer adapter unsubscribe not fully implemented');
          }
        },
        getVolume: (channel: ChannelType) => mixer.getVolume(channel),
        isMuted: (channel: ChannelType) => mixer.isMuted(channel),
        setMuted: (channel: ChannelType, muted: boolean) => mixer.setMuted(channel, muted)
      };

      // 初始化AudioSystem
      this.audioSystem = new AudioSystem(mixerAdapter);
      
      // 初始化Sound系统
      if (Engine.vfs) {
        const soundIni = Engine.getIni('sound.ini');
        const soundSpecs = new SoundSpecs(soundIni);
        
        // 创建audioVisual规则对象，从Engine的规则中获取音频视觉设置
        const audioVisualRules = {
          ini: {
            getString: (key: string) => {
              // 从Engine的规则中获取音频视觉设置
              try {
                const rulesIni = Engine.getIni('rules.ini');
                const audioVisualSection = rulesIni.getSection('AudioVisual');
                if (audioVisualSection) {
                  return audioVisualSection.getString(key);
                }
              } catch (error) {
                console.warn(`[Gui] Failed to get AudioVisual setting for key "${key}":`, error);
              }
              return undefined;
            }
          }
        };
        
        // 创建AudioSystem适配器用于Sound类
        const soundAudioSystemAdapter = {
          initialize: () => this.audioSystem!.initialize(),
          dispose: () => this.audioSystem!.dispose(),
          playWavFile: (file: any, channel: ChannelType, volume?: number, pan?: number, delay?: number, rate?: number, loop?: boolean) => {
            return this.audioSystem!.playWavFile(file, channel, volume, pan, delay, rate, loop);
          },
          playWavSequence: (files: any[], channel: ChannelType, volume?: number, pan?: number, delay?: number, rate?: number) => {
            return this.audioSystem!.playWavSequence(files, channel, volume, pan, delay, rate);
          },
          playWavLoop: (files: any[], channel: ChannelType, volume?: number, pan?: number, delay?: number, rate?: number, attack?: boolean, decay?: boolean, loops?: number) => {
            // 适配delay参数的差异
            const delayMs = delay ? { min: delay, max: delay } : undefined;
            return this.audioSystem!.playWavLoop(files, channel, volume, pan, delayMs, rate, attack, decay, loops);
          }
        };
        
        this.sound = new Sound(
          soundAudioSystemAdapter,
          Engine.getSounds(),
          soundSpecs,
          audioVisualRules,
          document
        );
        
        this.sound.initialize();
        console.log('[Gui] Sound system initialized');
      }

      // 初始化Music系统
      await this.initMusicSystem();
      
      console.log('[Gui] Audio system initialization completed');
      
    } catch (error) {
      console.error('[Gui] Failed to initialize audio system:', error);
      // 音频系统初始化失败不应该阻止应用程序启动
    }
  }

  private createDefaultMixer(): Mixer {
    const mixer = new Mixer();
    // 设置默认音量（匹配原始项目）
    mixer.setVolume(ChannelType.Master, 0.4);
    mixer.setVolume(ChannelType.CreditTicks, 0.2);
    mixer.setVolume(ChannelType.Music, 0.3);
    mixer.setVolume(ChannelType.Ambient, 0.3);
    mixer.setVolume(ChannelType.Effect, 0.5);
    mixer.setVolume(ChannelType.Voice, 0.7);
    mixer.setVolume(ChannelType.Ui, 0.5);
    console.log('[Gui] Created default mixer settings');
    return mixer;
  }

  private async initMusicSystem(): Promise<void> {
    if (!this.audioSystem || !Engine.vfs) {
      console.warn('[Gui] Cannot initialize music system - missing dependencies');
      return;
    }

    try {
      // 检查是否有音乐目录
      let hasMusicDir = false;
      try {
        hasMusicDir = !!(await Engine.rfs?.containsEntry(Engine.rfsSettings.musicDir));
      } catch (error) {
        console.warn('Could not check music directory:', error);
        hasMusicDir = false;
      }

      if (hasMusicDir) {
        // 加载音乐配置
        const themeIniFileName = Engine.getFileNameVariant('theme.ini');
        const themeIni = Engine.getIni(themeIniFileName);
        const musicSpecs = new MusicSpecs(themeIni);
        
        // 创建AudioSystem适配器用于Music类
        const musicAudioSystemAdapter = {
          playMusicFile: async (file: any, repeat: boolean, onEnded?: () => void): Promise<boolean> => {
            try {
              await this.audioSystem!.playMusicFile(file, repeat, onEnded);
              return true;
            } catch (error) {
              console.error('Failed to play music file:', error);
              return false;
            }
          },
          stopMusic: () => this.audioSystem!.stopMusic()
        };
        
        // 创建Music实例
        this.music = new Music(
          musicAudioSystemAdapter,
          Engine.getThemes(),
          musicSpecs
        );

        // 加载音乐选项
        const musicOptions = this.localPrefs.getItem(StorageKey.MusicOpts);
        if (musicOptions) {
          try {
            this.music.unserializeOptions(musicOptions);
            console.log('[Gui] Loaded music options from local storage');
          } catch (error) {
            console.warn('Failed to read music options from local storage', error);
          }
        }

        console.log('[Gui] Music system initialized');
      } else {
        console.warn('[Gui] No music directory found - music system disabled');
      }
    } catch (error) {
      console.error('[Gui] Failed to initialize music system:', error);
    }
  }


} 