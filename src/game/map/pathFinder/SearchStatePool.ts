interface SearchState {
    node: any;
    parent: SearchState | undefined;
    closed: boolean;
    open: number;
    distanceToSource: number;
    fScore: number;
    heapIndex: number;
}
class SearchStatePool {
    private index: number = 0;
    private pool: SearchState[] = [];
    createNewState(node: any): SearchState {
        let state = this.pool[this.index];
        if (state) {
            state.node = node;
            state.parent = undefined;
            state.closed = false;
            state.open = 0;
            state.distanceToSource = Number.POSITIVE_INFINITY;
            state.fScore = Number.POSITIVE_INFINITY;
            state.heapIndex = -1;
        }
        else {
            state = new SearchState(node);
            this.pool[this.index] = state;
        }
        this.index++;
        return state;
    }
    reset(): void {
        this.index = 0;
    }
}
class SearchState implements SearchState {
    node: any;
    parent: SearchState | undefined;
    closed: boolean;
    open: number;
    distanceToSource: number;
    fScore: number;
    heapIndex: number;
    constructor(node: any) {
        this.node = node;
        this.closed = false;
        this.open = 0;
        this.distanceToSource = Number.POSITIVE_INFINITY;
        this.fScore = Number.POSITIVE_INFINITY;
        this.heapIndex = -1;
    }
}
export { SearchStatePool, SearchState };
