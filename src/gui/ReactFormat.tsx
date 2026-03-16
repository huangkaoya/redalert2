import React from 'react';
const URL_PATTERN = /(\[(?:[^\]]+)\]\((?:https?:\/\/[^\s]+|mailto:[^\s]+)\))|(https?:\/\/[^\s]+|mailto:[^\s]+)/g;
const MARKDOWN_LINK_PATTERN = /^\[([^\]]+)\]\((https?:\/\/[^\s]+|mailto:[^\s]+)\)$/;
export class ReactFormat {
    static formatMultiline(text: string, formatter: (line: string) => React.ReactNode): React.ReactNode[] {
        return text
            .split(/\n/g)
            .map((line, index) => index ? (<React.Fragment key={index}>
            <br />
            {formatter(line)}
          </React.Fragment>) : formatter(line));
    }
    static formatUrls(text: string): React.ReactNode {
        return (<React.Fragment>
        {text
                .split(URL_PATTERN)
                .filter(Boolean)
                .map((part, index) => {
                if (!URL_PATTERN.test(part)) {
                    return part;
                }
                let linkText: string;
                let href: string;
                const match = part.match(MARKDOWN_LINK_PATTERN);
                if (match) {
                    [, linkText, href] = match;
                }
                else {
                    linkText = href = part;
                }
                return (<a key={index} href={href} rel="noopener noreferrer" target="_blank">
                {linkText}
              </a>);
            })}
      </React.Fragment>);
    }
}
