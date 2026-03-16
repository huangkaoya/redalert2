export class SidebarTab {
    items: any[] = [];
    needsUpdate: boolean = true;
    flashing: boolean = false;
    id: number;
    constructor(id: number) {
        this.id = id;
    }
    get disabled(): boolean {
        return this.items.length === 0;
    }
}
