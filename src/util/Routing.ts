type RouteController = (params: string[]) => void | Promise<void>;
interface RouteEntry {
    controller: RouteController;
}
export class Routing {
    private routes: Record<string, RouteEntry> = {};
    constructor() { }
    public addRoute(path: string, controller: RouteController): void {
        const normalizedPath = path === "*" ? "*" : (path.startsWith('/') ? path : `/${path}`);
        this.routes[normalizedPath] = { controller };
    }
    public init(): void {
        if (typeof window !== 'undefined' && typeof location !== 'undefined') {
            window.addEventListener("hashchange", this.handleHashChange);
            this.router();
        }
        else {
            console.warn("Routing.init: Cannot initialize routing outside of a browser environment.");
        }
    }
    private handleHashChange = (): void => {
        this.router();
    };
    public async router(): Promise<void> {
        if (typeof location === 'undefined') {
            return;
        }
        const hashPath = location.hash.slice(1) || "/";
        if (hashPath.startsWith('/')) {
            const segments = hashPath.split('/');
            const mainSegment = segments[1] || '';
            const params = segments.slice(2);
            const routeKey = `/${mainSegment}`;
            const wildcardRoute = this.routes["*"];
            if (wildcardRoute) {
                await wildcardRoute.controller(params);
            }
            const specificRoute = this.routes[routeKey];
            if (specificRoute && specificRoute.controller) {
                await specificRoute.controller(params);
            }
            else if (!wildcardRoute && routeKey !== "/") {
                console.warn(`Routing: No controller found for route '${routeKey}'`);
            }
        }
        else {
            console.warn(`Routing: Path '${hashPath}' does not conform to expected format (e.g., #/path/to/resource)`);
        }
    }
    public destroy(): void {
        if (typeof window !== 'undefined') {
            window.removeEventListener("hashchange", this.handleHashChange);
        }
    }
}
