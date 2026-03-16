import React from 'react';
import { Strings } from '../../../../data/Strings';
export interface CreditsProps {
    contentTpl: string;
    strings: Strings;
}
export const Credits: React.FC<CreditsProps> = ({ contentTpl, strings }) => {
    const processedContent = contentTpl
        .replace(/\{([^}]+)\}/g, (match, key) => strings.get(key) || match)
        .replace(/<([^>]+)>/g, (match, url) => url.match(/^(https?|mailto):(\/\/)?/)
        ? `<a href='${encodeURI(url)}' target='_blank' rel='noopener'>${encodeURI(url)}</a>`
        : "")
        .replace(/\t*\r?\n/g, "<br />")
        .replace(/([^>]+)\t+([^<]+)<br \/>/g, `<div class='def'>
        <span class='title'>$1</span>
        <span class='filler'></span>
        <span class='name'>$2</span>
      </div>`);
    return (<div className="credits-container">
      <div className="credits" dangerouslySetInnerHTML={{ __html: processedContent }}/>
    </div>);
};
