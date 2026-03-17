import { jsx } from "@/gui/jsx/jsx";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { ScoreTable } from "@/gui/screen/mainMenu/score/ScoreTable";
import { SideType } from "@/game/SideType";
import { MusicType } from "@/engine/sound/Music";
import { MainMenuScreen } from "@/gui/screen/mainMenu/MainMenuScreen";
import { Task } from "@puzzl/core/lib/async/Task";
import { OperationCanceledError } from "@puzzl/core/lib/async/cancellation/OperationCanceledError";
import { sleep } from "@puzzl/core/lib/async/sleep";
interface Game {
    id: string;
}
interface Player {
    country?: {
        side: SideType;
    };
}
interface ScoreScreenParams {
    game: Game;
    localPlayer: Player;
    singlePlayer: boolean;
    tournament: boolean;
    returnTo: {
        screenType: any;
        params: any;
    };
}
interface GameReport {
    gameId: string;
}
interface WolService {
    getLastGameReport(): GameReport | undefined;
}
const sideAssets = new Map<SideType, {
    img: string;
    pal: string;
}>([
    [SideType.GDI, { img: "mpascrnl.shp", pal: "mpascrn.pal" }],
    [SideType.Nod, { img: "mpsscrnl.shp", pal: "mpsscrn.pal" }],
]);
export class ScoreScreen extends MainMenuScreen {
    private strings: any;
    private jsxRenderer: any;
    private wolService: WolService;
    private scoreTable?: any;
    private reportUpdateTask?: Task<void>;
    constructor(strings: any, jsxRenderer: any, wolService: WolService) {
        super();
        this.strings = strings;
        this.jsxRenderer = jsxRenderer;
        this.wolService = wolService;
        this.musicType = MusicType.Score;
    }
    async onEnter(params: ScoreScreenParams): Promise<void> {
        this.title = params.singlePlayer
            ? this.strings.get("GUI:SkirmishScore")
            : this.strings.get("GUI:MultiplayerScore");
        this.controller.toggleMainVideo(false);
        this.initView(params);
        if (!params.singlePlayer) {
            this.loadGameReport(params.game);
        }
    }
    private initView({ game, localPlayer, singlePlayer, tournament, returnTo, }: ScoreScreenParams): void {
        this.controller.setSidebarButtons([
            {
                label: this.strings.get("GUI:Continue"),
                tooltip: this.strings.get("STT:MPScoreButtonContinue"),
                isBottom: true,
                onClick: () => {
                    this.controller?.goToScreen(returnTo.screenType, returnTo.params);
                },
            },
        ]);
        this.controller.showSidebarButtons();
        const side = localPlayer.country?.side ?? SideType.GDI;
        const assets = sideAssets.get(side);
        if (!assets) {
            throw new Error("Unsupported sideType " + side);
        }
        const [component] = this.jsxRenderer.render(jsx("container", { width: "100%", height: "100%" }, jsx("sprite", { image: assets.img, palette: assets.pal }), jsx(HtmlView, {
            width: "100%",
            height: "100%",
            component: ScoreTable,
            innerRef: (ref: any) => (this.scoreTable = ref),
            props: {
                game: game,
                singlePlayer: singlePlayer,
                localPlayer: localPlayer,
                tournament: tournament,
                strings: this.strings,
            },
        })));
        this.controller.setMainComponent(component);
    }
    private loadGameReport(game: Game): void {
        this.reportUpdateTask?.cancel();
        const task = (this.reportUpdateTask = new Task(async (cancellationToken) => {
            while (true) {
                if (cancellationToken.isCancelled())
                    return;
                const report = this.wolService.getLastGameReport();
                if (report?.gameId === game.id) {
                    this.scoreTable.applyOptions((options: any) => {
                        options.gameReport = report;
                    });
                    return;
                }
                await sleep(1000, cancellationToken);
            }
        }));
        task.start().catch((error) => {
            if (!(error instanceof OperationCanceledError)) {
                console.error(error);
            }
        });
    }
    async onLeave(): Promise<void> {
        if (this.reportUpdateTask) {
            this.reportUpdateTask.cancel();
            this.reportUpdateTask = undefined;
        }
        await this.controller.hideSidebarButtons();
    }
    async onStack(): Promise<void> {
        await this.onLeave();
    }
    onUnstack(): void {
    }
}
