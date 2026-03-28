import React, { useCallback, useEffect, useState } from 'react';

export interface LanRoom {
  roomId: string;
  name: string;
  hostName: string;
  gameMode?: number;
  mapName: string;
  mapTitle: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  status: number;
  gameSpeed: number;
}

export interface LanBrowserProps {
  rooms: LanRoom[];
  playerName: string;
  serverAddress: string;
  serverPort: number;
  gameModes: { id: number; label: string }[];
  mapOptions: { fileName: string; title: string; maxPlayers: number; modeIds: number[] }[];
  defaultGameModeId: number;
  defaultMapName: string;
  isConnected: boolean;
  isConnecting: boolean;
  errorMessage: string;
  onConnect: (address: string, port: number, playerName: string) => void;
  onDisconnect: () => void;
  onCreateRoom: (request: { name: string; password?: string; gameModeId: number; mapName: string }) => void;
  onJoinRoom: (roomId: string, password?: string) => void;
  onRefresh: () => void;
}

const statusLabels: Record<number, string> = {
  0: '等待中',
  1: '加载中',
  2: '游戏中',
  3: '已结束',
};

export class LanBrowser extends React.Component<LanBrowserProps> {
  render() {
    const props = this.props;
    return (
      <div className="mp-form">
        {!props.isConnected ? (
          <LanConnectPanel {...props} />
        ) : (
          <LanRoomBrowser {...props} />
        )}
      </div>
    );
  }
}

const LanConnectPanel: React.FC<LanBrowserProps> = (props) => {
  const [address, setAddress] = useState(props.serverAddress || '');
  const [port, setPort] = useState(String(props.serverPort || 9527));
  const [playerName, setPlayerName] = useState(props.playerName || 'Player');

  useEffect(() => {
    setAddress(props.serverAddress || '');
  }, [props.serverAddress]);

  useEffect(() => {
    setPort(String(props.serverPort || 9527));
  }, [props.serverPort]);

  useEffect(() => {
    setPlayerName(props.playerName || 'Player');
  }, [props.playerName]);

  const handleConnect = useCallback(() => {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) return;
    if (!playerName.trim() || !address.trim()) return;
    props.onConnect(address.trim(), portNum, playerName.trim());
  }, [address, port, playerName, props.onConnect]);

  return (
    <div className="mp-connect-panel">
      <div className="mp-section-title">连接到局域网服务器</div>
      <div className="mp-field">
        <label className="mp-label">玩家名称</label>
        <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)}
          placeholder="输入你的名称" maxLength={20} />
      </div>
      <div className="mp-field">
        <label className="mp-label">服务器地址</label>
        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder="例如 192.168.1.10" />
      </div>
      <div className="mp-field">
        <label className="mp-label">端口</label>
        <input type="text" value={port} className="mp-input-short"
          onChange={(e) => setPort(e.target.value.replace(/\D/g, ''))}
          placeholder="9527" maxLength={5} />
      </div>
      <div className="mp-actions">
        <button className="dialog-button" onClick={handleConnect} disabled={props.isConnecting}>
          {props.isConnecting ? '连接中...' : '连接服务器'}
        </button>
      </div>
      <div className="mp-create-room-hint">局域网请填写主机电脑 IP，127.0.0.1 只表示当前这台电脑。</div>
      {props.errorMessage && <div className="mp-error">{props.errorMessage}</div>}
    </div>
  );
};

