export class Bot {
    public name: string;
    public country: string;
    public gameApi: any;
    public actionsApi: any;
    public productionApi: any;
    public logger: any;
    public debugMode: boolean = false;
    constructor(name: string, country: string) {
        this.name = name;
        this.country = country;
    }
    get context() {
        return {
            game: this.gameApi,
            player: {
                name: this.name,
                actions: this.actionsApi,
                production: this.productionApi,
            },
        };
    }
    setGameApi(api: any): void {
        this.gameApi = api;
    }
    setActionsApi(api: any): void {
        this.actionsApi = api;
    }
    setProductionApi(api: any): void {
        this.productionApi = api;
    }
    setLogger(logger: any): void {
        this.logger = logger;
        this.logger.setDebugLevel(this.debugMode);
    }
    setDebugMode(debug: boolean): Bot {
        this.debugMode = debug;
        this.logger?.setDebugLevel(debug);
        return this;
    }
    getDebugMode(): boolean {
        return this.debugMode;
    }
    onGameStart(_event: any): void { }
    onGameTick(_event: any): void { }
    onGameEvent(_event: any, _data: any): void { }
}
