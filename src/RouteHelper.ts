import { Base64 } from '@/util/Base64';
interface GameParams {
    gameId: string;
    gameTimestamp: number;
    gservUrl: string;
    playerName: string;
    gameOpts: any;
    tournament?: any;
}
export class RouteHelper {
    static modQueryStringName = "mod";
    static getGameRoute(params: GameParams): string {
        return ("#/game/" +
            Base64.encode(JSON.stringify({
                gameId: params.gameId,
                gameTimestamp: params.gameTimestamp,
                gservUrl: params.gservUrl,
                playerName: params.playerName,
                gameOpts: params.gameOpts,
                tournament: params.tournament,
            })));
    }
    static extractGameParams(encodedParams: string): GameParams {
        return JSON.parse(Base64.decode(encodedParams));
    }
}
