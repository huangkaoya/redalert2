import { Anim } from './Anim';
export class TransientAnim extends Anim {
    private container: any;
    constructor(e: any, t: any, i: any, r: any, s: any, a: any, n: any, o: any, l: any, c: any, h: any) {
        super(e, t, i, r, s, a, n, o, l, undefined, h);
        this.container = c;
    }
    update(e: number): void {
        if (this.isAnimNotStarted()) {
            const report = this.objectArt.report;
            if (report) {
                this.worldSound?.playEffect(report, this.getPosition());
            }
        }
        super.update(e);
        if (this.isAnimFinished()) {
            this.remove();
            this.dispose();
        }
    }
    remove(): void {
        this.container.remove(this);
    }
}
