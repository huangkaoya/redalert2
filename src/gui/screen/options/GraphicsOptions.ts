import { ModelQuality } from "@/engine/renderable/entity/unit/ModelQuality";
import { ShadowQuality } from "@/engine/renderable/entity/unit/ShadowQuality";
import { BoxedVar } from "@/util/BoxedVar";
interface Resolution {
    width: number;
    height: number;
}
export class GraphicsOptions {
    resolution: BoxedVar<Resolution | undefined>;
    models: BoxedVar<ModelQuality>;
    shadows: BoxedVar<ShadowQuality>;
    constructor() {
        this.resolution = new BoxedVar<Resolution | undefined>(undefined);
        this.models = new BoxedVar(ModelQuality.High);
        this.shadows = new BoxedVar(ShadowQuality.High);
    }
    unserialize(data: string): this {
        const [t, i, r] = data.split(",");
        this.models.value = Number(t) as ModelQuality;
        this.shadows.value = Number(i) as ShadowQuality;
        if (r !== undefined) {
            const s = r.length ? r.split("x").map((e) => Number(e)) : undefined;
            this.resolution.value = s ? { width: s[0], height: s[1] } : undefined;
        }
        return this;
    }
    serialize(): string {
        return [
            this.models.value,
            this.shadows.value,
            this.resolution.value
                ? [this.resolution.value.width, this.resolution.value.height].join("x")
                : "",
        ].join(",");
    }
    applyLowPreset(): void {
        this.models.value = ModelQuality.Low;
        this.shadows.value = ShadowQuality.Low;
    }
    applyHighPreset(): void {
        this.models.value = ModelQuality.High;
        this.shadows.value = ShadowQuality.High;
    }
}
