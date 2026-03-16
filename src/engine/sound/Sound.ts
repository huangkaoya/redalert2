import { ChannelType } from "./ChannelType";
import { SoundKey } from "./SoundKey";
import { SoundSpecs, SoundControl } from "./SoundSpecs";
import { getRandomInt } from "../../util/math";
import { isNotNullOrUndefined } from "../../util/typeGuard";
interface AudioVisualRules {
    ini: {
        getString(key: string): string | undefined;
    };
}
interface AudioFiles {
    get(filename: string): any;
}
interface SoundSpec {
    name: string;
    control: Set<SoundControl>;
    sounds: string[];
    volume: number;
    delay?: {
        min: number;
        max: number;
    };
    limit: number;
    loop?: number;
    fShift?: {
        min: number;
        max: number;
    };
    attack?: number;
    decay?: number;
}
interface AudioSystem {
    initialize(): void;
    dispose(): void;
    playWavFile(file: any, channel: ChannelType, volume?: number, pan?: number, delay?: number, rate?: number, loop?: boolean): any;
    playWavSequence(files: any[], channel: ChannelType, volume?: number, pan?: number, delay?: number, rate?: number): any;
    playWavLoop(files: any[], channel: ChannelType, volume?: number, pan?: number, delayMs?: {
        min: number;
        max: number;
    }, rate?: number, attack?: boolean, decay?: boolean, loops?: number): any;
}
interface PlaybackHandle {
    isPlaying(): boolean;
    stop(): void;
}
export class Sound {
    private audioSystem: AudioSystem;
    private audioFiles: AudioFiles;
    private soundSpecs: SoundSpecs;
    private audioVisualRules: AudioVisualRules;
    private document: Document;
    private playbackHandles = new Map<string, PlaybackHandle[]>();
    constructor(audioSystem: AudioSystem, audioFiles: AudioFiles, soundSpecs: SoundSpecs, audioVisualRules: AudioVisualRules, document: Document) {
        this.audioSystem = audioSystem;
        this.audioFiles = audioFiles;
        this.soundSpecs = soundSpecs;
        this.audioVisualRules = audioVisualRules;
        this.document = document;
    }
    private handleClick = (event: Event): void => {
        const target = event.target as Element;
        if (target.matches("button, .menu-button:not(.disabled)")) {
            this.play(SoundKey.GUIMainButtonSound, ChannelType.Ui);
        }
        else if (target.matches(".list-item")) {
            this.play(SoundKey.GenericClick, ChannelType.Ui);
        }
        else if (target instanceof HTMLInputElement &&
            ["checkbox", "radio", "range"].includes(target.type) &&
            !target.disabled) {
            this.play(SoundKey.GUICheckboxSound, ChannelType.Ui);
        }
        else if ((target instanceof HTMLSelectElement && !target.disabled) ||
            target.matches(".select:not(.disabled) *")) {
            this.play(SoundKey.GUIComboOpenSound, ChannelType.Ui);
        }
    };
    initialize(): void {
        this.audioSystem.initialize();
        this.document.addEventListener("click", this.handleClick);
    }
    dispose(): void {
        this.audioSystem.dispose();
        this.document.removeEventListener("click", this.handleClick);
    }
    private getSoundKey(key: SoundKey | string): string | undefined {
        let soundKey: string | undefined;
        if (typeof SoundKey[key as keyof typeof SoundKey] === "string") {
            soundKey = this.audioVisualRules.ini.getString(SoundKey[key as keyof typeof SoundKey]);
            if (!soundKey)
                return;
        }
        else {
            soundKey = key as string;
        }
        return soundKey;
    }
    private getSoundSpec(key: SoundKey | string): SoundSpec | undefined {
        const soundKey = this.getSoundKey(key);
        if (soundKey) {
            const spec = this.soundSpecs.getSpec(soundKey);
            if (spec)
                return spec;
            console.warn(`Sound "${soundKey}" is not defined`);
        }
        else {
            console.warn(`No sound is defined for key "${SoundKey[key as keyof typeof SoundKey]}"`);
        }
    }
    play(key: SoundKey | string, channel: ChannelType): PlaybackHandle | undefined {
        const spec = this.getSoundSpec(key);
        if (spec) {
            const loops = spec.control.has(SoundControl.Loop)
                ? spec.loop || Number.POSITIVE_INFINITY
                : 0;
            return this.playWithOptions(spec, channel, spec.volume / 100, 0, spec.limit, loops);
        }
    }
    private playWithOptions(spec: SoundSpec, channel: ChannelType, volume: number, pan: number, limit: number, loops: number): PlaybackHandle | undefined {
        if (!spec.sounds.length)
            return;
        this.cleanOldHandles();
        let handles = this.playbackHandles.get(spec.name);
        if (!handles) {
            handles = [];
            this.playbackHandles.set(spec.name, handles);
        }
        if (limit && handles.length >= limit) {
            if (!spec.control.has(SoundControl.Interrupt))
                return;
            handles.shift()!.stop();
        }
        const rate = 1 + (spec.fShift
            ? getRandomInt(spec.fShift.min, spec.fShift.max) / 100
            : 0);
        let handle: PlaybackHandle | undefined;
        const hasAttack = spec.control.has(SoundControl.Attack);
        const hasDecay = spec.control.has(SoundControl.Decay);
        if (loops && (spec.sounds.length > 1 || loops !== Number.POSITIVE_INFINITY || spec.delay)) {
            const sequence = this.buildAttackDecaySequence(spec, hasAttack, hasDecay, true);
            const wavFiles = sequence
                .map((sound) => this.getWavFile(sound))
                .filter(isNotNullOrUndefined);
            handle = this.audioSystem.playWavLoop(wavFiles, channel, volume, pan, spec.delay, rate, hasAttack, hasDecay, loops);
        }
        else {
            let delay = 0;
            if (spec.delay) {
                delay = getRandomInt(spec.delay.min, spec.delay.max);
            }
            if (hasAttack || hasDecay) {
                const sequence = this.buildAttackDecaySequence(spec, hasAttack, hasDecay, false);
                const wavFiles = sequence
                    .map((sound) => this.getWavFile(sound))
                    .filter(isNotNullOrUndefined);
                handle = this.audioSystem.playWavSequence(wavFiles, channel, volume, pan, delay, rate);
            }
            else {
                let soundName: string;
                if (spec.control.has(SoundControl.Random)) {
                    soundName = spec.sounds[getRandomInt(0, spec.sounds.length - 1)];
                }
                else {
                    soundName = spec.sounds[0];
                }
                const wavFile = this.getWavFile(soundName);
                if (!wavFile)
                    return;
                handle = this.audioSystem.playWavFile(wavFile, channel, volume, pan, delay, rate, loops !== 0);
            }
        }
        if (handle) {
            handles.push(handle);
        }
        return handle;
    }
    private buildAttackDecaySequence(spec: SoundSpec, hasAttack: boolean, hasDecay: boolean, isLoop: boolean): string[] {
        const attackCount = hasAttack ? spec.attack || 1 : 0;
        const decayCount = hasDecay ? spec.decay || 1 : 0;
        const mainSounds = spec.sounds.slice(attackCount, spec.sounds.length - decayCount);
        const sequence: string[] = [];
        if (attackCount > 0) {
            const attackSound = spec.sounds[getRandomInt(0, attackCount - 1)];
            sequence.push(attackSound);
        }
        if (isLoop) {
            sequence.push(...mainSounds);
        }
        else {
            sequence.push(mainSounds[getRandomInt(0, mainSounds.length - 1)]);
        }
        if (decayCount > 0) {
            const decaySound = spec.sounds[getRandomInt(spec.sounds.length - decayCount, spec.sounds.length - 1)];
            sequence.push(decaySound);
        }
        return sequence;
    }
    private getWavFile(soundName: string): any {
        const filename = soundName + ".wav";
        const file = this.audioFiles.get(filename);
        if (file)
            return file;
        console.error(`Audio file "${filename}" not found.`);
    }
    private cleanOldHandles(): void {
        for (const [name, handles] of this.playbackHandles) {
            const activeHandles = handles.filter((handle) => handle.isPlaying());
            this.playbackHandles.set(name, activeHandles);
        }
    }
}
