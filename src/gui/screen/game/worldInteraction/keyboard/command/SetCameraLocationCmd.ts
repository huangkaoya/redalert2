export class SetCameraLocationCmd {
    private cameraPan: any;
    private cameraLocations: Map<any, any>;
    private idx: any;
    constructor(cameraPan: any, cameraLocations: Map<any, any>, idx: any) {
        this.cameraPan = cameraPan;
        this.cameraLocations = cameraLocations;
        this.idx = idx;
    }
    execute(): void {
        this.cameraLocations.set(this.idx, this.cameraPan.getPan());
    }
}
