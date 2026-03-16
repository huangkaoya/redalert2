export class RootRoute {
    public screenType: string;
    public params: any;
    constructor(screenType: string, params?: any) {
        this.screenType = screenType;
        this.params = params;
    }
}
