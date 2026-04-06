import { BoxedVar } from './util/BoxedVar';
export class ConsoleVars {
    public readonly debugWireframes: BoxedVar<boolean>;
    public readonly debugPaths: BoxedVar<boolean>;
    public readonly debugText: BoxedVar<boolean>;
    public readonly debugBotIndex: BoxedVar<number>;
    public readonly debugLogging: BoxedVar<boolean>;
    public readonly debugGameState: BoxedVar<boolean>;
    public readonly forceResolution: BoxedVar<string | undefined>;
    public readonly freeCamera: BoxedVar<boolean>;
    public readonly fps: BoxedVar<boolean>;
    public readonly persistentHoverTags: BoxedVar<boolean>;
    public readonly cheatsEnabled: BoxedVar<boolean>;
    public readonly fullScreenZoomOut: BoxedVar<number>;
    public perfRaycastHelperReuse?: BoxedVar<boolean>;
    public perfEntityIntersectTraversal?: BoxedVar<boolean>;
    public perfMapTileHitTest?: BoxedVar<boolean>;
    public perfWorldViewportCache?: BoxedVar<boolean>;
    public perfWorldSoundLoopCache?: BoxedVar<boolean>;
    public perfTelemetry?: BoxedVar<boolean>;
    constructor() {
        this.debugWireframes = new BoxedVar<boolean>(false);
        this.debugPaths = new BoxedVar<boolean>(false);
        this.debugText = new BoxedVar<boolean>(false);
        this.debugBotIndex = new BoxedVar<number>(0);
        this.debugLogging = new BoxedVar<boolean>(false);
        this.debugGameState = new BoxedVar<boolean>(false);
        this.forceResolution = new BoxedVar<string | undefined>(undefined);
        this.freeCamera = new BoxedVar<boolean>(false);
        this.fps = new BoxedVar<boolean>(false);
        this.persistentHoverTags = new BoxedVar<boolean>(false);
        this.cheatsEnabled = new BoxedVar<boolean>(false);
        this.fullScreenZoomOut = new BoxedVar<number>(1.3);
    }
}
