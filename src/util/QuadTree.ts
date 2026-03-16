import { Box2 } from '@/game/math/Box2';
import { Vector2 } from '@/game/math/Vector2';
interface QuadTreeConfig<T> {
    getKey: (item: T) => Vector2;
    maxDepth: number;
    splitThreshold: number;
    joinThreshold: number;
}
interface QuadTreeItem<T> {
    key: Vector2;
    value: T;
}
export class QuadTree<T> {
    private box: Box2;
    private config: QuadTreeConfig<T>;
    private parentMap: Map<T, QuadTree<T>>;
    private objects: QuadTreeItem<T>[];
    private regions?: QuadTree<T>[];
    private parent?: QuadTree<T>;
    constructor(box: Box2, config: QuadTreeConfig<T>) {
        this.box = box;
        this.config = config;
        this.parentMap = new Map();
        this.objects = [];
    }
    add(item: T, shouldUpdate: boolean = true): boolean {
        const key = this.config.getKey(item);
        if (this.box.containsPoint(key)) {
            if (!this.regions) {
                this.parentMap.get(item)?.remove(item);
                this.parentMap.set(item, this);
                this.objects.push({ key, value: item });
                if (shouldUpdate) {
                    this.update();
                }
                return true;
            }
            for (const region of this.regions) {
                if (region.add(item, shouldUpdate)) {
                    return true;
                }
            }
        }
        return false;
    }
    remove(item: T, shouldUpdate: boolean = true): void {
        const region = this.parentMap.get(item);
        if (region) {
            if (region === this) {
                this.parentMap.delete(item);
                const index = this.objects.findIndex(obj => obj.value === item);
                this.objects.splice(index, 1);
                if (shouldUpdate && this.parent) {
                    this.parent.update();
                }
            }
            else {
                region.remove(item, shouldUpdate);
            }
        }
    }
    updateObject(item: T): void {
        const region = this.parentMap.get(item);
        if (region) {
            const key = this.config.getKey(item);
            if (region.box.containsPoint(key)) {
                const obj = region.objects.find(obj => obj.value === item);
                if (obj) {
                    obj.key = key;
                }
            }
            else {
                region.remove(item, false);
                let parent = region.parent;
                while (parent && !parent.add(item, false)) {
                    parent = parent.parent;
                }
            }
        }
    }
    queryRange(range: Box2, result: T[] = []): T[] {
        if (this.box.intersectsBox(range)) {
            if (this.regions) {
                for (const region of this.regions) {
                    region.queryRange(range, result);
                }
            }
            else {
                for (const obj of this.objects) {
                    if (range.containsPoint(obj.key)) {
                        result.push(obj.value);
                    }
                }
            }
        }
        return result;
    }
    update(): number {
        let count = 0;
        if (this.regions) {
            for (const region of this.regions) {
                count += region.update();
            }
            if (count <= this.config.joinThreshold) {
                this.join();
            }
        }
        else {
            count = this.objects.length;
            if (count >= this.config.splitThreshold && this.split()) {
                this.update();
            }
        }
        return count;
    }
    private split(): boolean {
        if (this.regions || this.config.maxDepth <= 1) {
            return false;
        }
        const config = {
            getKey: this.config.getKey,
            joinThreshold: this.config.joinThreshold,
            splitThreshold: this.config.splitThreshold,
            maxDepth: this.config.maxDepth - 1,
        };
        const newRegions = this.generateRegions();
        const oldObjects = this.objects;
        this.objects = [];
        this.regions = [];
        for (const box of newRegions) {
            const region = new QuadTree<T>(box, config);
            region.parentMap = this.parentMap;
            this.regions.push(region);
            region.parent = this;
        }
        for (const obj of oldObjects) {
            this.parentMap.delete(obj.value);
            this.add(obj.value, false);
        }
        return true;
    }
    private join(): boolean {
        if (!this.regions) {
            return false;
        }
        for (const region of this.regions) {
            region.join();
            region.parent = undefined;
            for (const obj of region.objects) {
                this.objects.push(obj);
                this.parentMap.set(obj.value, this);
            }
        }
        this.regions = undefined;
        return true;
    }
    private generateRegions(): Box2[] {
        const regions: Box2[] = [this.box.clone()];
        const center = this.box.getCenter(new Vector2());
        let current = regions[0];
        let next = current.clone();
        current.max.x = center.x;
        next.min.x = center.x;
        regions.push(next);
        for (let i = 0, len = regions.length; i < len; i++) {
            current = regions[i];
            next = current.clone();
            current.max.y = center.y;
            next.min.y = center.y;
            regions.push(next);
        }
        return regions;
    }
}
