import React from 'react';
import { Strings } from '../../../../data/Strings';
export interface ReportBugProps {
    discordUrl?: string;
    strings: Strings;
}
export const ReportBug: React.FC<ReportBugProps> = ({ discordUrl, strings }) => {
    return (<div style={{ padding: '20px', color: 'white' }}>
      <div style={{ marginBottom: '15px' }}>
        {strings.get('TS:ReportBugDesc') || '您可以在我们的专用Discord服务器频道上提交错误报告，请点击下面的链接：'}
      </div>
      
      {discordUrl && (<div style={{ textAlign: 'center' }}>
          <a href={discordUrl} target="_blank" rel="noopener noreferrer" style={{
                color: '#00ff00',
                textDecoration: 'underline',
                fontSize: '16px'
            }} onClick={() => {
                window.gtag?.('event', 'discord_click');
            }}>
            {discordUrl}
          </a>
        </div>)}
    </div>);
};
