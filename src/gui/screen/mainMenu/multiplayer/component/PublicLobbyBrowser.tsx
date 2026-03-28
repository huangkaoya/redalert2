import React, { useState, useCallback } from 'react';

export interface PublicRoom {
  roomId: string;
  name: string;
  hostName: string;
  mapName: string;
  mapTitle: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  status: number;
  gameSpeed: number;
  ping: number;
}

export interface PublicLobbyBrowserProps {
  rooms: PublicRoom[];
  playerName: string;
  serverUrl: string;
  isConnected: boolean;
  isConnecting: boolean;
  errorMessage: string;
  onConnect: (serverUrl: string, playerName: string) => void;
  onDisconnect: () => void;
  onCreateRoom: (name: string, password?: string) => void;
  onJoinRoom: (roomId: string, password?: string) => void;
  onRefresh: () => void;
}

const statusLabels: Record<number, string> = {
  0: '等待中',
  1: '加载中',
  2: '游戏中',
  3: '已结束',
};

export class PublicLobbyBrowser extends React.Component<PublicLobbyBrowserProps> {
  render() {
    const props = this.props;
    return (
      <div className="mp-form">
        {!props.isConnected ? (
          <PublicConnectPanel {...props} />
        ) : (
          <PublicRoomBrowser {...props} />
        )}
      </div>
    );
  }
}

const PublicConnectPanel: React.FC<PublicLobbyBrowserProps> = (props) => {
  const [serverUrl, setServerUrl] = useState(props.serverUrl || '');
  const [playerName, setPlayerName] = useState(props.playerName || 'Player');

  const handleConnect = useCallback(() => {
    if (!serverUrl.trim() || !playerName.trim()) return;
    props.onConnect(serverUrl.trim(), playerName.trim());
  }, [serverUrl, playerName, props.onConnect]);

  return (
    <div className="mp-connect-panel">
      <div className="mp-section-title">连接到公网服务器</div>
      <div className="mp-field">
        <label className="mp-label">玩家名称</label>
        <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)}
          placeholder="输入你的名称" maxLength={20} />
      </div>
      <div className="mp-field">
        <label className="mp-label">服务器地址</label>
        <input type="url" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)}
          placeholder="wss://server.example.com/ws" />
      </div>
      <div className="mp-actions">
        <button className="dialog-button" onClick={handleConnect} disabled={props.isConnecting}>
          {props.isConnecting ? '连接中...' : '连接服务器'}
        </button>
      </div>
      {props.errorMessage && <div className="mp-error">{props.errorMessage}</div>}
    </div>
  );
};

