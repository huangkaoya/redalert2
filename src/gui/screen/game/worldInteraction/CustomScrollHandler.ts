export class CustomScrollHandler {
  private isPaused = false;

  constructor(private readonly mapScrollHandler: any) {}

  requestScroll(direction: any): void {
    if (!this.isPaused) {
      this.mapScrollHandler.requestForceScroll(direction);
    }
  }

  cancel(): void {
    this.mapScrollHandler.cancelForceScroll();
  }

  pause(): void {
    this.isPaused = true;
  }

  unpause(): void {
    this.isPaused = false;
  }
}
