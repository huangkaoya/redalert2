import { EventDispatcher } from "../../util/event";
export class Mixer {
    private volumes: Map<number, number> = new Map();
    private mutes: Map<number, boolean> = new Map();
    private _onVolumeChange = new EventDispatcher<[
        Mixer,
        number
    ]>();
    get onVolumeChange() {
        return this._onVolumeChange.asEvent();
    }
    setVolume(channel: number, volume: number): void {
        if (this.getVolume(channel) !== volume) {
            this.volumes.set(channel, volume);
            this._onVolumeChange.dispatch(this as any, channel);
        }
    }
    getVolume(channel: number): number {
        return this.volumes.get(channel) ?? 1;
    }
    setMuted(channel: number, muted: boolean): void {
        this.mutes.set(channel, muted);
        this._onVolumeChange.dispatch(this as any, channel);
    }
    isMuted(channel: number): boolean {
        return !!this.mutes.get(channel);
    }
    serialize(): string {
        return [...this.volumes.entries()]
            .map(([channel, volume]) => channel + "," + volume)
            .join(";");
    }
    unserialize(data: string): Mixer {
        this.volumes = new Map(data.split(";").map((entry) => {
            const [channel, volume] = entry.split(",").map(Number);
            return [channel, volume];
        }));
        return this;
    }
}
