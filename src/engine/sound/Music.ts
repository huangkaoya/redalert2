import { getRandomInt } from "../../util/math";
export enum MusicType {
    Normal = 0,
    NormalShuffle = 1,
    Intro = "INTRO",
    Score = "SCORE",
    Loading = "LOADING",
    Credits = "CREDITS",
    Options = "RA2Options"
}
interface MusicSpec {
    name: string;
    sound: string;
    repeat: boolean;
    normal: boolean;
}
interface MusicSpecs {
    getSpec(name: string): MusicSpec | undefined;
    getAll(): MusicSpec[];
}
interface AudioSystem {
    playMusicFile(file: any, repeat: boolean, onEnded?: () => void): Promise<boolean>;
    stopMusic(): void;
}
interface AudioFiles {
    get(filename: string): Promise<any>;
}
export class Music {
    private audioSystem: AudioSystem;
    private audioFiles: AudioFiles;
    private musicSpecs: MusicSpecs;
    private playlist: MusicSpec[] = [];
    private currentPlaylistIdx: number = -1;
    private shuffle: boolean = false;
    private repeat: boolean = false;
    private currentMusicType?: MusicType;
    private initialRepeatName?: string;
    constructor(audioSystem: AudioSystem, audioFiles: AudioFiles, musicSpecs: MusicSpecs) {
        this.audioSystem = audioSystem;
        this.audioFiles = audioFiles;
        this.musicSpecs = musicSpecs;
    }
    unserializeOptions(data: string): void {
        const [shuffleStr, repeatStr, repeatName] = data.split(",");
        this.shuffle = Boolean(Number(shuffleStr));
        this.repeat = Boolean(Number(repeatStr));
        this.initialRepeatName = repeatName;
    }
    serializeOptions(): string {
        return [
            Number(this.shuffle),
            Number(this.repeat),
            this.repeat && this.currentPlaylistIdx !== -1
                ? this.playlist[this.currentPlaylistIdx].name
                : undefined,
        ].join(",");
    }
    getShuffleMode(): boolean {
        return this.shuffle;
    }
    getRepeatMode(): boolean {
        return this.repeat;
    }
    getPlaylist(): MusicSpec[] {
        return this.buildPlaylist(false);
    }
    getCurrentPlaylistItem(): MusicSpec | undefined {
        if (this.currentPlaylistIdx !== -1) {
            return this.playlist[this.currentPlaylistIdx];
        }
    }
    dispose(): void {
        this.stopPlaying();
    }
    private getMusicSpec(name: string): MusicSpec | undefined {
        console.log(`[Music] Looking for music spec: "${name}"`);
        const spec = this.musicSpecs.getSpec(name);
        if (spec) {
            console.log(`[Music] Found music spec for "${name}":`, spec);
            return spec;
        }
        console.warn(`[Music] Music "${name}" is not defined`);
        const allSpecs = this.musicSpecs.getAll();
        console.log(`[Music] Available music specs:`, allSpecs.map(s => ({ name: s.name, sound: s.sound })));
    }
    async play(type: MusicType): Promise<void> {
        if (this.currentMusicType === type)
            return;
        if (type === MusicType.Normal || type === MusicType.NormalShuffle) {
            const shouldShuffle = this.shuffle || type === MusicType.NormalShuffle;
            this.playlist = this.buildPlaylist(shouldShuffle);
            this.currentPlaylistIdx = 0;
            if (this.initialRepeatName) {
                const index = this.playlist.findIndex((spec) => spec.name === this.initialRepeatName);
                if (index !== -1) {
                    this.currentPlaylistIdx = index;
                }
            }
            const success = await this.playSpec(this.playlist[this.currentPlaylistIdx], () => this.advancePlaylist());
            if (success) {
                this.currentMusicType = type;
            }
        }
        else {
            const spec = this.getMusicSpec(type as string);
            if (spec) {
                const success = await this.playSpec(spec);
                if (success) {
                    this.currentMusicType = type;
                }
            }
            else {
                console.warn(`No music spec found for type "${type}"`);
            }
        }
    }
    stopPlaying(): void {
        this.audioSystem.stopMusic();
        this.currentMusicType = undefined;
    }
    setShuffleMode(shuffle: boolean): void {
        if (shuffle !== this.shuffle) {
            this.shuffle = shuffle;
            const currentItem = this.currentPlaylistIdx !== -1
                ? this.playlist[this.currentPlaylistIdx]
                : undefined;
            this.playlist = this.buildPlaylist(this.shuffle);
            this.currentPlaylistIdx = currentItem
                ? this.playlist.findIndex((spec) => spec === currentItem)
                : -1;
        }
    }
    setRepeatMode(repeat: boolean): void {
        this.repeat = repeat;
    }
    private async playSpec(spec: MusicSpec, onEnded?: () => void): Promise<boolean> {
        const file = await this.getMp3File(spec.sound);
        if (!file)
            return false;
        await this.audioSystem.playMusicFile(file, spec.repeat, onEnded);
        return true;
    }
    private async getMp3File(name: string): Promise<any> {
        const filename = name.toLowerCase() + ".mp3";
        console.log(`[Music] Looking for audio file: "${filename}"`);
        let file;
        try {
            file = await this.audioFiles.get(filename);
            console.log(`[Music] audioFiles.get("${filename}") result:`, !!file);
        }
        catch (error) {
            console.error(`[Music] Failed to fetch audio file "${filename}":`, error);
            return;
        }
        if (file) {
            console.log(`[Music] Successfully got audio file: ${filename}`);
            return file;
        }
        console.warn(`[Music] Audio file "${filename}" not found.`);
        console.log(`[Music] Debugging themes directory access...`);
        try {
            console.log(`[Music] audioFiles type:`, typeof this.audioFiles);
            console.log(`[Music] audioFiles constructor:`, this.audioFiles.constructor.name);
        }
        catch (error) {
            console.error(`[Music] Error debugging audioFiles:`, error);
        }
    }
    private buildPlaylist(shuffle: boolean): MusicSpec[] {
        let playlist = this.musicSpecs.getAll().filter((spec) => spec.normal);
        if (shuffle) {
            playlist = this.shufflePlaylist(playlist);
        }
        return playlist;
    }
    private shufflePlaylist(playlist: MusicSpec[]): MusicSpec[] {
        const shuffled: MusicSpec[] = [];
        const remaining = [...playlist];
        while (remaining.length) {
            shuffled.push(...remaining.splice(getRandomInt(0, remaining.length - 1), 1));
        }
        return shuffled;
    }
    private async advancePlaylist(): Promise<void> {
        this.currentPlaylistIdx = this.repeat
            ? this.currentPlaylistIdx
            : (this.currentPlaylistIdx + 1) % this.playlist.length;
        await this.playSpec(this.playlist[this.currentPlaylistIdx], () => this.advancePlaylist());
    }
    async selectPlaylistItem(item: MusicSpec): Promise<void> {
        const index = this.playlist?.findIndex((spec) => spec === item);
        if (index !== -1) {
            this.currentPlaylistIdx = index;
            this.stopPlaying();
            await this.playSpec(this.playlist[this.currentPlaylistIdx], () => this.advancePlaylist());
        }
    }
}
