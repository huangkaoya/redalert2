import MersenneTwister from "mersenne-twister";
import { Crc32 } from "@/data/Crc32";
import { binaryStringToUint8Array } from "@/util/string";
export class Prng {
    private prng: MersenneTwister;
    private lastRandom: number;
    static factory(seed: number | string, sequence: number): Prng {
        const numericSeed = Number.isNaN(Number(seed))
            ? Crc32.calculateCrc(binaryStringToUint8Array(seed as string))
            : Number(seed + "" + sequence);
        return new Prng(numericSeed);
    }
    constructor(seed: number) {
        this.prng = new MersenneTwister(seed);
    }
    generateRandomInt(min: number, max: number): number {
        const random = this.prng.random();
        this.lastRandom = random;
        return Math.floor(random * (max - min + 1)) + min;
    }
    generateRandom(): number {
        const random = this.prng.random();
        this.lastRandom = random;
        return random;
    }
    getLastRandom(): number {
        return this.lastRandom;
    }
}
