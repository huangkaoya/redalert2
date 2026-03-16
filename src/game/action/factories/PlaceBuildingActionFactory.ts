import { PlaceBuildingAction } from '../PlaceBuildingAction';
import { Game } from '@/game/Game';
export class PlaceBuildingActionFactory {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }
    create(): PlaceBuildingAction {
        return new PlaceBuildingAction(this.game);
    }
}
