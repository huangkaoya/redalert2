import React, { useState, useEffect } from 'react';
import { Chat } from '../../../../component/Chat';
import { List, ListHeader, ListItem } from '../../../../component/List';
import { Image } from '../../../../component/Image';
import { RankIndicator } from '../../lobby/component/RankIndicator';
import { ChannelUser } from '../../../../component/ChannelUser';
import { ChatRecipientType } from '../../../../../network/chat/ChatMessage';
import { Strings } from '../../../../../data/Strings';
interface Game {
    name: string;
    mapName: string;
    description: string;
    hostName: string;
    hostPing?: number;
    hostMuted: boolean;
    humanPlayers: number;
    aiPlayers: number;
    maxPlayers: number;
    passLocked: boolean;
    observable: boolean;
    observers?: number;
    tournament?: boolean;
    modName?: string;
    modHash?: string;
}
interface User {
    name: string;
    operator: boolean;
}
interface PlayerProfile {
    name: string;
    rank?: number;
}
interface MapInfo {
    official: boolean;
    getFullMapTitle(strings: Strings): string;
}
interface MapList {
    getByName(name: string): MapInfo | undefined;
}
interface ChatHistory {
    lastComposeTarget: {
        value: any;
    };
    lastWhisperFrom: {
        value: string;
    };
    lastWhisperTo: {
        value: string;
    };
}
interface GameBrowserProps {
    strings: Strings;
    messages: any[];
    chatHistory: ChatHistory;
    channels: string[];
    localUsername: string;
    users: User[];
    games: Game[];
    playerProfiles: Map<string, PlayerProfile>;
    mapList: MapList;
    onSendMessage: (message: {
        value: string;
        recipient: any;
    }) => void;
    onRefreshClick: () => void;
    onSelectGame: (game: Game | undefined) => void;
    onDoubleClickGame: (game: Game) => void;
}
interface GameListProps {
    games: Game[];
    selectedGame?: Game;
    mapList: MapList;
    onClickGame: (game: Game) => void;
    onDoubleClickGame: (game: Game) => void;
    tooltip: string;
    strings: Strings;
    playerProfiles: Map<string, PlayerProfile>;
}
interface GameItemProps {
    game: Game;
    uiMapName: string;
    customMap: boolean;
    selected: boolean;
    tooltip: string;
    ping?: number;
    hostProfile?: PlayerProfile;
    strings: Strings;
    onClick: (game: Game) => void;
    onDoubleClick: (game: Game) => void;
}
const GameItem: React.FC<GameItemProps> = ({ game, uiMapName, customMap, selected, tooltip, ping, hostProfile, strings, onClick, onDoubleClick }) => (<ListItem key={game.name} className="game" selected={selected} tooltip={tooltip} onClick={() => onClick(game)} onDoubleClick={() => onDoubleClick(game)}>
    <span className="game-flags">
      <span className="game-type" title={game.modName || !customMap
        ? strings.get("GUI:GameMod", game.modName || strings.get("GUI:Official"))
        : strings.get("GUI:CustomMap")}>
        {game.modName || customMap ? (<Image src="settings.png"/>) : (<Image src={game.tournament ? "woltrny.pcx" : "gt18.pcx"}/>)}
      </span>
      <span className="game-pass-locked">
        {game.passLocked && <Image src="wolpriv.pcx"/>}
      </span>
      <span className="game-obs">
        {game.observable && <Image src="wolob.pcx"/>}
      </span>
    </span>
    <span className="game-map" title={uiMapName}>
      {uiMapName}
    </span>
    <span className="game-name" title={game.hostMuted ? undefined : game.description}>
      {game.hostMuted ? undefined : game.description}
    </span>
    <span className="game-players">
      {game.maxPlayers
        ? `${game.humanPlayers + game.aiPlayers}/${game.maxPlayers - (game.observable ? 1 : 0)}`
        : "?/?"}
    </span>
    <span className="game-host">
      {game.hostName}
      {hostProfile !== undefined && (<RankIndicator playerProfile={hostProfile} strings={strings}/>)}
    </span>
    <span className="game-ping">
      {ping && (<meter value={ping} max={300} low={100} high={250} optimum={0} title={`${ping}ms`}/>)}
    </span>
  </ListItem>);
