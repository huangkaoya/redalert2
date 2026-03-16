import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { RankIndicator } from '../../lobby/component/RankIndicator';
import { Select } from '../../../../component/Select';
import { Option } from '../../../../component/Option';
import { SEARCH_LIMIT } from '../../../../../network/ladder/wladderConfig';
import { List } from '../../../../component/List';
import { WLadderService } from '../../../../../network/ladder/WLadderService';
interface PlayerProfile {
    name: string;
    rank: number;
    points: number;
    wins: number;
    losses: number;
    disconnects: number;
    lastGameDate?: string;
}
interface LadderProps {
    strings: any;
    wladderService: WLadderService;
    onError?: (error: any) => void;
}
function formatSeasonName(season: number, strings: any): string {
    if (season === WLadderService.CURRENT_SEASON) {
        return strings.get("GUI:LadderCurrent");
    }
    if (season === WLadderService.PREV_SEASON) {
        return strings.get("GUI:LadderPrev");
    }
    return strings.get("GUI:LadderSeason", season);
}
function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString(undefined, { dateStyle: "medium" });
}
function formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString(undefined, { timeStyle: "short" });
}
export const Ladder: React.FC<LadderProps> = ({ strings, wladderService, onError }) => {
    const [selectedSeason, setSelectedSeason] = useState<number>(WLadderService.CURRENT_SEASON);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [players, setPlayers] = useState<PlayerProfile[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
    useEffect(() => {
        loadAvailableSeasons();
    }, []);
    useEffect(() => {
        if (selectedSeason !== undefined) {
            loadLadderData();
        }
    }, [selectedSeason]);
    const loadAvailableSeasons = async () => {
        try {
            const seasons = await wladderService.getAvailableSeasons();
            setAvailableSeasons(seasons);
        }
        catch (error) {
            console.error('Failed to load seasons:', error);
            onError?.(error);
        }
    };
    const loadLadderData = async () => {
        setLoading(true);
        try {
            let profiles: PlayerProfile[];
            if (searchQuery.trim()) {
                const searchTerms = searchQuery.trim().split(/\s+/).slice(0, SEARCH_LIMIT);
                profiles = await wladderService.listSearch(searchTerms, selectedSeason);
            }
            else {
                profiles = await wladderService.getTopPlayers(selectedSeason, 100);
            }
            setPlayers(profiles);
        }
        catch (error) {
            console.error('Failed to load ladder data:', error);
            onError?.(error);
            setPlayers([]);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSearch = () => {
        loadLadderData();
    };
    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };
    return (<div className="ladder-wrapper">
      <div className="ladder-controls">
        <div className="season-select">
          <label>{strings.get("GUI:Season")}:</label>
          <Select value={selectedSeason} onChange={(value) => setSelectedSeason(Number(value))}>
            {availableSeasons.map(season => (<Option key={season} value={season}>
                {formatSeasonName(season, strings)}
              </Option>))}
          </Select>
        </div>
        
        <div className="search-controls">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={handleSearchKeyPress} placeholder={strings.get("GUI:SearchPlayers")} maxLength={200}/>
          <button onClick={handleSearch} disabled={loading}>
            {strings.get("GUI:Search")}
          </button>
        </div>
      </div>

      <div className="ladder-content">
        {loading ? (<div className="loading">{strings.get("GUI:Loading")}</div>) : (<List className="ladder-list">
            <div className="ladder-header">
              <span className="rank-col">{strings.get("GUI:Rank")}</span>
              <span className="name-col">{strings.get("GUI:Name")}</span>
              <span className="points-col">{strings.get("GUI:Points")}</span>
              <span className="wins-col">{strings.get("GUI:Wins")}</span>
              <span className="losses-col">{strings.get("GUI:Losses")}</span>
              <span className="disconnects-col">{strings.get("GUI:Disconnects")}</span>
              <span className="last-game-col">{strings.get("GUI:LastGame")}</span>
            </div>
            
            {players.map((player, index) => (<div key={player.name} className="ladder-row">
                <span className="rank-col">
                  <RankIndicator playerProfile={player} strings={strings}/>
                  {player.rank}
                </span>
                <span className="name-col">{player.name}</span>
                <span className="points-col">{player.points}</span>
                <span className="wins-col">{player.wins}</span>
                <span className="losses-col">{player.losses}</span>
                <span className="disconnects-col">{player.disconnects}</span>
                <span className="last-game-col">
                  {player.lastGameDate ? (<span title={formatTime(player.lastGameDate)}>
                      {formatDate(player.lastGameDate)}
                    </span>) : (strings.get("GUI:Never"))}
                </span>
              </div>))}
            
            {players.length === 0 && !loading && (<div className="no-results">
                {searchQuery.trim()
                    ? strings.get("GUI:NoPlayersFound")
                    : strings.get("GUI:NoLadderData")}
              </div>)}
          </List>)}
      </div>
    </div>);
};
