import { ToggleAllianceAction } from '../ToggleAllianceAction';
import { Game } from '../../Game';
export class ToggleAllianceActionFactory {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }
    create(): ToggleAllianceAction {
        return new ToggleAllianceAction(this.game);
    }
}
