import React from "react";
import { Slider } from "@/gui/component/Slider";
import { ChannelType } from "@/engine/sound/ChannelType";
import { MusicJukebox } from "@/gui/screen/options/component/MusicJukebox";
interface Strings {
    get(key: string): string;
}
interface Music {
    getCurrentPlaylistItem(): any;
    getPlaylist(): any[];
    getShuffleMode(): boolean;
    setShuffleMode(enabled: boolean): void;
    getRepeatMode(): boolean;
    setRepeatMode(enabled: boolean): void;
    selectPlaylistItem(item: any): void;
    stopPlaying(): void;
}
interface Mixer {
    getVolume(channelType: ChannelType): number;
    setVolume(channelType: ChannelType, volume: number): void;
}
interface SoundOptsProps {
    strings: Strings;
    music?: Music;
    mixer: Mixer;
}
const channelLabels = new Map<ChannelType, string>([
    [ChannelType.Master, "GUI:MasterVolume"],
    [ChannelType.Music, "GUI:MusicVolume"],
    [ChannelType.Effect, "GUI:SFXVolume"],
    [ChannelType.Voice, "GUI:VoiceVolume"],
    [ChannelType.Ambient, "GUI:AmbientVolume"],
    [ChannelType.Ui, "GUI:UIVolume"],
    [ChannelType.CreditTicks, "GUI:CreditsVolume"],
]);
export const SoundOpts: React.FC<SoundOptsProps> = ({ strings, music, mixer }) => (<div className="opts sound-opts">
    <div className="sound-sliders">
      {[...channelLabels].map(([channelType, labelKey]) => (<div className="slider-item" key={channelType}>
          <span className="label">{strings.get(labelKey)}</span>
          <Slider min={0} max={10} value={String(10 * mixer.getVolume(channelType))} onChange={(e) => mixer.setVolume(channelType, Number(e.target.value) / 10)}/>
        </div>))}
    </div>
    {music && <MusicJukebox music={music} strings={strings}/>}
  </div>);
