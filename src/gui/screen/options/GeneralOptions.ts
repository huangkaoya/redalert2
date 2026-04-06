import { FlyerHelperMode } from "@/engine/renderable/entity/unit/FlyerHelperMode";
import { Base64 } from "@/util/Base64";
import { BoxedVar } from "@/util/BoxedVar";
import { GraphicsOptions } from "@/gui/screen/options/GraphicsOptions";
import { PerformanceOptions } from "@/performance/PerformanceOptions";
export const SCROLL_BASE_FACTOR = 3;
export class GeneralOptions {
    scrollRate: BoxedVar<number>;
    flyerHelper: BoxedVar<FlyerHelperMode>;
    hiddenObjects: BoxedVar<boolean>;
    targetLines: BoxedVar<boolean>;
    rightClickMove: BoxedVar<boolean>;
    rightClickScroll: BoxedVar<boolean>;
    mouseAcceleration: BoxedVar<boolean>;
    graphics: GraphicsOptions;
    performance: PerformanceOptions;
    constructor() {
        this.scrollRate = new BoxedVar(12);
        this.flyerHelper = new BoxedVar(FlyerHelperMode.Selected);
        this.hiddenObjects = new BoxedVar(true);
        this.targetLines = new BoxedVar(true);
        this.rightClickMove = new BoxedVar(false);
        this.rightClickScroll = new BoxedVar(true);
        this.mouseAcceleration = new BoxedVar(true);
        this.graphics = new GraphicsOptions();
        this.performance = new PerformanceOptions();
    }
    unserialize(data: string): this {
        const [t, i, r, s, a, n, o, l, p] = data.split(",");
        this.scrollRate.value = Number(t);
        if (i !== undefined) {
            this.flyerHelper.value = Number(i) as FlyerHelperMode;
        }
        if (r !== undefined) {
            this.graphics.unserialize(Base64.decode(r));
        }
        if (s !== undefined) {
            this.hiddenObjects.value = Boolean(Number(s));
        }
        if (a !== undefined) {
            this.rightClickMove.value = Boolean(Number(a));
        }
        if (n !== undefined) {
            this.rightClickScroll.value = Boolean(Number(n));
        }
        if (o !== undefined) {
            this.targetLines.value = Boolean(Number(o));
        }
        if (l !== undefined) {
            this.mouseAcceleration.value = Boolean(Number(l));
        }
        this.performance.unserialize(p);
        return this;
    }
    serialize(): string {
        return [
            this.scrollRate.value,
            this.flyerHelper.value,
            Base64.encode(this.graphics.serialize()),
            Number(this.hiddenObjects.value),
            Number(this.rightClickMove.value),
            Number(this.rightClickScroll.value),
            Number(this.targetLines.value),
            Number(this.mouseAcceleration.value),
            this.performance.serialize(),
        ].join(",");
    }
}
