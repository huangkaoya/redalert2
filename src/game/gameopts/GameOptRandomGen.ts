import { Vector2 } from "@/game/math/Vector2";
import { Prng } from "@/game/Prng";
import { mpAllowedColors } from "@/game/rules/mpAllowedColors";
import { isNotNullOrUndefined } from "@/util/typeGuard";
import { RANDOM_COLOR_ID, RANDOM_COUNTRY_ID, RANDOM_START_POS, OBS_COUNTRY_ID } from "@/game/gameopts/constants";
export class GameOptRandomGen {
    private prng: Prng;
    static factory(seed: string | number, sequence: number): GameOptRandomGen {
        return new GameOptRandomGen(Prng.factory(seed, sequence));
    }
    constructor(prng: Prng) {
        this.prng = prng;
    }
    generateColors(players: {
        humanPlayers: any[];
        aiPlayers: any[];
    }): Map<any, number> {
        const allPlayers = [...players.humanPlayers, ...players.aiPlayers].filter(isNotNullOrUndefined);
        const usedColors = allPlayers
            .map(player => player.colorId)
            .filter(colorId => colorId !== RANDOM_COLOR_ID);
        const totalColors = mpAllowedColors.length;
        const availableColors = new Array(totalColors)
            .fill(0)
            .map((_, index) => index)
            .filter(colorId => !usedColors.includes(colorId));
        const colorMap = new Map();
        allPlayers.forEach(player => {
            if (player.countryId !== OBS_COUNTRY_ID && player.colorId === RANDOM_COLOR_ID) {
                if (availableColors.length < 1) {
                    throw new Error("Out of available colors to choose from");
                }
                const randomIndex = this.prng.generateRandomInt(0, availableColors.length - 1);
                colorMap.set(player, availableColors[randomIndex]);
                availableColors.splice(randomIndex, 1);
            }
        });
        return colorMap;
    }
    generateCountries(players: {
        humanPlayers: any[];
        aiPlayers: any[];
    }, rules: any): Map<any, number> {
        const countryCount = rules.getMultiplayerCountries().length;
        const allPlayers = [...players.humanPlayers, ...players.aiPlayers].filter(isNotNullOrUndefined);
        const countryMap = new Map();
        allPlayers.forEach(player => {
            if (player.countryId === RANDOM_COUNTRY_ID) {
                countryMap.set(player, this.prng.generateRandomInt(0, countryCount - 1));
            }
        });
        return countryMap;
    }
    generateStartLocations(players: {
        humanPlayers: any[];
        aiPlayers: any[];
    }, locations: Map<number, {
        x: number;
        y: number;
    }>): Map<any, number> {
        const allPlayers = [...players.humanPlayers, ...players.aiPlayers].filter(isNotNullOrUndefined);
        const fixedPositions = allPlayers
            .filter(player => player.startPos !== RANDOM_START_POS)
            .map(player => player.startPos);
        const availablePositions = [...locations.keys()].filter(pos => !fixedPositions.includes(pos));
        const shuffledPositions: number[] = [];
        while (availablePositions.length) {
            const randomIndex = availablePositions.length ?
                this.prng.generateRandomInt(0, availablePositions.length - 1) : 0;
            shuffledPositions.push(...availablePositions.splice(randomIndex, 1));
        }
        shuffledPositions.unshift(...fixedPositions);
        if (shuffledPositions.length >= 3) {
            for (const offset of [1, 2]) {
                if (!(fixedPositions.length - 1 >= offset)) {
                    const positions = shuffledPositions.map(pos => locations[pos]);
                    const farthestPoint = this.findFarthestPointFrom(positions.slice(0, offset), positions.slice(offset));
                    const index = positions.findIndex(pos => pos.x === farthestPoint.x && pos.y === farthestPoint.y);
                    shuffledPositions.splice(offset, 0, ...shuffledPositions.splice(index, 1));
                }
            }
        }
        if (shuffledPositions.length >= 4 && fixedPositions.length - 1 < 3) {
            const positions = shuffledPositions.map(pos => locations[pos]);
            const farthestPoint = this.findFarthestPointFrom(positions.slice(2, 3), positions.slice(3));
            const index = positions.findIndex(pos => pos.x === farthestPoint.x && pos.y === farthestPoint.y);
            shuffledPositions.splice(3, 0, ...shuffledPositions.splice(index, 1));
        }
        shuffledPositions.splice(0, fixedPositions.length);
        const locationMap = new Map();
        let currentIndex = -1;
        allPlayers.forEach(player => {
            if (player.countryId !== OBS_COUNTRY_ID && player.startPos === RANDOM_START_POS) {
                if (currentIndex >= shuffledPositions.length - 1) {
                    throw new RangeError("Map has fewer starting locations than players");
                }
                locationMap.set(player, shuffledPositions[++currentIndex]);
            }
        });
        return locationMap;
    }
    private findFarthestPointFrom(points: {
        x: number;
        y: number;
    }[], searchPoints: {
        x: number;
        y: number;
    }[]): {
        x: number;
        y: number;
    } {
        const vectors = points.map(point => new Vector2(point.x, point.y));
        let farthestPoint: {
            x: number;
            y: number;
        } | undefined;
        let maxDistance = 0;
        if (!searchPoints.length) {
            throw new Error("Search array must have at least one element");
        }
        for (const point of searchPoints) {
            const vector = new Vector2(point.x, point.y);
            const totalDistance = vectors.reduce((sum, vec) => sum + vector.distanceTo(vec), 0);
            if (totalDistance >= maxDistance) {
                farthestPoint = point;
                maxDistance = totalDistance;
            }
        }
        return farthestPoint!;
    }
}
