import { CenterBaseCmd } from './CenterBaseCmd';
export class SelectPlayerCmd {
    private playerNum: number;
    private player: any;
    private mapPanningHelper: any;
    private cameraPan: any;
    private game: any;
    private lastSelectTime?: number;
    constructor(playerNum: number, player: any, mapPanningHelper: any, cameraPan: any, game: any) {
        this.playerNum = playerNum;
        this.player = player;
        this.mapPanningHelper = mapPanningHelper;
        this.cameraPan = cameraPan;
        this.game = game;
    }
    execute(): void {
        const now = performance.now();
        let shouldCenter = true;
        if (!this.lastSelectTime || now - this.lastSelectTime > 400) {
            shouldCenter = false;
            this.lastSelectTime = now;
        }
        let selectedPlayer: any = undefined;
        const combatants = this.game.getCombatants();
        if (this.playerNum < combatants.length) {
            selectedPlayer = combatants[this.playerNum];
        }
        if (selectedPlayer &&
            (this.player.value === selectedPlayer ||
                (shouldCenter && !this.player.value))) {
            if (shouldCenter) {
                const centerBaseCmd = new CenterBaseCmd(selectedPlayer, this.game.rules, this.mapPanningHelper, this.cameraPan);
                centerBaseCmd.execute();
            }
            else {
                selectedPlayer = undefined;
            }
        }
        this.player.value = selectedPlayer;
    }
}
