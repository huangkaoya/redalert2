import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { ChatHistory } from '@/gui/chat/ChatHistory';
import { List, ListItem } from '@/gui/component/List';
import { LobbyForm } from '@/gui/screen/mainMenu/lobby/component/LobbyForm';
import { LobbyType, PlayerStatus } from '@/gui/screen/mainMenu/lobby/component/viewmodel/lobby';
import { LanRecentPlayRecord } from '@/gui/screen/mainMenu/lan/LanRecentPlay';
import { RECIPIENT_ALL } from '@/network/gservConfig';
import { LanMeshSession, LanMeshSnapshot } from '@/network/lan/LanMeshSession';
import { LanRoomSession, LanRoomSnapshot } from '@/network/lan/LanRoomSession';
import { PregameController } from '@/gui/screen/mainMenu/lobby/PregameController';
import { QrCodeCard } from '@/gui/screen/mainMenu/lan/component/QrCodeCard';
import { QrScannerPanel } from '@/gui/screen/mainMenu/lan/component/QrScannerPanel';

interface Strings {
    get(key: string, ...args: any[]): string;
}

interface UiChatMessage {
    from?: string;
    to?: {
        type: number;
        name: string;
    };
    text: string;
    time?: Date;
}

interface LanSetupProps {
    strings: Strings;
    meshSession: LanMeshSession;
    roomSession: LanRoomSession;
    chatHistory: ChatHistory;
    pregameController: PregameController;
    resetNonce?: number;
    inviteNonce?: number;
    joinNonce?: number;
    recentSessions: LanRecentPlayRecord[];
    onStartGame: () => Promise<void>;
    onLeaveRoom: () => Promise<void>;
    onChangeMap: () => Promise<void>;
    onToggleReady: () => Promise<void>;
    onHostPregameChanged: () => void;
    onCommitName?: (name: string) => void;
}

const MAX_MESSAGES = 180;
function trimMessages(messages: UiChatMessage[]): UiChatMessage[] {
    if (messages.length <= MAX_MESSAGES) {
        return messages;
    }
    return messages.slice(messages.length - MAX_MESSAGES);
}

function createSystemMessage(text: string): UiChatMessage {
    return { text };
}

function createChatMessage(from: string, text: string, timestamp: number): UiChatMessage {
    return {
        from,
        to: {
            type: 0,
            name: RECIPIENT_ALL,
        },
        text,
        time: new Date(timestamp),
    };
}

function createInitialMessages(): UiChatMessage[] {
    return [];
}

function shouldSurfaceSystemLog(text: string): boolean {
    return /失败|错误|不支持|无法|超时|中断|断开|关闭|拒绝|异常/i.test(text);
}

function describeRoomTone(roomSnapshot: LanRoomSnapshot): 'good' | 'warn' | 'bad' {
    if (roomSnapshot.canStart) {
        return 'good';
    }
    if (roomSnapshot.isRoomActive || roomSnapshot.mesh.isInRoom) {
        return 'warn';
    }
    return 'bad';
}

function describeCompactRoomState(roomSnapshot: LanRoomSnapshot): string {
    if (!roomSnapshot.isRoomActive) {
        return '等待房主同步';
    }
    if (roomSnapshot.canStart) {
        return '连接完成';
    }
    if (roomSnapshot.roomState && !roomSnapshot.roomState.gameOpts.mapOfficial) {
        return '等待地图同步';
    }
    return '等待成员互联';
}

function describeMemberRoleTone(member: LanRoomSnapshot['members'][number]): 'good' | 'warn' | 'bad' {
    if (member.isHost || member.ready) {
        return 'good';
    }
    return member.isConnected ? 'warn' : 'bad';
}

