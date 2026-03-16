import React from 'react';
interface PrefetchProgressProps {
    progress: number;
    statusText: string;
}
export const PrefetchProgress: React.FC<PrefetchProgressProps> = ({ progress, statusText }) => {
    return (<div className="prefetch-progress">
      <div>
        <label>{statusText}</label>
        <progress value={progress} max={100}/>
      </div>
    </div>);
};
