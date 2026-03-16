import { MenuSlotAnimationRunner, AnimationType } from './MenuSlotAnimationRunner';
import { AnimationState } from '@/engine/Animation';
export class MenuSdTopAnimRunner extends MenuSlotAnimationRunner {
    getCurrentFrame(): number {
        if (this.currentAnimationType === AnimationType.None ||
            this.animation!.getState() === AnimationState.DELAYED) {
            return this.collapsed ? 5 : 0;
        }
        else {
            const direction = this.currentAnimationType === AnimationType.SlideIn ? -1 : 1;
            let baseFrame = 0;
            if (direction === -1) {
                baseFrame += 5;
            }
            return baseFrame + direction * this.animation!.getCurrentFrame();
        }
    }
}
