export interface SdpCandidateSummary {
    totalCandidates: number;
    hasMdnsHostCandidate: boolean;
    hasPrivateIpv4Candidate: boolean;
    hasLoopbackCandidate: boolean;
    hasIpv6Candidate: boolean;
    hasSrflxCandidate: boolean;
    hasRelayCandidate: boolean;
}

function isPrivateIpv4(address: string): boolean {
    return /^10\./.test(address) ||
        /^192\.168\./.test(address) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(address);
}

function isIpv6(address: string): boolean {
    return address.includes(':');
}

function parseCandidateLine(line: string): { address?: string; type?: string } {
    const tokens = line.trim().split(/\s+/);
    const typIndex = tokens.indexOf('typ');
    return {
        address: tokens[4],
        type: typIndex >= 0 ? tokens[typIndex + 1] : undefined,
    };
}

export function summarizeSdpCandidates(description?: RTCSessionDescriptionInit | null): SdpCandidateSummary {
    const summary: SdpCandidateSummary = {
        totalCandidates: 0,
        hasMdnsHostCandidate: false,
        hasPrivateIpv4Candidate: false,
        hasLoopbackCandidate: false,
        hasIpv6Candidate: false,
        hasSrflxCandidate: false,
        hasRelayCandidate: false,
    };

    if (!description?.sdp) {
        return summary;
    }

    description.sdp
        .split(/\r?\n/)
        .filter((line) => line.startsWith('a=candidate:'))
        .forEach((line) => {
            summary.totalCandidates += 1;
            const { address = '', type } = parseCandidateLine(line);
            const normalizedAddress = address.toLowerCase();
            if (normalizedAddress.endsWith('.local')) {
                summary.hasMdnsHostCandidate = true;
            }
            if (isPrivateIpv4(normalizedAddress)) {
                summary.hasPrivateIpv4Candidate = true;
            }
            if (normalizedAddress === '127.0.0.1' || normalizedAddress === '::1' || normalizedAddress === 'localhost') {
                summary.hasLoopbackCandidate = true;
            }
            if (isIpv6(normalizedAddress)) {
                summary.hasIpv6Candidate = true;
            }
            if (type === 'srflx') {
                summary.hasSrflxCandidate = true;
            }
            if (type === 'relay') {
                summary.hasRelayCandidate = true;
            }
        });

    return summary;
}

export function formatSdpCandidateSummary(summary: SdpCandidateSummary): string {
    const parts = [
        `候选 ${summary.totalCandidates} 个`,
        summary.hasPrivateIpv4Candidate ? '含局域网 IPv4' : '无局域网 IPv4',
        summary.hasMdnsHostCandidate ? '含 mDNS 主机名' : '无 mDNS 主机名',
        summary.hasSrflxCandidate ? '含 srflx' : '无 srflx',
        summary.hasRelayCandidate ? '含 relay' : '无 relay',
    ];
    return parts.join('，');
}

export function getSdpCandidateWarning(summary: SdpCandidateSummary): string | undefined {
    if (!summary.totalCandidates) {
        return '当前 SDP 没有收集到任何 ICE 候选，跨机器肯定无法建立局域网直连。';
    }
    if (summary.hasMdnsHostCandidate &&
        !summary.hasPrivateIpv4Candidate &&
        !summary.hasSrflxCandidate &&
        !summary.hasRelayCandidate) {
        return '当前浏览器只暴露了 mDNS host candidate（*.local），没有局域网 IPv4/srflx/relay 候选；同机或 127.0.0.1 往往可用，但跨机器局域网很容易因为 mDNS/UDP 被拦而失败。';
    }
    return undefined;
}
