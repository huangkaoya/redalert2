import { List, ListItem } from "@/gui/component/List";
import React, { useState } from "react";
import { pad } from "@/util/string";
interface Strings {
    get(key: string): string;
}
interface PlaylistItem {
    name: string;
}
interface Music {
    getCurrentPlaylistItem(): PlaylistItem;
    getPlaylist(): PlaylistItem[];
    getShuffleMode(): boolean;
    setShuffleMode(enabled: boolean): void;
    getRepeatMode(): boolean;
    setRepeatMode(enabled: boolean): void;
    selectPlaylistItem(item: PlaylistItem): void;
    stopPlaying(): void;
}
interface MusicJukeboxProps {
    music: Music;
    strings: Strings;
}
export const MusicJukebox: React.FC<MusicJukeboxProps> = ({ music, strings }) => {
    const [selectedItem, setSelectedItem] = useState<PlaylistItem>(() => music.getCurrentPlaylistItem());
    return (<div className="music-jukebox">
      <div className="jukebox-content">
        <div className="controls">
          <div>
            <label>
              <input type="checkbox" defaultChecked={music.getShuffleMode()} onChange={(e) => music.setShuffleMode(e.target.checked)}/>
              {strings.get("GUI:Shuffle")}
            </label>
          </div>
          <div>
            <label>
              <input type="checkbox" defaultChecked={music.getRepeatMode()} onChange={(e) => music.setRepeatMode(e.target.checked)}/>
              {strings.get("GUI:Repeat")}
            </label>
          </div>
        </div>
        <List className="playlist">
          {music
            .getPlaylist()
            .map((item, index) => (<ListItem key={item.name} selected={item === selectedItem} onClick={() => setSelectedItem(item)}>
                {pad(index + 1, "00")} - {strings.get(item.name)}
              </ListItem>))}
        </List>
      </div>
      <div className="jukebox-footer">
        <button className="dialog-button" onClick={() => selectedItem && music.selectPlaylistItem(selectedItem)}>
          {strings.get("GUI:Play")}
        </button>
        <button className="dialog-button" onClick={() => music.stopPlaying()}>
          {strings.get("GUI:Stop")}
        </button>
      </div>
    </div>);
};
