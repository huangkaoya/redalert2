import { ModelQuality } from "@/engine/renderable/entity/unit/ModelQuality";
import { isNotNullOrUndefined } from "@/util/typeGuard";
import { VxlGeometryMonotoneBuilder } from "@/engine/renderable/builder/vxlGeometry/VxlGeometryMonotoneBuilder";
export class VxlGeometryPool {
    cache: any;
    modelQuality: ModelQuality;
    constructor(cache, modelQuality = ModelQuality.High) {
        this.cache = cache;
        this.modelQuality = modelQuality;
    }
    setModelQuality(modelQuality) {
        this.modelQuality = modelQuality;
    }
    getModelQuality() {
        return this.modelQuality;
    }
    async loadFromStorage(data, param) {
        let results = await Promise.all(data.sections.map((section) => this.cache.loadFromStorage(section, param)));
        return results.every(isNotNullOrUndefined);
    }
    async persistToStorage(data, param, results) {
        for (let i = 0; i < data.sections.length; i++) {
            const section = data.sections[i];
            await this.cache.persistToStorage(section, param, results[i]);
        }
    }
    clear() {
        this.cache.clear();
    }
    async clearStorage() {
        await this.cache.clearStorage();
    }
    async clearOtherModStorage() {
        await this.cache.clearOtherModStorage();
    }
    get(key) {
        let geometry = this.cache.get(key);
        if (!geometry) {
            geometry = new VxlGeometryMonotoneBuilder().build(key);
            this.cache.set(key, geometry);
        }
        return geometry;
    }
}
