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
    onGameStart(event: any): void { }
    onGameTick(event: any): void { }
    onGameEvent(event: any, data: any): void { }
}
