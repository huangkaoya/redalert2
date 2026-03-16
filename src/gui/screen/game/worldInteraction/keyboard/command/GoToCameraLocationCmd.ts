export class GoToCameraLocationCmd {
    private cameraPan: any;
    private cameraLocations: Map<any, any>;
    private idx: any;
    private defaultLocation: any;
    constructor(cameraPan: any, cameraLocations: Map<any, any>, idx: any, defaultLocation: any) {
        this.cameraPan = cameraPan;
        this.cameraLocations = cameraLocations;
        this.idx = idx;
        this.defaultLocation = defaultLocation;
    }
    execute(): void {
        const location = this.cameraLocations.get(this.idx) || this.defaultLocation;
        if (location) {
            this.cameraPan.setPan(location);
        }
    }
}
