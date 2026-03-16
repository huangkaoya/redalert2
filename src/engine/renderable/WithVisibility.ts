export class WithVisibility {
    private visible: boolean = true;
    private target?: any;
    constructor() {
        this.visible = true;
    }
    setVisible(visible: boolean): void {
        this.visible = visible;
        this.updateVisibility();
    }
    isVisible(): boolean {
        return this.visible;
    }
    updateVisibility(): void {
        if (this.target) {
            const object = this.target.get3DObject();
            if (object) {
                object.visible = this.visible;
            }
        }
    }
    applyTo(target: any): void {
        this.target = target;
        this.updateVisibility();
    }
}
