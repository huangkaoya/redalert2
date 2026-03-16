import React from 'react';
import { PlayerConnectionStatus } from '@/network/gamestate/PlayerConnectionStatus';
import { CountryIcon } from '@/gui/component/CountryIcon';
import { NO_TEAM_ID, OBS_COUNTRY_NAME } from '@/game/gameopts/constants';
import { formatTeamId } from '@/gui/component/TeamSelect';
interface Country {
    name: string;
    uiName?: string;
    side?: any;
}
interface PlayerInfo {
    name: string;
    status: PlayerConnectionStatus;
    loadPercent: number;
    country?: Country;
    color: string;
    team: number;
}
interface Viewport {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface LoadingScreenProps {
    playerInfos: PlayerInfo[];
    countryName: string;
    color: string;
    bgImageSrc?: string;
    viewport: Viewport;
    strings: {
        get(key: string, ...args: any[]): string;
    };
    countryUiNames: Map<string, string>;
    mapName: string;
}
const countrySpecialUnits = new Map<string, string>()
    .set("Americans", "Name:Para")
    .set("French", "Name:GTGCAN")
    .set("Germans", "Name:TNKD")
    .set("British", "Name:SNIPE")
    .set("Russians", "Name:TTNK")
    .set("Confederation", "Name:TERROR")
    .set("Africans", "Name:DTRUCK")
    .set("Arabs", "Name:DESO")
    .set("Alliance", "Name:BEAGLE");
const countryBriefings = new Map<string, string>()
    .set("Americans", "LoadBrief:USA")
    .set("French", "LoadBrief:French")
    .set("Germans", "LoadBrief:Germans")
    .set("British", "LoadBrief:British")
    .set("Russians", "LoadBrief:Russia")
    .set("Confederation", "LoadBrief:Cuba")
    .set("Africans", "LoadBrief:Lybia")
    .set("Arabs", "LoadBrief:Iraq")
    .set("Alliance", "LoadBrief:Korea");
export class LoadingScreen extends React.Component<LoadingScreenProps> {
    render(): React.ReactElement {
        const playerInfos = this.props.playerInfos;
        const countryName = this.props.countryName;
        const color = this.props.color;
        const showTeams = playerInfos.length > 1 &&
            playerInfos.every(player => !player.country || player.team !== NO_TEAM_ID);
        const briefingKey = countryBriefings.get(countryName);
        const specialUnitKey = countrySpecialUnits.get(countryName);
        const strings = this.props.strings;
        return (<div className="loading-screen" style={this.getStyle(this.props.bgImageSrc)}>
        {specialUnitKey && (<div className="special-unit-name">
            {strings.get(specialUnitKey)}
          </div>)}
        {briefingKey && (<div className="briefing-text" style={{ color }}>
            {strings.get(briefingKey)}
          </div>)}
        <div className="loading-text" style={{ color }}>
          {strings.get("GUI:LoadingEx")}
        </div>
        <div className="player-status-container">
          {playerInfos ? playerInfos.map(player => this.renderStatus(player, showTeams)) : null}
        </div>
        <div style={{ color }} className="country-name">
          {this.props.strings.get(this.props.countryUiNames.get(countryName) ?? countryName)}
        </div>
        <div style={{ color }} className="map-name">
          {this.props.mapName}
        </div>
      </div>);
    }
    private renderStatus(player: PlayerInfo, showTeams: boolean): React.ReactElement {
        const opacity = player.status === PlayerConnectionStatus.Connected ? 1 : 0.5;
        return (<div key={player.name} className="player-status" style={{ opacity, color: player.color }}>
        {showTeams && (<span className="player-team">
            {player.country !== undefined &&
                    this.props.strings.get("GUI:TeamNo", formatTeamId(player.team))}
          </span>)}
        <progress value={player.loadPercent.toString()} max={100}/>
        <CountryIcon country={player.country ? player.country.name : OBS_COUNTRY_NAME}/>
        <span className="player-name">
          {player.name}
        </span>
      </div>);
    }
    private getStyle(bgImageSrc?: string): React.CSSProperties {
        const viewport = this.props.viewport;
        return {
            backgroundImage: bgImageSrc ? `url(${bgImageSrc})` : undefined,
            backgroundSize: "cover",
            width: viewport.width + "px",
            height: viewport.height + "px",
            position: "absolute",
            left: viewport.x,
            top: viewport.y,
        };
    }
}