function describeCustomMapTransfer(roomSnapshot: LanRoomSnapshot): { text: string; tone: 'good' | 'warn' | 'bad' } | undefined {
    if (!roomSnapshot.roomState || roomSnapshot.roomState.gameOpts.mapOfficial) {
        return undefined;
    }

    const failedMember = roomSnapshot.members.find((member) => member.mapTransfer.status === 'error');
    if (failedMember) {
        return {
            text: `地图同步失败: ${failedMember.name}`,
            tone: 'bad',
        };
    }

    const completedCount = roomSnapshot.members.filter((member) => member.mapTransfer.status === 'complete').length;
    if (completedCount >= roomSnapshot.members.length && roomSnapshot.members.length > 0) {
        return {
            text: '地图同步完成',
            tone: 'good',
        };
    }

    return {
        text: `地图同步 ${completedCount}/${roomSnapshot.members.length}`,
        tone: 'warn',
    };
}

function formatRecentTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
}

function describeRecentRole(role: LanRecentPlayRecord['role']): string {
    return role === 'host' ? '房主' : '成员';
}

function formatMemberSummary(record: LanRecentPlayRecord): string {
    if (!record.memberNames.length) {
        return `${record.memberCount} 人房间`;
    }
    const visibleMembers = record.memberNames.slice(0, 3).join('、');
    if (record.memberNames.length > 3) {
        return `${visibleMembers} 等 ${record.memberCount} 人`;
    }
    return `${visibleMembers} · ${record.memberCount} 人`;
}

