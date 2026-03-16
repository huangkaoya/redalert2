import { OperationCanceledError, CancellationToken } from "@puzzl/core/lib/async/cancellation";
import { WolConnection } from "@/network/WolConnection";
interface Region {
    wolUrl: string;
    available: boolean;
}
interface Regions {
    getAll(): Region[];
}
export class ServerPings {
    private static readonly CONNECT_TIMEOUT = 5;
    private regions: Regions;
    private wolLogger: any;
    private pings: Map<Region, number | undefined> = new Map();
    constructor(regions: Regions, wolLogger: any) {
        this.regions = regions;
        this.wolLogger = wolLogger;
        this.pings = new Map();
    }
    async update(onUpdate?: () => void, cancellationToken?: CancellationToken): Promise<void> {
        await Promise.all(this.regions
            .getAll()
            .filter((region) => region.available)
            .map(async (region) => {
            const connection = WolConnection.factory(this.wolLogger);
            try {
                await connection.connect(region.wolUrl, {
                    timeoutSeconds: ServerPings.CONNECT_TIMEOUT,
                    cancelToken: cancellationToken,
                });
            }
            catch (error) {
                if (error instanceof OperationCanceledError) {
                    return;
                }
                console.error(error);
                connection.close();
                this.pings.set(region, undefined);
                onUpdate?.();
                return;
            }
            let ping: number | undefined;
            try {
                ping = await connection.ping(5);
            }
            catch (error) {
                console.error(error);
            }
            finally {
                connection.close();
            }
            if (!cancellationToken?.isCancelled()) {
                this.pings.set(region, ping);
                onUpdate?.();
            }
        }));
    }
    getPings(): Map<Region, number | undefined> {
        return this.pings;
    }
}
