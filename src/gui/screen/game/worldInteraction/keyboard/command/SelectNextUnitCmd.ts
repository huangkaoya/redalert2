import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
export class SelectNextUnitCmd {
    private unitSelectionHandler: any;
    private mapPanningHelper: any;
    private cameraPan: any;
    private player: any;
    private world: any;
    private reverse: boolean;
    private unitList: any[];
    private disposables: any;
    private generator?: Generator<any, void, unknown>;
    private lastSelectionHash?: string;
    constructor(unitSelectionHandler: any, mapPanningHelper: any, cameraPan: any, player: any, world: any) {
        this.unitSelectionHandler = unitSelectionHandler;
        this.mapPanningHelper = mapPanningHelper;
        this.cameraPan = cameraPan;
        this.player = player;
        this.world = world;
        this.reverse = false;
        this.unitList = [];
        this.disposables = new CompositeDisposable();
        const onObjectSpawned = (gameObject: any) => {
            if (gameObject.isTechno() && gameObject.owner === player) {
                this.unitList.push(gameObject);
            }
        };
        this.world.onObjectSpawned.subscribe(onObjectSpawned);
        this.disposables.add(() => this.world.onObjectSpawned.unsubscribe(onObjectSpawned));
    }
    getNextUnit(): any {
        if (!this.generator) {
            this.generator = this.generate();
        }
        return this.generator.next().value;
    }
    *generate(): Generator<any, void, unknown> {
        while (true) {
            const sortedUnits = (this.unitList = this.player
                .getOwnedObjects()
                .filter((obj: any) => obj.isUnit())
                .sort((a: any, b: any) => a.tile.dx +
                1000 * a.tile.dy -
                (b.tile.dx + 1000 * b.tile.dy) +
                0.1 * (b.position.subCell - a.position.subCell)));
            if (sortedUnits.length) {
                let index = this.reverse ? sortedUnits.length : -1;
                const selectedUnits = this.unitSelectionHandler.getSelectedUnits();
                if (selectedUnits.length > 1 &&
                    selectedUnits[0].isUnit()) {
                    const foundIndex = sortedUnits.indexOf(selectedUnits[0]);
                    if (foundIndex !== -1) {
                        index = foundIndex;
                    }
                }
                while (this.reverse ? --index >= 0 : ++index < sortedUnits.length) {
                    if (this.unitSelectionHandler.getHash() !== this.lastSelectionHash) {
                        this.lastSelectionHash = this.unitSelectionHandler.getHash();
                        break;
                    }
                    const unit = sortedUnits[index];
                    if (unit.owner === this.player && unit.isSpawned) {
                        yield unit;
                    }
                }
            }
            else {
                yield undefined;
            }
        }
    }
    setReverse(reverse: boolean): void {
        this.reverse = reverse;
    }
    execute(): void {
        const nextUnit = this.getNextUnit();
        if (nextUnit) {
            this.unitSelectionHandler.selectSingleUnit(nextUnit);
            this.lastSelectionHash = this.unitSelectionHandler.getHash();
            const tile = nextUnit.tile;
            const cameraPan = this.mapPanningHelper.computeCameraPanFromTile(tile.rx, tile.ry);
            this.cameraPan.setPan(cameraPan);
        }
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
