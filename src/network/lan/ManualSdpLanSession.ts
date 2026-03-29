import { EventDispatcher } from '@/util/event';
import { formatSdpCandidateSummary, getSdpCandidateWarning, summarizeSdpCandidates } from './SdpCandidateDiagnostics';

export type ManualLanRole = 'host' | 'guest';

export interface ManualLanSnapshot {
    role?: ManualLanRole;
    localDescriptionText: string;
    remoteDescriptionApplied: boolean;
    connectionState: RTCPeerConnectionState;
    iceConnectionState: RTCIceConnectionState;
    iceGatheringState: RTCIceGatheringState;
    signalingState: RTCSignalingState;
    channelState: RTCDataChannelState | 'closed';
}

export interface ManualLanLogEntry {
    level: 'info' | 'warn' | 'error';
    text: string;
    timestamp: number;
}

export interface ManualLanMessage {
    from: string;
    text: string;
    timestamp: number;
}

interface ManualLanEnvelope {
    type: 'hello' | 'chat';
    role?: ManualLanRole;
    text?: string;
    timestamp?: number;
}

const ICE_GATHER_TIMEOUT_MILLIS = 10000;

function createDefaultSnapshot(role?: ManualLanRole): ManualLanSnapshot {
    return {
        role,
        localDescriptionText: '',
        remoteDescriptionApplied: false,
        connectionState: 'closed',
        iceConnectionState: 'closed',
        iceGatheringState: 'new',
        signalingState: 'stable',
        channelState: 'closed',
    };
}

export class ManualSdpLanSession {
    private peerConnection?: RTCPeerConnection;
    private dataChannel?: RTCDataChannel;
    private snapshot: ManualLanSnapshot = createDefaultSnapshot();

    public readonly onSnapshotChange = new EventDispatcher<this, ManualLanSnapshot>();
    public readonly onLog = new EventDispatcher<this, ManualLanLogEntry>();
    public readonly onMessage = new EventDispatcher<this, ManualLanMessage>();

    getSnapshot(): ManualLanSnapshot {
        return { ...this.snapshot };
    }

    reset(role?: ManualLanRole): void {
        this.closePeer();
        this.snapshot = createDefaultSnapshot(role);
        this.dispatchSnapshot();
    }

    async createHostOffer(): Promise<string> {
        this.reset('host');

        const pc = this.createPeerConnection('host');
        const channel = pc.createDataChannel('ra2-lan-manual', {
            ordered: true,
        });
        this.attachDataChannel(channel, 'local');

        this.log('info', '正在生成房主 Offer...');
        await pc.setLocalDescription(await pc.createOffer());
        await this.waitForIceGatheringComplete(pc);
        this.logLocalDescriptionDiagnostics('房主 Offer');
        this.refreshSnapshot();
        this.log('info', '房主 Offer 已生成，可以复制给加入者。');
        return this.snapshot.localDescriptionText;
    }

    async acceptHostOffer(offerText: string): Promise<string> {
        this.reset('guest');

        const pc = this.createPeerConnection('guest');
        pc.ondatachannel = (event) => {
            if (pc !== this.peerConnection) {
                return;
            }
            this.attachDataChannel(event.channel, 'remote');
        };

        const offer = this.parseDescription(offerText, 'offer');
        this.log('info', '正在导入房主 Offer...');
        await pc.setRemoteDescription(offer);
        this.snapshot.remoteDescriptionApplied = true;
        this.refreshSnapshot();

        this.log('info', '正在生成加入者 Answer...');
        await pc.setLocalDescription(await pc.createAnswer());
        await this.waitForIceGatheringComplete(pc);
        this.logLocalDescriptionDiagnostics('加入者 Answer');
        this.refreshSnapshot();
        this.log('info', '加入者 Answer 已生成，可以复制回房主。');
        return this.snapshot.localDescriptionText;
    }

    async acceptGuestAnswer(answerText: string): Promise<void> {
        if (!this.peerConnection || this.snapshot.role !== 'host') {
            throw new Error('请先在房主模式下生成 Offer。');
        }

        const answer = this.parseDescription(answerText, 'answer');
        this.log('info', '正在导入加入者 Answer...');
        await this.peerConnection.setRemoteDescription(answer);
        this.snapshot.remoteDescriptionApplied = true;
        this.refreshSnapshot();
        this.log('info', 'Answer 已导入，等待数据通道建立。');
    }

