export class SharedDetectDisguiseTrait {
    private objects: Set<any>;
    constructor() {
        this.objects = new Set();
    }
    add(object: any): void {
        this.objects.add(object);
    }
    delete(object: any): void {
        this.objects.delete(object);
    }
    has(object: any): boolean {
        return this.objects.has(object);
    }
    dispose(): void {
        this.objects.clear();
    }
}