export const LanSetup: React.FC<LanSetupProps> = ({
    meshSession,
    roomSession,
    chatHistory,
    pregameController,
    resetNonce = 0,
    inviteNonce = 0,
    joinNonce = 0,
    recentSessions,
    onHostPregameChanged,
    onCommitName,
}) => {
    const [meshSnapshot, setMeshSnapshot] = useState<LanMeshSnapshot>(meshSession.getSnapshot());
    const [roomSnapshot, setRoomSnapshot] = useState<LanRoomSnapshot>(roomSession.getSnapshot());
    const [messages, setMessages] = useState<UiChatMessage[]>(() => {
        const existingMessages = chatHistory.getAll() as UiChatMessage[];
        if (existingMessages.length > 0) {
            return existingMessages;
        }
        const initialMessages = createInitialMessages();
        initialMessages.forEach((message) => chatHistory.addChatMessage(message));
        return initialMessages;
    });
    const [nameInput, setNameInput] = useState(meshSession.getSnapshot().self.name);
    const [manualPayloadText, setManualPayloadText] = useState('');
    const [manualResponsePayloadText, setManualResponsePayloadText] = useState('');
    const [busy, setBusy] = useState(false);
    const [clipboardHint, setClipboardHint] = useState<string>();
    const [joinDialogOpen, setJoinDialogOpen] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [showAdvancedJoin, setShowAdvancedJoin] = useState(false);
    const [showAdvancedInvite, setShowAdvancedInvite] = useState(false);
    const lastResetNonceRef = useRef(resetNonce);
    const lastInviteNonceRef = useRef(inviteNonce);
    const lastJoinNonceRef = useRef(joinNonce);
    const appMessageLogRef = useRef<any[]>([]);

    const supported = typeof RTCPeerConnection !== 'undefined';

    const appendMessage = (message: UiChatMessage) => {
        chatHistory.addChatMessage(message);
        startTransition(() => {
            setMessages((current) => trimMessages([...current, message]));
        });
    };

    const replaceMessages = (nextMessages: UiChatMessage[]) => {
        chatHistory.reset();
        nextMessages.forEach((message) => chatHistory.addChatMessage(message));
        startTransition(() => {
            setMessages(nextMessages);
        });
    };

    const appendSystemMessage = (text: string) => {
        appendMessage(createSystemMessage(text));
    };

    useEffect(() => {
        const handleMeshSnapshot = (nextSnapshot: LanMeshSnapshot) => {
            setMeshSnapshot(nextSnapshot);
            setNameInput((current) => (current === meshSnapshot.self.name ? nextSnapshot.self.name : current));
        };
        const handleRoomSnapshot = (nextSnapshot: LanRoomSnapshot) => {
            setRoomSnapshot(nextSnapshot);
        };
        const handleMeshLog = (entry: { text: string }) => {
            if (shouldSurfaceSystemLog(entry.text)) {
                appendSystemMessage(entry.text);
            }
        };
        const handleRoomLog = (entry: { text: string }) => {
            if (shouldSurfaceSystemLog(entry.text)) {
                appendSystemMessage(entry.text);
            }
        };
        const handleChat = (entry: { from: { name: string }; text: string; timestamp: number }) => {
            appendMessage(createChatMessage(entry.from.name, entry.text, entry.timestamp));
        };
        const handleAppMessage = (entry: { from: unknown; payload: unknown; timestamp: number }) => {
            appMessageLogRef.current = [...appMessageLogRef.current.slice(-49), {
                from: entry.from,
                payload: entry.payload,
                timestamp: entry.timestamp,
            }];
        };

        meshSession.onSnapshotChange.subscribe(handleMeshSnapshot);
        roomSession.onSnapshotChange.subscribe(handleRoomSnapshot);
        meshSession.onLog.subscribe(handleMeshLog);
        roomSession.onLog.subscribe(handleRoomLog);
        meshSession.onChat.subscribe(handleChat);
        meshSession.onAppMessage.subscribe(handleAppMessage);

        return () => {
            meshSession.onSnapshotChange.unsubscribe(handleMeshSnapshot);
            roomSession.onSnapshotChange.unsubscribe(handleRoomSnapshot);
            meshSession.onLog.unsubscribe(handleMeshLog);
            roomSession.onLog.unsubscribe(handleRoomLog);
            meshSession.onChat.unsubscribe(handleChat);
            meshSession.onAppMessage.unsubscribe(handleAppMessage);
        };
    }, [chatHistory, meshSession, roomSession, meshSnapshot.self.name]);

    useEffect(() => {
        if (lastResetNonceRef.current === resetNonce) {
            return;
        }
        lastResetNonceRef.current = resetNonce;
        setManualPayloadText('');
        setManualResponsePayloadText('');
        setClipboardHint(undefined);
        setJoinDialogOpen(false);
        setInviteDialogOpen(false);
        setShowAdvancedJoin(false);
        setShowAdvancedInvite(false);
        const nextSnapshot = meshSession.getSnapshot();
        setMeshSnapshot(nextSnapshot);
        setRoomSnapshot(roomSession.getSnapshot());
        setNameInput(nextSnapshot.self.name);
        replaceMessages(createInitialMessages());
    }, [meshSession, resetNonce, roomSession]);

    useEffect(() => {
        if (lastInviteNonceRef.current === inviteNonce) {
            return;
        }
        lastInviteNonceRef.current = inviteNonce;
        setInviteDialogOpen(true);
    }, [inviteNonce]);

    useEffect(() => {
        if (lastJoinNonceRef.current === joinNonce) {
            return;
        }
        lastJoinNonceRef.current = joinNonce;
        setJoinDialogOpen(true);
    }, [joinNonce]);

    useEffect(() => {
        if (inviteDialogOpen && meshSnapshot.isInRoom) {
            void handleCreateInvite();
        }
    }, [inviteDialogOpen, meshSnapshot.isInRoom]);

    useEffect(() => {
        if (!inviteDialogOpen || roomSnapshot.canInvite) {
            return;
        }
        setInviteDialogOpen(false);
        setShowAdvancedInvite(false);
        setClipboardHint(undefined);
    }, [inviteDialogOpen, roomSnapshot.canInvite]);

    useEffect(() => {
        if (roomSnapshot.isRoomActive && joinDialogOpen) {
            setJoinDialogOpen(false);
            setShowAdvancedJoin(false);
        }
    }, [joinDialogOpen, roomSnapshot.isRoomActive]);

    useEffect(() => {
        const debugRoot = ((window as any).__ra2debug ??= {});
        debugRoot.lan = {
            meshSnapshot,
            roomSnapshot,
        };
        debugRoot.lanApi = {
            sendAppMessage: (payload: unknown) => meshSession.broadcastAppMessage(payload),
            getAppMessages: () => appMessageLogRef.current.slice(),
        };
    }, [meshSnapshot, roomSnapshot]);

    const commitName = () => {
        meshSession.updateSelfName(nameInput);
        const nextSelf = meshSession.getSnapshot().self;
        setMeshSnapshot(meshSession.getSnapshot());
        setNameInput(nextSelf.name);
        onCommitName?.(nextSelf.name);
        if (roomSnapshot.isHost && roomSnapshot.roomState) {
            pregameController.updateSelfName(nextSelf.name);
            onHostPregameChanged();
        }
    };

    const handleCreateInvite = async () => {
        if (!supported) {
            appendSystemMessage('当前浏览器不支持 WebRTC。');
            return;
        }
        if (!roomSession.getSnapshot().canInvite) {
            appendSystemMessage('当前没有空闲玩家槽位，请先打开一个空位后再邀请。');
            return;
        }
        setBusy(true);
        try {
            commitName();
            await meshSession.createRoomInvite();
            setMeshSnapshot(meshSession.getSnapshot());
            setClipboardHint(undefined);
        }
        catch (error) {
            appendSystemMessage((error as Error).message);
        }
        finally {
            setBusy(false);
        }
    };

    const handleImportPayload = async (payloadText?: string) => {
        if (!supported) {
            appendSystemMessage('当前浏览器不支持 WebRTC。');
            return;
        }
        const nextPayload = (payloadText ?? manualPayloadText).trim();
        if (!nextPayload) {
            appendSystemMessage('请先扫码，或者把二维码内容粘贴到文本框里。');
            return;
        }
        setBusy(true);
        try {
            commitName();
            await meshSession.importPayload(nextPayload);
            setMeshSnapshot(meshSession.getSnapshot());
            setManualPayloadText(nextPayload);
            setClipboardHint(undefined);
        }
        catch (error) {
            appendSystemMessage((error as Error).message);
            throw error;
        }
        finally {
            setBusy(false);
        }
    };

    const handleCopyPayload = async () => {
        if (!meshSnapshot.activeQrPayloadText) {
            appendSystemMessage('当前没有可复制的二维码内容。');
            return;
        }
        try {
            await navigator.clipboard.writeText(meshSnapshot.activeQrPayloadText);
            setClipboardHint('已复制到剪贴板');
            appendSystemMessage('二维码内容已复制到剪贴板。');
        }
        catch {
            setClipboardHint('复制失败，请手动复制');
            appendSystemMessage('浏览器不允许写入剪贴板，请手动复制。');
        }
    };

    const handlePastePayload = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setManualPayloadText(text);
            appendSystemMessage('已从剪贴板读取二维码内容。');
        }
        catch {
            appendSystemMessage('浏览器不允许读取剪贴板，请手动粘贴。');
        }
    };

    const handleSendMessage = async ({ value }: { value: string }) => {
        try {
            await meshSession.sendChat(value);
        }
        catch (error) {
            appendSystemMessage((error as Error).message);
        }
    };

    const submitChatMessage = (message: any) => {
        const value = typeof message === 'string' ? message : message?.value;
        if (typeof value === 'string' && value.trim()) {
            void handleSendMessage({ value });
        }
    };

    const waitingMode = roomSnapshot.isRoomActive || meshSnapshot.isInRoom;
    const selfAssignment = roomSnapshot.roomState?.humanAssignments.find((assignment) => assignment.peerId === meshSnapshot.self.id);
    const activeSlotIndex = selfAssignment?.slotIndex ?? 0;
    const selfMember = roomSnapshot.members.find((member) => member.isSelf);
    const customMapTransfer = describeCustomMapTransfer(roomSnapshot);
    const latestRecentSession = recentSessions[0];
    const waitingStatusStrip = waitingMode ? (
        <div className="lan-room-status-strip">
            <div className="lan-status-chip">
                房间号 <strong>{meshSnapshot.roomId ?? '--'}</strong>
            </div>
            <div className="lan-status-chip">
                成员 <strong data-lan-stat="members">{roomSnapshot.members.length || meshSnapshot.members.length}</strong>
                <span className="lan-status-divider">/</span>
                直连 <strong data-lan-stat="direct-peers">{meshSnapshot.directPeerCount}</strong>
            </div>
            <div className={`lan-status-chip tone-${describeRoomTone(roomSnapshot)}`}>
                {describeCompactRoomState(roomSnapshot)}
            </div>
            {selfMember ? (
                <div className={`lan-status-chip tone-${describeMemberRoleTone(selfMember)}`}>
                    {selfMember.isHost ? '你是房主' : selfMember.ready ? '已准备' : '未准备'}
                </div>
            ) : null}
            {customMapTransfer ? (
                <div className={`lan-status-chip tone-${customMapTransfer.tone}`}>
                    {customMapTransfer.text}
                </div>
            ) : null}
        </div>
    ) : null;

    const formProps = useMemo(() => {
        if (!roomSnapshot.roomState) {
            return undefined;
        }

        pregameController.hydrate({
            gameOpts: roomSnapshot.roomState.gameOpts,
            slotsInfo: roomSnapshot.roomState.slotsInfo,
            currentMapFile: roomSession.getResolvedCustomMapFile(),
        });

        const baseProps = pregameController.createLobbyFormProps({
            lobbyType: roomSnapshot.isHost ? LobbyType.MultiplayerHost : LobbyType.MultiplayerGuest,
            activeSlotIndex,
            messages,
            localUsername: meshSnapshot.self.name,
            channels: [RECIPIENT_ALL],
            chatHistory: chatHistory as any,
            onSendMessage: submitChatMessage,
            onStateChange: roomSnapshot.isHost ? onHostPregameChanged : undefined,
            decoratePlayerSlot: (playerSlot: any, _slotInfo: any, slotIndex: number) => {
                const assignment = roomSnapshot.roomState?.humanAssignments.find((candidate) => candidate.slotIndex === slotIndex);
                if (!assignment) {
                    return;
                }
                const member = roomSnapshot.members.find((candidate) => candidate.peerId === assignment.peerId);
                playerSlot.status = member?.isHost
                    ? PlayerStatus.Host
                    : member?.ready
                        ? PlayerStatus.Ready
                        : PlayerStatus.NotReady;
            },
        });

        if (!roomSnapshot.isHost && selfAssignment) {
            const requestOwnSlotConfig = (updater: (slot: any) => { countryId: number; colorId: number; startPos: number; teamId: number }) => {
                const slot = baseProps.playerSlots[selfAssignment.slotIndex];
                const next = updater(slot);
                void roomSession.requestSlotConfig(selfAssignment.slotIndex, next);
            };
            baseProps.onCountrySelect = (country: string) => {
                requestOwnSlotConfig((slot) => ({
                    countryId: pregameController.getCountryIdByName(country),
                    colorId: pregameController.getColorIdByName(slot.color),
                    startPos: slot.startPos,
                    teamId: slot.team,
                }));
            };
            baseProps.onColorSelect = (color: string) => {
                requestOwnSlotConfig((slot) => ({
                    countryId: pregameController.getCountryIdByName(slot.country),
                    colorId: pregameController.getColorIdByName(color),
                    startPos: slot.startPos,
                    teamId: slot.team,
                }));
            };
            baseProps.onStartPosSelect = (startPos: number) => {
                requestOwnSlotConfig((slot) => ({
                    countryId: pregameController.getCountryIdByName(slot.country),
                    colorId: pregameController.getColorIdByName(slot.color),
                    startPos,
                    teamId: slot.team,
                }));
            };
            baseProps.onTeamSelect = (teamId: number) => {
                requestOwnSlotConfig((slot) => ({
                    countryId: pregameController.getCountryIdByName(slot.country),
                    colorId: pregameController.getColorIdByName(slot.color),
                    startPos: slot.startPos,
                    teamId,
                }));
            };
        }

        return baseProps;
    }, [activeSlotIndex, chatHistory, meshSnapshot.self.id, meshSnapshot.self.name, messages, onHostPregameChanged, pregameController, roomSession, roomSnapshot, selfAssignment]);

    return (
        <div className="lobby-form lan-setup-form lan-room-form" data-lan-view={waitingMode ? 'waiting' : 'entry'}>
            {!supported ? (
                <div className="lan-panel">
                    <h3>环境不支持</h3>
                    <p>当前浏览器没有可用的 WebRTC 实现，无法在这个页面里建立局域网连接。</p>
                </div>
            ) : !waitingMode ? (
                <div className="lan-entry-layout">
                    <div className="lan-panel lan-entry-panel lan-entry-profile-panel">
                        <div className="lan-panel-header">
                            <h3>玩家信息</h3>
                            <span>右侧菜单负责创建和加入，这里只保留你的局域网档案。</span>
                        </div>
                        <div className="lan-entry-profile-grid">
                            <div className="lan-entry-profile-editor">
                                <label className="lan-input-label" htmlFor="lan-self-name">
                                    玩家名称
                                </label>
                                <input
                                    id="lan-self-name"
                                    type="text"
                                    className="lan-text-input"
                                    maxLength={24}
                                    value={nameInput}
                                    data-lan-input="self-name"
                                    onChange={(event) => setNameInput(event.target.value)}
                                    onBlur={commitName}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            commitName();
                                        }
                                    }}
                                />
                                <div className="lan-entry-field-hint">
                                    房间成员列表、聊天和开局后的玩家槽位都会使用这个名字。
                                </div>
                            </div>

                            <div className="lan-entry-profile-stats">
                                <div className="lan-entry-stat">
                                    <span>当前身份</span>
                                    <strong>{meshSnapshot.self.name}</strong>
                                </div>
                                <div className="lan-entry-stat">
                                    <span>浏览器支持</span>
                                    <strong className={supported ? 'tone-good' : 'tone-bad'}>
                                        {supported ? 'WebRTC 可用' : '不可用'}
                                    </strong>
                                </div>
                                <div className="lan-entry-stat">
                                    <span>最近房间</span>
                                    <strong>{latestRecentSession?.roomId ?? '--'}</strong>
                                </div>
                                <div className="lan-entry-stat">
                                    <span>最近模式</span>
                                    <strong>{latestRecentSession?.modeLabel ?? '暂无记录'}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lan-panel lan-entry-panel lan-entry-recent-panel">
                        <div className="lan-panel-header">
                            <h3>最近参与</h3>
                            <span>{recentSessions.length ? `本机保留最近 ${recentSessions.length} 次开局记录。` : '完成一次开局后会自动记录在这里。'}</span>
                        </div>
                        {recentSessions.length ? (
                            <List className="lan-entry-recent-list">
                                {recentSessions.map((record) => (
                                    <ListItem className="lan-entry-recent-item" key={record.gameId}>
                                        <div className="lan-entry-recent-item-top">
                                            <strong>{record.mapTitle}</strong>
                                            <span>{formatRecentTimestamp(record.timestamp)}</span>
                                        </div>
                                        <div className="lan-entry-recent-item-meta">
                                            <span className="lan-entry-recent-chip">{describeRecentRole(record.role)}</span>
                                            <span>{record.modeLabel}</span>
                                            <span>房间 {record.roomId}</span>
                                            <span>{record.mapOfficial ? '官方地图' : '自定义地图'}</span>
                                        </div>
                                        <div className="lan-entry-recent-item-members">
                                            {formatMemberSummary(record)}
                                        </div>
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <div className="lan-entry-empty-state">
                                右侧可以直接创建房间或加入房间。完成一次联机开局后，最近参与记录会显示在这里。
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="lan-waiting-main">
                    {formProps ? (
                        <div className="lan-room-form-shell lan-room-form-shell-compact">
                            <LobbyForm {...formProps} beforeChatContent={waitingStatusStrip} />
                        </div>
                    ) : (
                        <div className="lan-panel lan-room-loading-panel lan-room-loading-panel-compact">
                            正在接收房间配置...
                        </div>
                    )}
                </div>
            )}

            {inviteDialogOpen ? (
                <div className="lan-dialog-overlay" onClick={() => setInviteDialogOpen(false)}>
                    <div className="lan-dialog" onClick={(event) => event.stopPropagation()}>
                        <div className="lan-dialog-header">
                            <h3>邀请其他玩家</h3>
                            <button type="button" className="lan-dialog-close" onClick={() => setInviteDialogOpen(false)}>
                                ×
                            </button>
                        </div>
                            <div className="lan-dialog-body">
                                <div className="lan-dialog-grid">
                                    <div className="lan-panel">
                                        <div className="lan-panel-header">
                                            <h3>邀请二维码</h3>
                                            <span>新玩家先扫这张码。</span>
                                        </div>
                                        <QrCodeCard
                                            title={meshSnapshot.activeQrPayloadTitle ?? '邀请二维码'}
                                            description={meshSnapshot.activeQrPayloadDescription ?? '等待生成二维码。'}
                                            payloadText={meshSnapshot.activeQrPayloadText}
                                        />
                                        <textarea
                                            className="lan-sdp-textarea"
                                            readOnly={true}
                                            value={meshSnapshot.activeQrPayloadText}
                                            data-lan-output="active-payload"
                                            placeholder="二维码原始内容。"
                                        />
                                        <div className="lan-actions">
                                            <button
                                                type="button"
                                                className="dialog-button"
                                                data-lan-action="create-or-invite"
                                                disabled={busy}
                                                onClick={() => {
                                                    void handleCreateInvite();
                                                }}
                                            >
                                                重新生成邀请二维码
                                            </button>
                                            <button
                                                type="button"
                                                className="dialog-button"
                                                disabled={!meshSnapshot.activeQrPayloadText}
                                                data-lan-action="copy-payload"
                                                onClick={() => {
                                                    void handleCopyPayload();
                                                }}
                                            >
                                                复制二维码内容
                                            </button>
                                            {clipboardHint ? <span className="lan-hint">{clipboardHint}</span> : null}
                                        </div>
                                    </div>

                                    <div className="lan-panel">
                                        <div className="lan-panel-header">
                                            <h3>接收加入响应</h3>
                                            <span>新玩家扫完邀请后，把响应码扫回这里。</span>
                                        </div>
                                        <QrScannerPanel
                                            onDetected={async (payloadText) => {
                                                await handleImportPayload(payloadText);
                                            }}
                                        />
                                        <div className="lan-actions">
                                            <button
                                                type="button"
                                                className="dialog-button"
                                                data-lan-action="toggle-invite-manual"
                                                onClick={() => setShowAdvancedInvite((current) => !current)}
                                            >
                                                {showAdvancedInvite ? '隐藏高级方式' : '显示高级方式'}
                                            </button>
                                        </div>
                                        {showAdvancedInvite ? (
                                            <>
                                                <textarea
                                                    className="lan-sdp-textarea"
                                                    value={manualResponsePayloadText}
                                                    data-lan-input="invite-response-payload"
                                                    onChange={(event) => setManualResponsePayloadText(event.target.value)}
                                                    placeholder="把加入响应二维码内容粘贴到这里，然后点击导入。"
                                                />
                                                <div className="lan-actions">
                                                    <button
                                                        type="button"
                                                        className="dialog-button"
                                                        data-lan-action="import-invite-response"
                                                        disabled={busy}
                                                        onClick={() => {
                                                            void handleImportPayload(manualResponsePayloadText).catch(() => undefined);
                                                        }}
                                                    >
                                                        导入加入响应
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="dialog-button"
                                                        disabled={busy}
                                                        onClick={async () => {
                                                            try {
                                                                const text = await navigator.clipboard.readText();
                                                                setManualResponsePayloadText(text);
                                                                appendSystemMessage('已从剪贴板读取加入响应。');
                                                            }
                                                            catch {
                                                                appendSystemMessage('浏览器不允许读取剪贴板，请手动粘贴。');
                                                            }
                                                        }}
                                                    >
                                                        从剪贴板粘贴
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="dialog-button"
                                                        disabled={!manualResponsePayloadText}
                                                        onClick={() => setManualResponsePayloadText('')}
                                                    >
                                                        清空
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="lan-join-hint">优先扫码，只有需要排障时再展开高级方式。</p>
                                        )}
                                    </div>
                                </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {joinDialogOpen ? (
                <div className="lan-dialog-overlay" onClick={() => setJoinDialogOpen(false)}>
                    <div className="lan-dialog lan-dialog-wide" onClick={(event) => event.stopPropagation()}>
                        <div className="lan-dialog-header">
                            <h3>加入房间</h3>
                            <button type="button" className="lan-dialog-close" onClick={() => setJoinDialogOpen(false)}>
                                ×
                            </button>
                        </div>
                        <div className="lan-dialog-body">
                            {meshSnapshot.activeQrPayloadKind === 'join-response' ? (
                                <div className="lan-panel">
                                    <div className="lan-panel-header">
                                        <h3>加入响应二维码</h3>
                                        <span>把这张码给房主扫描即可。</span>
                                    </div>
                                    <QrCodeCard
                                        title={meshSnapshot.activeQrPayloadTitle ?? '加入响应二维码'}
                                        description={meshSnapshot.activeQrPayloadDescription ?? '等待房主扫描这张二维码。'}
                                        payloadText={meshSnapshot.activeQrPayloadText}
                                    />
                                    <textarea
                                        className="lan-sdp-textarea"
                                        readOnly={true}
                                        value={meshSnapshot.activeQrPayloadText}
                                        data-lan-output="active-payload"
                                        placeholder="响应二维码原始内容。"
                                    />
                                    <div className="lan-actions">
                                        <button
                                            type="button"
                                            className="dialog-button"
                                            disabled={!meshSnapshot.activeQrPayloadText}
                                            onClick={() => {
                                                void handleCopyPayload();
                                            }}
                                        >
                                            复制响应内容
                                        </button>
                                        {clipboardHint ? <span className="lan-hint">{clipboardHint}</span> : null}
                                    </div>
                                </div>
                            ) : null}

                            <div className="lan-dialog-grid">
                                <QrScannerPanel
                                    onDetected={async (payloadText) => {
                                        await handleImportPayload(payloadText);
                                    }}
                                />

                                <div className="lan-panel">
                                    <div className="lan-panel-header">
                                        <h3>回退方式</h3>
                                        <span>无法扫码时改为粘贴文本。</span>
                                    </div>
                                    <div className="lan-actions">
                                        <button
                                            type="button"
                                            className="dialog-button"
                                            data-lan-action="toggle-manual"
                                            onClick={() => setShowAdvancedJoin((current) => !current)}
                                        >
                                            {showAdvancedJoin ? '隐藏高级方式' : '显示高级方式'}
                                        </button>
                                    </div>
                                    {showAdvancedJoin ? (
                                        <>
                                            <textarea
                                                className="lan-sdp-textarea"
                                                value={manualPayloadText}
                                                data-lan-input="manual-payload"
                                                onChange={(event) => setManualPayloadText(event.target.value)}
                                                placeholder="把二维码内容粘贴到这里，然后点击导入。"
                                            />
                                            <div className="lan-actions">
                                                <button
                                                    type="button"
                                                    className="dialog-button"
                                                    data-lan-action="import-payload"
                                                    disabled={busy}
                                                    onClick={() => {
                                                        void handleImportPayload().catch(() => undefined);
                                                    }}
                                                >
                                                    导入二维码内容
                                                </button>
                                                <button
                                                    type="button"
                                                    className="dialog-button"
                                                    disabled={busy}
                                                    onClick={() => {
                                                        void handlePastePayload();
                                                    }}
                                                >
                                                    从剪贴板粘贴
                                                </button>
                                                <button
                                                    type="button"
                                                    className="dialog-button"
                                                    disabled={!manualPayloadText}
                                                    onClick={() => setManualPayloadText('')}
                                                >
                                                    清空
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="lan-join-hint">默认扫码即可，高级方式只作兜底。</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
