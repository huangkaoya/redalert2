import React, { useState, useEffect } from 'react';
interface StorageEstimate {
    quota?: number;
    usage?: number;
}
interface StorageWarningProps {
    strings: {
        get(key: string, ...args: any[]): string;
    };
}
function formatMB(bytes: number): number {
    return Math.ceil(bytes / 1024 / 1024);
}
export const StorageWarning: React.FC<StorageWarningProps> = ({ strings }) => {
    const [estimate, setEstimate] = useState<StorageEstimate>();
    useEffect(() => {
        if (navigator.storage?.estimate) {
            navigator.storage
                .estimate()
                .then((estimate) => setEstimate(estimate))
                .catch((error) => console.warn("Couldn't get storage estimate", [error]));
        }
    }, []);
    if (estimate?.quota &&
        estimate.usage &&
        estimate.quota - estimate.usage < 1048576) {
        return (<div className="storage-warning">
        {strings.get("ts:storage_quota_warning", formatMB(estimate.usage), formatMB(estimate.quota))}
      </div>);
    }
    return null;
};
