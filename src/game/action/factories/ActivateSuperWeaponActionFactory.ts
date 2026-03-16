import { ActivateSuperWeaponAction } from '../ActivateSuperWeaponAction';
import { Game } from '@/game/Game';
export class ActivateSuperWeaponActionFactory {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }
    create(): ActivateSuperWeaponAction {
        return new ActivateSuperWeaponAction(this.game);
    }
}
