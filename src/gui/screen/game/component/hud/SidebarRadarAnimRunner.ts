import { IniSection } from "@/data/IniSection";
import { Animation, AnimationState } from "@/engine/Animation";
import { AnimProps } from "@/engine/AnimProps";
import { Engine } from "@/engine/Engine";
import { BoxedVar } from "@/util/BoxedVar";
export enum AnimationType {
    None = 0,
    RadarOff = 1,
    RadarOn = 2
}
export class SidebarRadarAnimationRunner {
    shpFile: any;
    closed: boolean;
    currentAnimationType: AnimationType;
    animation?: Animation;
    constructor(shpFile: any) {
        this.shpFile = shpFile;
        this.closed = true;
        this.currentAnimationType = AnimationType.None;
    }
    radarOff(skipInit: boolean = false) {
        this.currentAnimationType = AnimationType.RadarOff;
        if (!skipInit) {
            this.initAnimation();
        }
    }
    radarOn(skipInit: boolean = false) {
        this.currentAnimationType = AnimationType.RadarOn;
        if (!skipInit) {
            this.initAnimation();
        }
    }
    initAnimation() {
        const ini = new IniSection("");
        const props = new AnimProps(ini, this.shpFile);
        const anim = new Animation(props, new BoxedVar(Engine.UI_ANIM_SPEED));
        this.animation = anim;
    }
    tick(now: number) {
        const anim = this.animation;
        const type = this.currentAnimationType;
        if (anim && type !== AnimationType.None) {
            switch (anim.getState()) {
                case AnimationState.STOPPED:
                    break;
                case AnimationState.NOT_STARTED:
                    anim.start(now);
                case AnimationState.RUNNING:
                default:
                    anim.update(now);
            }
            if (anim.getState() === AnimationState.STOPPED) {
                this.closed = type === AnimationType.RadarOff;
                this.currentAnimationType = AnimationType.None;
            }
        }
    }
    shouldUpdate(): boolean {
        return true;
    }
    isStopped(): boolean {
        return this.currentAnimationType === AnimationType.None;
    }
    getCurrentFrame(): number {
        if (!this.animation) {
            return this.currentAnimationType === AnimationType.RadarOn
                ? this.shpFile.numImages - 1
                : 0;
        }
        let dir = this.currentAnimationType === AnimationType.RadarOff ? -1 : 1;
        if (this.currentAnimationType === AnimationType.None && this.closed) {
            dir *= -1;
        }
        let base = 0;
        if (dir === -1) {
            base = this.animation.props.end;
        }
        return base + dir * this.animation.getCurrentFrame();
    }
}