    sendChat(text: string): void {
        const normalizedText = text.trim();
        if (!normalizedText) {
            return;
        }
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            throw new Error('数据通道尚未建立，暂时无法发送消息。');
        }
        this.dataChannel.send(JSON.stringify({
            type: 'chat',
            text: normalizedText,
            timestamp: Date.now(),
        } satisfies ManualLanEnvelope));
    }

    dispose(): void {
        this.reset();
    }

    private createPeerConnection(role: ManualLanRole): RTCPeerConnection {
        if (typeof RTCPeerConnection === 'undefined') {
            throw new Error('当前浏览器不支持 WebRTC。');
        }
        const pc = new RTCPeerConnection({
            iceServers: [],
        });
        this.peerConnection = pc;
        this.snapshot = createDefaultSnapshot(role);
        this.bindPeerEvents(pc);
        this.refreshSnapshot();
        return pc;
    }

    private bindPeerEvents(pc: RTCPeerConnection): void {
        pc.addEventListener('connectionstatechange', () => {
            if (pc !== this.peerConnection) {
                return;
            }
            this.refreshSnapshot();
            this.log('info', `连接状态已更新为 ${pc.connectionState}。`);
        });
        pc.addEventListener('iceconnectionstatechange', () => {
            if (pc !== this.peerConnection) {
                return;
            }
            this.refreshSnapshot();
            this.log('info', `ICE 连接状态已更新为 ${pc.iceConnectionState}。`);
        });
        pc.addEventListener('icegatheringstatechange', () => {
            if (pc !== this.peerConnection) {
                return;
            }
            this.refreshSnapshot();
        });
        pc.addEventListener('icecandidateerror', (event) => {
            if (pc !== this.peerConnection) {
                return;
            }
            const address = 'address' in event && typeof event.address === 'string' ? ` ${event.address}` : '';
            this.log('warn', `ICE 候选采集报错${address}：${event.errorText || 'unknown error'}。`);
        });
        pc.addEventListener('signalingstatechange', () => {
            if (pc !== this.peerConnection) {
                return;
            }
            this.refreshSnapshot();
        });
    }

    private attachDataChannel(channel: RTCDataChannel, source: 'local' | 'remote'): void {
        this.dataChannel = channel;
        channel.binaryType = 'arraybuffer';
        this.log('info', `${source === 'local' ? '本地' : '远端'}数据通道已创建。`);
        channel.addEventListener('open', () => {
            if (channel !== this.dataChannel) {
                return;
            }
            this.refreshSnapshot();
            this.log('info', '数据通道已打开，可以开始发送测试消息。');
            try {
                this.sendEnvelope({
                    type: 'hello',
                    role: this.snapshot.role,
                    timestamp: Date.now(),
                });
            }
            catch (error) {
                this.log('warn', `发送握手消息失败：${(error as Error).message}`);
            }
        });
        channel.addEventListener('close', () => {
            if (channel !== this.dataChannel) {
                return;
            }
            this.refreshSnapshot();
            this.log('warn', '数据通道已关闭。');
        });
        channel.addEventListener('error', () => {
            if (channel !== this.dataChannel) {
                return;
            }
            this.refreshSnapshot();
            this.log('error', '数据通道发生错误。');
        });
        channel.addEventListener('message', (event) => {
            if (channel !== this.dataChannel) {
                return;
            }
            this.handleDataChannelMessage(event.data);
        });
        this.refreshSnapshot();
    }

    private handleDataChannelMessage(data: string | ArrayBuffer | Blob): void {
        if (typeof data === 'string') {
            this.handleEnvelopeText(data);
            return;
        }
        if (data instanceof ArrayBuffer) {
            this.handleEnvelopeText(new TextDecoder().decode(new Uint8Array(data)));
            return;
        }
        if (typeof Blob !== 'undefined' && data instanceof Blob) {
            data.text()
                .then((text) => this.handleEnvelopeText(text))
                .catch((error) => this.log('warn', `读取远端消息失败：${(error as Error).message}`));
        }
    }

    private handleEnvelopeText(text: string): void {
        let payload: ManualLanEnvelope | undefined;
        try {
            payload = JSON.parse(text) as ManualLanEnvelope;
        }
        catch {
            payload = undefined;
        }

        if (!payload || typeof payload !== 'object') {
            this.onMessage.dispatch(this, {
                from: this.getRemoteLabel(),
                text,
                timestamp: Date.now(),
            });
            return;
        }

        if (payload.type === 'hello') {
            this.log('info', `${this.getRemoteLabel()}已完成握手。`);
            return;
        }

        if (payload.type === 'chat' && payload.text) {
            this.onMessage.dispatch(this, {
                from: this.getRemoteLabel(),
                text: payload.text,
                timestamp: payload.timestamp ?? Date.now(),
            });
            return;
        }

        this.log('warn', '收到了无法识别的数据通道消息。');
    }

    private sendEnvelope(payload: ManualLanEnvelope): void {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            throw new Error('数据通道尚未打开。');
        }
        this.dataChannel.send(JSON.stringify(payload));
    }

    private parseDescription(text: string, expectedType: RTCSdpType): RTCSessionDescriptionInit {
        let parsed: unknown;
        try {
            parsed = JSON.parse(text.trim());
        }
        catch {
            throw new Error('描述文本不是合法的 JSON。');
        }

        if (!parsed || typeof parsed !== 'object') {
            throw new Error('描述文本格式不正确。');
        }

        const candidate = parsed as RTCSessionDescriptionInit;
        if (candidate.type !== expectedType) {
            throw new Error(`需要导入 ${expectedType}，但当前文本类型是 ${candidate.type ?? 'unknown'}。`);
        }
        if (!candidate.sdp || typeof candidate.sdp !== 'string') {
            throw new Error('描述文本缺少 SDP 内容。');
        }
        return candidate;
    }

    private async waitForIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
        if (pc.iceGatheringState === 'complete') {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            const timeoutId = window.setTimeout(() => {
                cleanup();
                reject(new Error('ICE 候选收集超时，请稍后重试。'));
            }, ICE_GATHER_TIMEOUT_MILLIS);

            const handleChange = () => {
                if (pc.iceGatheringState === 'complete') {
                    cleanup();
                    resolve();
                }
            };

            const cleanup = () => {
                clearTimeout(timeoutId);
                pc.removeEventListener('icegatheringstatechange', handleChange);
            };

            pc.addEventListener('icegatheringstatechange', handleChange);
        });
    }

    private closePeer(): void {
        try {
            this.dataChannel?.close();
        }
        catch {
        }
        this.dataChannel = undefined;

        try {
            this.peerConnection?.close();
        }
        catch {
        }
        this.peerConnection = undefined;
    }

    private refreshSnapshot(): void {
        this.snapshot = {
            role: this.snapshot.role,
            localDescriptionText: this.peerConnection?.localDescription
                ? JSON.stringify(this.peerConnection.localDescription)
                : this.snapshot.localDescriptionText,
            remoteDescriptionApplied: this.snapshot.remoteDescriptionApplied,
            connectionState: this.peerConnection?.connectionState ?? 'closed',
            iceConnectionState: this.peerConnection?.iceConnectionState ?? 'closed',
            iceGatheringState: this.peerConnection?.iceGatheringState ?? 'new',
            signalingState: this.peerConnection?.signalingState ?? 'stable',
            channelState: this.dataChannel?.readyState ?? 'closed',
        };
        this.dispatchSnapshot();
    }

    private logLocalDescriptionDiagnostics(label: string): void {
        const summary = summarizeSdpCandidates(this.peerConnection?.localDescription);
        this.log('info', `${label} 候选情况：${formatSdpCandidateSummary(summary)}。`);
        const warning = getSdpCandidateWarning(summary);
        if (warning) {
            this.log('warn', warning);
        }
    }

    private dispatchSnapshot(): void {
        this.onSnapshotChange.dispatch(this, { ...this.snapshot });
    }

    private getRemoteLabel(): string {
        return this.snapshot.role === 'host' ? '加入者' : '房主';
    }

    private log(level: ManualLanLogEntry['level'], text: string): void {
        this.onLog.dispatch(this, {
            level,
            text,
            timestamp: Date.now(),
        });
    }
}