const PublicRoomBrowser: React.FC<PublicLobbyBrowserProps> = (props) => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createRoomName, setCreateRoomName] = useState('');
  const [createRoomPassword, setCreateRoomPassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [filter, setFilter] = useState('');

  const handleCreateRoom = useCallback(() => {
    if (!createRoomName.trim()) return;
    props.onCreateRoom(createRoomName.trim(), createRoomPassword || undefined);
    setShowCreateDialog(false);
    setCreateRoomName('');
    setCreateRoomPassword('');
  }, [createRoomName, createRoomPassword, props.onCreateRoom]);

  const handleJoinRoom = useCallback(() => {
    if (!selectedRoom) return;
    const room = props.rooms.find(r => r.roomId === selectedRoom);
    if (!room || room.status !== 0) return;
    if (room.hasPassword && !showJoinPassword) {
      setShowJoinPassword(true);
      return;
    }
    props.onJoinRoom(selectedRoom, joinPassword || undefined);
    setJoinPassword('');
    setShowJoinPassword(false);
  }, [selectedRoom, joinPassword, showJoinPassword, props.rooms, props.onJoinRoom]);

  const filteredRooms = filter
    ? props.rooms.filter(r =>
        r.name.toLowerCase().includes(filter.toLowerCase()) ||
        r.hostName.toLowerCase().includes(filter.toLowerCase()) ||
        r.mapTitle.toLowerCase().includes(filter.toLowerCase()))
    : props.rooms;

  const waitingRooms = filteredRooms.filter(r => r.status === 0);
  const otherRooms = filteredRooms.filter(r => r.status !== 0);
  const selectedRoomData = props.rooms.find(r => r.roomId === selectedRoom);

  return (
    <div className="mp-browser-panel">
      <div className="mp-toolbar">
        <span className="mp-status-label">已连接 - {props.playerName}</span>
        <div className="mp-toolbar-buttons">
          <input type="text" value={filter} className="mp-input-short"
            onChange={(e) => setFilter(e.target.value)} placeholder="搜索..." />
          <button className="dialog-button" onClick={props.onRefresh}>刷新</button>
          <button className="dialog-button" onClick={() => setShowCreateDialog(true)}>创建房间</button>
          <button className="dialog-button" onClick={props.onDisconnect}>断开</button>
        </div>
      </div>

      <div className="mp-room-list">
        <div className="mp-room-header">
          <span className="mp-col mp-col-name">房间名</span>
          <span className="mp-col mp-col-host">主机</span>
          <span className="mp-col mp-col-map">地图</span>
          <span className="mp-col mp-col-count">人数</span>
          <span className="mp-col mp-col-ping">延迟</span>
          <span className="mp-col mp-col-status">状态</span>
        </div>
        <div className="mp-room-list-body">
          {filteredRooms.length === 0 ? (
            <div className="mp-empty">暂无房间</div>
          ) : (
            <>
              {waitingRooms.map((room) => (
                <div key={room.roomId}
                  className={'mp-room-row' + (selectedRoom === room.roomId ? ' selected' : '')}
                  onClick={() => setSelectedRoom(room.roomId)}
                  onDoubleClick={() => { setSelectedRoom(room.roomId); handleJoinRoom(); }}>
                  <span className="mp-col mp-col-name">{room.hasPassword ? '[密] ' : ''}{room.name}</span>
                  <span className="mp-col mp-col-host">{room.hostName}</span>
                  <span className="mp-col mp-col-map">{room.mapTitle || room.mapName}</span>
                  <span className="mp-col mp-col-count">{room.playerCount}/{room.maxPlayers}</span>
                  <span className={'mp-col mp-col-ping' + pingClass(room.ping)}>{room.ping}ms</span>
                  <span className="mp-col mp-col-status">{statusLabels[room.status] || '未知'}</span>
                </div>
              ))}
              {otherRooms.length > 0 && waitingRooms.length > 0 && (
                <div className="mp-room-separator">进行中的游戏</div>
              )}
              {otherRooms.map((room) => (
                <div key={room.roomId}
                  className={'mp-room-row mp-room-inactive' + (selectedRoom === room.roomId ? ' selected' : '')}
                  onClick={() => setSelectedRoom(room.roomId)}>
                  <span className="mp-col mp-col-name">{room.hasPassword ? '[密] ' : ''}{room.name}</span>
                  <span className="mp-col mp-col-host">{room.hostName}</span>
                  <span className="mp-col mp-col-map">{room.mapTitle || room.mapName}</span>
                  <span className="mp-col mp-col-count">{room.playerCount}/{room.maxPlayers}</span>
                  <span className="mp-col mp-col-ping">-</span>
                  <span className="mp-col mp-col-status">{statusLabels[room.status] || '未知'}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {selectedRoomData && (
        <div className="mp-room-info">
          <span>已选: {selectedRoomData.name} ({selectedRoomData.playerCount}/{selectedRoomData.maxPlayers})</span>
          {showJoinPassword && (
            <input type="password" value={joinPassword} className="mp-input-short"
              onChange={(e) => setJoinPassword(e.target.value)} placeholder="输入密码" />
          )}
          <button className="dialog-button" onClick={handleJoinRoom}
            disabled={selectedRoomData.status !== 0}>加入房间</button>
        </div>
      )}

      <div className="mp-stats">
        房间: {props.rooms.length} | 等待中: {waitingRooms.length}
      </div>

      {showCreateDialog && (
        <div className="mp-overlay">
          <div className="mp-dialog">
            <div className="mp-section-title">创建房间</div>
            <div className="mp-field">
              <label className="mp-label">房间名</label>
              <input type="text" value={createRoomName}
                onChange={(e) => setCreateRoomName(e.target.value)}
                placeholder="输入房间名称" maxLength={32} />
            </div>
            <div className="mp-field">
              <label className="mp-label">密码 (可选)</label>
              <input type="password" value={createRoomPassword}
                onChange={(e) => setCreateRoomPassword(e.target.value)}
                placeholder="留空则无密码" maxLength={16} />
            </div>
            <div className="mp-dialog-buttons">
              <button className="dialog-button" onClick={handleCreateRoom}>创建</button>
              <button className="dialog-button" onClick={() => setShowCreateDialog(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function pingClass(ping: number): string {
  if (ping < 50) return ' mp-ping-good';
  if (ping < 100) return ' mp-ping-ok';
  if (ping < 200) return ' mp-ping-warn';
  return ' mp-ping-bad';
}
