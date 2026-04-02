import { IniSection } from '../../../../data/IniSection';
import { ShpFile } from '../../../../data/ShpFile';
import { Animation, AnimationState } from '../../../../engine/Animation';
import { AnimProps } from '../../../../engine/AnimProps';
import { Engine } from '../../../../engine/Engine';
import { BoxedVar } from '../../../../util/BoxedVar';
export enum AnimationType {
    None = 0,
    SlideIn = 1,
    SlideOut = 2
}
export enum MenuButtonState {
    Hidden = 0,
    Unlit = 1,
    Normal = 2,
    Active = 3
}
export class MenuSlotAnimationRunner {
    protected delayFrames: number;
    protected buttonState: MenuButtonState = MenuButtonState.Hidden;
    protected collapsed: boolean = true;
    protected currentAnimationType: AnimationType = AnimationType.None;
    protected animation?: Animation;
    constructor(delayFrames: number = 0) {
        this.delayFrames = delayFrames;
    }
    slideIn(): void {
        this.currentAnimationType = AnimationType.SlideIn;
        this.initAnimation();
    }
    slideOut(): void {
        this.currentAnimationType = AnimationType.SlideOut;
        this.initAnimation();
    }
    private initAnimation(): void {
        const iniSection = new IniSection("");
        let animProps = new AnimProps(iniSection, new ShpFile());
        animProps.loopEnd = 5;
        const animation = new Animation(animProps, new BoxedVar(Engine.UI_ANIM_SPEED));
        this.animation = animation;
    }
    tick(time: number): void {
        let animation = this.animation;
        const animationType = this.currentAnimationType;
        if (animation && animationType !== AnimationType.None) {
            switch (animation.getState()) {
                case AnimationState.STOPPED:
                    break;
                case AnimationState.NOT_STARTED:
                    animation.start(time, this.delayFrames);
                // falls through
                case AnimationState.RUNNING:
                default:
                    animation.update(time);
            }
            if (animation.getState() === AnimationState.STOPPED) {
                this.collapsed = animationType === AnimationType.SlideOut;
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
        if (this.currentAnimationType !== AnimationType.None &&
            this.animation!.getState() !== AnimationState.DELAYED) {
            const direction = this.currentAnimationType === AnimationType.SlideIn ? -1 : 1;
            let baseFrame = this.buttonState !== MenuButtonState.Hidden ? 5 : 11;
            if (direction === -1) {
                baseFrame += 5;
            }
            return baseFrame + direction * this.animation!.getCurrentFrame();
        }
        let frame: number;
        if (this.collapsed) {
            frame = this.buttonState === MenuButtonState.Hidden ? 16 : 10;
        }
        else if (this.buttonState === MenuButtonState.Hidden) {
            frame = 0;
        }
        else if (this.buttonState === MenuButtonState.Unlit) {
            frame = 1;
        }
        else if (this.buttonState === MenuButtonState.Normal) {
            frame = 2;
        }
        else if (this.buttonState === MenuButtonState.Active) {
            frame = 4;
        }
        else {
            throw new Error(`Unknown buttonState "${this.buttonState}"`);
        }
        return frame;
    }
}
