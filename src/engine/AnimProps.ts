import { IniSection } from '../data/IniSection';
import { ShpFile } from '../data/ShpFile';
import { GameSpeed } from '../game/GameSpeed';
import { getRandomInt } from '../util/math';
export class AnimProps {
    static defaultRate = GameSpeed.BASE_TICKS_PER_SECOND;
    public shadow: boolean;
    public reverse: boolean;
    public frameCount: number;
    public end: number;
    public rate: number;
    public start: number;
    public loopStart: number;
    public loopEnd: number;
    public loopCount: number;
    public randomLoopDelay?: [
        number,
        number
    ];
    constructor(public art: IniSection, frameCountOrShpFile: number | ShpFile) {
        this.init(frameCountOrShpFile);
    }
    private init(frameCountOrShpFile: number | ShpFile): void {
        this.shadow = this.art.getBool("Shadow");
        this.reverse = this.art.getBool("Reverse");
        this.frameCount = typeof frameCountOrShpFile === "number"
            ? frameCountOrShpFile
            : this.shadow
                ? frameCountOrShpFile.numImages / 2
                : frameCountOrShpFile.numImages;
        this.end = this.art.getNumber("End", this.frameCount - 1);
        const randomRateArray = this.art.getNumberArray("RandomRate").sort();
        if (randomRateArray.length === 2) {
            this.rate = getRandomInt(randomRateArray[0], randomRateArray[1]) / 60;
        }
        else {
            this.rate = this.art.getNumber("Rate", 60 * AnimProps.defaultRate) / 60;
        }
        this.start = this.art.getNumber("Start", 0);
        this.loopStart = this.art.getNumber("LoopStart", 0);
        this.loopEnd = Math.max(this.loopStart, this.art.getNumber("LoopEnd", this.end + 1) - 1);
        this.loopCount = this.art.getNumber("LoopCount", 1);
        const randomLoopDelayArray = this.art.getNumberArray("RandomLoopDelay").sort();
        this.randomLoopDelay = randomLoopDelayArray.length === 2
            ? [randomLoopDelayArray[0], randomLoopDelayArray[1]]
            : undefined;
    }
    getArt(): IniSection {
        return this.art;
    }
    setArt(art: IniSection): void {
        this.art = art;
        this.init(this.frameCount);
    }
}
