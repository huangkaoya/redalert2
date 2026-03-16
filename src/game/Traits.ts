export class Traits {
    private allTraits: any[] = [];
    private traitsByTypeCache: Map<any, any[]> = new Map();
    add(trait: any): void {
        this.allTraits.push(trait);
        this.traitsByTypeCache.clear();
    }
    addToFront(trait: any): void {
        this.allTraits.unshift(trait);
        this.traitsByTypeCache.clear();
    }
    remove(trait: any): void {
        const index = this.allTraits.indexOf(trait);
        if (index !== -1) {
            this.allTraits.splice(index, 1);
            this.traitsByTypeCache.clear();
        }
    }
    filter(type: any): any[] {
        let cached = this.traitsByTypeCache.get(type);
        if (cached) {
            return cached;
        }
        cached = typeof type === 'function'
            ? this.allTraits.filter(trait => trait instanceof type)
            : this.allTraits.filter(trait => this.traitImplements(trait, type));
        this.traitsByTypeCache.set(type, cached);
        return cached;
    }
    get(type: any): any {
        const trait = this.find(type);
        if (!trait) {
            throw new Error("No matching trait found");
        }
        return trait;
    }
    find(type: any): any {
        return this.filter(type)[0];
    }
    getAll(): any[] {
        return this.allTraits;
    }
    private traitImplements(trait: any, type: any): boolean {
        for (const prop of Object.getOwnPropertyNames(type)) {
            if (trait[type[prop]] === undefined) {
                return false;
            }
        }
        return true;
    }
    clear(): void {
        this.allTraits.length = 0;
        this.traitsByTypeCache.clear();
    }
    dispose(): void {
        this.getAll().forEach(trait => trait.dispose?.());
        this.clear();
    }
}
