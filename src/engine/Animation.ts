import { AnimProps } from './AnimProps';
import { BoxedVar } from '../util/BoxedVar';
import { getRandomInt } from '../util/math';
export enum AnimationState {
    NOT_STARTED = 0,
    RUNNING = 1,
    STOPPED = 2,
    DELAYED = 3,
    PAUSED = 4
}
export class Animation {
    private state: AnimationState = AnimationState.NOT_STARTED;
    private frameNo: number = 0;
    private time: number = 0;
    private loopNo: number = 0;
    private delayFrames: number = 0;
    private endLoopFlag: boolean = false;
    private playToEndFlag: boolean = false;
    constructor(public props: AnimProps, public speed: BoxedVar<number>) { }
    getState(): AnimationState {
        return this.state;
    }
    start(time: number, delayFrames: number = 0): void {
        this.time = time;
        this.frameNo = this.props.reverse ? this.props.end : this.props.start;
        this.loopNo = 0;
        this.delayFrames = delayFrames;
        this.state = delayFrames ? AnimationState.DELAYED : AnimationState.RUNNING;
    }
    pause(): void {
        if (this.state === AnimationState.RUNNING) {
            this.state = AnimationState.PAUSED;
        }
    }
    unpause(): void {
        if (this.state === AnimationState.PAUSED) {
            this.state = AnimationState.RUNNING;
        }
    }
    reset(): void {
        this.state = AnimationState.NOT_STARTED;
    }
    stop(): void {
        this.state = AnimationState.STOPPED;
    }
    update(time: number): void {
        const deltaTime = (time - this.time) / 1000;
        const rate = this.props.rate * this.speed.value;
        const framesToAdvance = Math.floor(deltaTime * rate);
        if (framesToAdvance < 1)
            return;
        this.time = time;
        if (this.state === AnimationState.PAUSED)
            return;
        if (this.delayFrames > 0) {
            this.delayFrames = Math.max(0, this.delayFrames - framesToAdvance);
            if (this.delayFrames > 0) {
                this.state = AnimationState.DELAYED;
                return;
            }
            this.state = AnimationState.RUNNING;
        }
        if (this.computeNextFrame(framesToAdvance)) {
            this.state = AnimationState.STOPPED;
        }
    }
    endLoop(): void {
        this.endLoopFlag = true;
    }
    endLoopAndPlayToEnd(): void {
        this.endLoopFlag = true;
        this.playToEndFlag = true;
    }
    rewind(): void {
        if (this.props.reverse) {
            this.frameNo = this.loopNo ? this.props.loopEnd : this.props.end;
        }
        else {
            this.frameNo = this.loopNo ? this.props.loopStart : this.props.start;
        }
    }
    getCurrentFrame(): number {
        return this.frameNo;
    }
    private computeNextFrame(framesToAdvance: number): boolean {
        let currentFrame = this.frameNo;
        while (framesToAdvance > 0) {
            const targetFrame = this.endLoopFlag && this.playToEndFlag
                ? (this.props.reverse ? this.props.start : this.props.end)
                : (this.props.reverse ? this.props.loopStart : this.props.loopEnd);
            if ((!this.props.reverse && currentFrame + framesToAdvance <= targetFrame) ||
                (this.props.reverse && currentFrame - framesToAdvance >= targetFrame)) {
                currentFrame += this.props.reverse ? -framesToAdvance : framesToAdvance;
                break;
            }
            if (this.props.loopCount !== -1 && this.loopNo >= this.props.loopCount - 1) {
                this.frameNo = targetFrame;
                return true;
            }
            if (this.endLoopFlag) {
                this.endLoopFlag = false;
                return false;
            }
            framesToAdvance -= 1 + (this.props.reverse ? currentFrame - targetFrame : targetFrame - currentFrame);
            currentFrame = this.props.reverse ? this.props.loopEnd : this.props.loopStart;
            this.loopNo++;
            if (this.props.randomLoopDelay) {
                this.state = AnimationState.DELAYED;
                this.delayFrames = getRandomInt(this.props.randomLoopDelay[0], this.props.randomLoopDelay[1]);
            }
        }
        this.frameNo = currentFrame;
        return false;
    }
}
