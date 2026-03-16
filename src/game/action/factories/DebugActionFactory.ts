import { DebugAction } from '../DebugAction';
import { Game } from '@/game/Game';
export class DebugActionFactory {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }
    create(): DebugAction {
        return new DebugAction(this.game);
    }
}
