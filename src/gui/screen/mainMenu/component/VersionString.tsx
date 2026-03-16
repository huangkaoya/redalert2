import React from 'react';
interface VersionStringProps {
    value: string;
}
export const VersionString: React.FC<VersionStringProps> = ({ value }) => {
    return (<div className="menu-version-string">
      v{value}
    </div>);
};