const LanRoomBrowser: React.FC<LanBrowserProps> = (props) => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createRoomName, setCreateRoomName] = useState('');
  const [createRoomPassword, setCreateRoomPassword] = useState('');
  const [createGameModeId, setCreateGameModeId] = useState(props.defaultGameModeId);
  const [createMapName, setCreateMapName] = useState(props.defaultMapName);
  const [joinPassword, setJoinPassword] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);

  const availableMaps = props.mapOptions.filter((map) => map.modeIds.includes(createGameModeId));

  useEffect(() => {
    if (!availableMaps.some((map) => map.fileName === createMapName)) {
      setCreateMapName(availableMaps[0]?.fileName ?? '');
    }
  }, [availableMaps, createMapName]);

  const handleOpenCreateDialog = useCallback(() => {
    setCreateGameModeId(props.defaultGameModeId);
    setCreateMapName(props.defaultMapName);
    setShowCreateDialog(true);
  }, [props.defaultGameModeId, props.defaultMapName]);

  const handleCreateRoom = useCallback(() => {
    if (!createRoomName.trim() || !createMapName) return;
    props.onCreateRoom({
      name: createRoomName.trim(),
      password: createRoomPassword || undefined,
      gameModeId: createGameModeId,
      mapName: createMapName,
    });
    setShowCreateDialog(false);
    setCreateRoomName('');
    setCreateRoomPassword('');
  }, [createGameModeId, createMapName, createRoomName, createRoomPassword, props.onCreateRoom]);

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

  const selectedRoomData = props.rooms.find(r => r.roomId === selectedRoom);

  return (
    <div className="mp-browser-panel">
      <div className="mp-toolbar">
        <span className="mp-status-label">已连接 - {props.playerName}</span>
        <div className="mp-toolbar-buttons">
          <button className="dialog-button" onClick={props.onRefresh}>刷新</button>
          <button className="dialog-button" onClick={handleOpenCreateDialog}>创建房间</button>
          <button className="dialog-button" onClick={props.onDisconnect}>断开</button>
        </div>
      </div>

      <div className="mp-room-list">
        <div className="mp-room-header">
          <span className="mp-col mp-col-name">房间名</span>
          <span className="mp-col mp-col-host">主机</span>
          <span className="mp-col mp-col-map">地图</span>
          <span className="mp-col mp-col-count">人数</span>
          <span className="mp-col mp-col-status">状态</span>
        </div>
        <div className="mp-room-list-body">
          {props.rooms.length === 0 ? (
            <div className="mp-empty">暂无房间，点击"创建房间"来开始游戏</div>
          ) : (
            props.rooms.map((room) => (
              <div key={room.roomId}
                className={'mp-room-row' + (selectedRoom === room.roomId ? ' selected' : '')}
                onClick={() => setSelectedRoom(room.roomId)}
                onDoubleClick={() => { setSelectedRoom(room.roomId); if (room.status === 0) handleJoinRoom(); }}>
                <span className="mp-col mp-col-name">{room.hasPassword ? '[密] ' : ''}{room.name}</span>
                <span className="mp-col mp-col-host">{room.hostName}</span>
                <span className="mp-col mp-col-map">{room.mapTitle || room.mapName}</span>
                <span className="mp-col mp-col-count">{room.playerCount}/{room.maxPlayers}</span>
                <span className="mp-col mp-col-status">{statusLabels[room.status] || '未知'}</span>
              </div>
            ))
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
            <div className="mp-field">
              <label className="mp-label">游戏类型</label>
              <select value={createGameModeId}
                onChange={(e) => setCreateGameModeId(parseInt(e.target.value, 10))}>
                {props.gameModes.map((mode) => (
                  <option key={mode.id} value={mode.id}>{mode.label}</option>
                ))}
              </select>
            </div>
            <div className="mp-field">
              <label className="mp-label">游戏地图</label>
              <select value={createMapName}
                onChange={(e) => setCreateMapName(e.target.value)}>
                {availableMaps.map((map) => (
                  <option key={map.fileName} value={map.fileName}>{map.title}</option>
                ))}
              </select>
            </div>
            {createMapName ? (
              <div className="mp-create-room-hint">
                最大玩家数: {availableMaps.find((map) => map.fileName === createMapName)?.maxPlayers ?? 0}
              </div>
            ) : null}
            <div className="mp-dialog-buttons">
              <button className="dialog-button" onClick={handleCreateRoom} disabled={!createMapName}>创建</button>
              <button className="dialog-button" onClick={() => setShowCreateDialog(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
