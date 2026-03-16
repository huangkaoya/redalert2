import { DropPlayerAction } from '../DropPlayerAction';
import { Game } from '@/game/Game';
export class DropPlayerActionFactory {
    private game: Game;
    private localPlayerName: string;
    constructor(game: Game, localPlayerName: string) {
        this.game = game;
        this.localPlayerName = localPlayerName;
    }
    create(): DropPlayerAction {
        return new DropPlayerAction(this.game, this.localPlayerName);
    }
}
