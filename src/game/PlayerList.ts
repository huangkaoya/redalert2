import { Player } from './Player';
export class PlayerList {
    private players: Player[] = [];
    addPlayer(player: Player): void {
        this.players.push(player);
    }
    getPlayerAt(index: number): Player {
        if (index >= this.players.length) {
            throw new RangeError(`Player #${index} out of bounds`);
        }
        return this.players[index];
    }
    getPlayerByName(name: string): Player {
        const player = this.players.find(p => p.name === name);
        if (!player) {
            throw new Error(`Player with name "${name}" not found`);
        }
        return player;
    }
    getPlayerNumber(player: Player): number {
        const index = this.players.indexOf(player);
        if (index === -1) {
            throw new Error(`Player ${player.name} not found`);
        }
        return index;
    }
    getCombatants(): Player[] {
        return this.players.filter(p => p.isCombatant());
    }
    getNonNeutral(): Player[] {
        return this.players.filter(p => !p.isNeutral);
    }
    getCivilian(): Player | undefined {
        return this.players.find(p => p.country?.side === 'Civilian');
    }
    getAll(): Player[] {
        return this.players;
    }
}