const GameList: React.FC<GameListProps> = ({ games, selectedGame, onClickGame, onDoubleClickGame, tooltip, strings, playerProfiles, mapList }) => (<>
    <ListHeader className="game game-list-header">
      <span className="game-flags">
        <span className="game-type"/>
        <span className="game-pass-locked"/>
        <span className="game-obs"/>
      </span>
      <span className="game-map">{strings.get("GUI:Map")}</span>
      <span className="game-name">{strings.get("GUI:RoomDesc")}</span>
      <span className="game-players">👤</span>
      <span className="game-host">{strings.get("GUI:HostName")}</span>
      <span className="game-ping">{strings.get("GUI:Ping")}</span>
    </ListHeader>
    <List className="games-list" tooltip={tooltip}>
      {games.map((game) => {
        const ping = game.hostPing;
        const hostProfile = playerProfiles.get(game.hostName);
        const mapInfo = mapList.getByName(game.mapName);
        const uiMapName = !mapInfo?.official && game.hostMuted
            ? strings.get("GUI:CustomMap")
            : mapInfo?.getFullMapTitle(strings) || game.mapName;
        const tooltipParts = [
            ...(game.modName ? [strings.get("GUI:GameMod", game.modName)] : []),
            strings.get("TXT_MAP", uiMapName),
            ping ? strings.get("WOL:GamePing", ping) : strings.get("TXT_UNKNOWN_PING"),
            ...(hostProfile?.rank !== undefined ? [`${strings.get("TXT_HOST_RANK")} ${hostProfile.rank}`] : [])
        ];
        return (<GameItem key={game.name} game={game} uiMapName={uiMapName} customMap={!mapInfo?.official} ping={ping} hostProfile={hostProfile} tooltip={tooltipParts.join(", ")} selected={game.name === selectedGame?.name} strings={strings} onClick={onClickGame} onDoubleClick={onDoubleClickGame}/>);
    })}
    </List>
  </>);
export const GameBrowser: React.FC<GameBrowserProps> = (props) => {
    const [selectedGame, setSelectedGame] = useState<Game | undefined>(undefined);
    useEffect(() => {
        if (selectedGame && !props.games.find(game => game.name === selectedGame.name)) {
            setSelectedGame(undefined);
        }
    }, [props.games, selectedGame]);
    const handleSelectGame = (game: Game | undefined) => {
        setSelectedGame(game);
        props.onSelectGame(game);
    };
    return (<div className="gamebrowser-wrapper">
      <div className="gamebrowser-top">
        <div className="games">
          <div className="games-header">
            <button className="icon-button refresh-button" onClick={props.onRefreshClick} data-r-tooltip={props.strings.get("STT:WOLLobbyRefreshChannels")}/>
            <span className="games-label">
              {props.strings.get("GUI:OpenGames")}
            </span>
          </div>
          <GameList games={props.games} selectedGame={selectedGame} mapList={props.mapList} onClickGame={handleSelectGame} onDoubleClickGame={(game) => {
            handleSelectGame(game);
            props.onDoubleClickGame(game);
        }} tooltip={props.strings.get("STT:LobbyListGames")} strings={props.strings} playerProfiles={props.playerProfiles}/>
        </div>
      </div>
      <div className="gamebrowser-bottom">
        <Chat strings={props.strings} messages={props.messages} channels={props.channels ?? []} chatHistory={props.chatHistory} localUsername={props.localUsername} onSendMessage={props.onSendMessage} tooltips={{
            input: props.strings.get("STT:LobbyEditInput"),
            output: props.strings.get("STT:LobbyEditOutput"),
            button: props.strings.get("STT:EmoteButton"),
        }}/>
        <List className="players-list" tooltip={props.strings.get("STT:LobbyListUsers")}>
          {props.users.map((user) => {
            const playerProfile = props.playerProfiles.get(user.name);
            return (<ChannelUser key={user.name} user={user} playerProfile={playerProfile} strings={props.strings} onClick={() => {
                    props.chatHistory.lastComposeTarget.value = {
                        type: ChatRecipientType.Whisper,
                        name: user.name,
                    };
                }}/>);
        })}
        </List>
      </div>
    </div>);
};
