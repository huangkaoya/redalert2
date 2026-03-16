import { Animation, AnimationState } from '../Animation';

export class SimpleRunner {
  animation?: Animation;
  
  constructor() {}

  tick(time: number): void {
    const animation = this.animation;
    if (animation) {
      switch (animation.getState()) {
        case AnimationState.STOPPED:
          return;
        case AnimationState.NOT_STARTED:
          animation.start(time);
          animation.update(time);
          return;
        case AnimationState.RUNNING:
        default:
          animation.update(time);
          return;
      }
    }
  }

  getCurrentFrame(): number {
    return this.animation?.getCurrentFrame() ?? 0;
  }

  shouldUpdate(): boolean {
    return this.animation?.getState() !== AnimationState.STOPPED;
  }

  // Keep additional methods for compatibility
  setAnimation(animation: Animation): void {
    this.animation = animation;
  }

  start(time: number, delayFrames?: number): void {
    if (this.animation) {
      this.animation.start(time, delayFrames);
    }
  }

  stop(): void {
    if (this.animation) {
      this.animation.stop();
    }
  }

  update(time: number): void {
    if (this.animation) {
      this.animation.update(time);
    }
  }

  isStopped(): boolean {
    return this.animation?.getState() === AnimationState.STOPPED;
  }

  getState(): AnimationState | undefined {
    return this.animation?.getState();
  }
} 
