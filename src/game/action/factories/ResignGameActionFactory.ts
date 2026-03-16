import { ResignGameAction } from '../ResignGameAction';
import { Game } from '@/game/Game';
export class ResignGameActionFactory {
    private game: Game;
    private localPlayerName: string;
    constructor(game: Game, localPlayerName: string) {
        this.game = game;
        this.localPlayerName = localPlayerName;
    }
    create(): ResignGameAction {
        return new ResignGameAction(this.game, this.localPlayerName);
    }
}
