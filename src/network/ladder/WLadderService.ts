import { LadderType, CURRENT_SEASON, PREV_SEASON } from './wladderConfig';
import { HttpRequest } from '../HttpRequest';
export class WLadderService {
    private url: string;
    private wolConfig: any;
    static CURRENT_SEASON = CURRENT_SEASON;
    static PREV_SEASON = PREV_SEASON;
    constructor(wolConfig: any) {
        this.wolConfig = wolConfig;
    }
    setUrl(url: string): void {
        this.url = url;
    }
    getUrl(): string {
        return this.url;
    }
    async getSeasons(options: any): Promise<any> {
        if (!this.url)
            throw new Error("No ladder URL is set");
        const sku = this.wolConfig.getClientSku();
        return await new HttpRequest().fetchJson(this.url + "/" + sku, options);
    }
    async getSeason(season: string, locale: string, options: any): Promise<any> {
        if (!this.url)
            throw new Error("No ladder URL is set");
        const sku = this.wolConfig.getClientSku();
        return await new HttpRequest().fetchJson(this.url + `/${sku}/${season}?locale=${locale}`, options);
    }
    async listSearch(players: any[], options: any, ladderType: LadderType = LadderType.Solo1v1, season: string = CURRENT_SEASON, locale?: string): Promise<any> {
        if (!this.url)
            throw new Error("No ladder URL is set");
        const sku = this.wolConfig.getClientSku();
        return await new HttpRequest().fetchJson(this.url + `/${sku}/${ladderType}/${season}/listsearch`, options, {
            method: "POST",
            body: JSON.stringify({ players, locale })
        });
    }
    async rungSearch(start: number, count: number, ladderType: LadderType, season: string, ladderId: string, options: any): Promise<any> {
        if (!this.url)
            throw new Error("No ladder URL is set");
        const sku = this.wolConfig.getClientSku();
        return await new HttpRequest().fetchJson(this.url + `/${sku}/${ladderType}/${season}/rungsearch`, options, {
            method: "POST",
            body: JSON.stringify({ ladderId, start, count })
        });
    }
}
