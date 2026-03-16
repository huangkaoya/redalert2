import React from 'react';
import { ChatRecipientType } from '@/network/chat/ChatMessage';
import { RECIPIENT_TEAM } from '@/network/gservConfig';
import { ReactFormat } from '@/gui/ReactFormat';

interface ChatMessageFormatProps {
  strings: {
    get: (key: string, ...args: any[]) => string;
  };
  localUsername: string;
  userColors?: Map<string, string>;
}

export class ChatMessageFormat {
  private strings: ChatMessageFormatProps['strings'];
  private localUsername: string;
  private userColors?: Map<string, string>;

  constructor(strings: ChatMessageFormatProps['strings'], localUsername: string, userColors?: Map<string, string>) {
    this.strings = strings;
    this.localUsername = localUsername;
    this.userColors = userColors;
  }

  formatPrefixPlain(message: { to: { type: ChatRecipientType; name: string }; from: string }) {
    let prefix: string;
    if (message.to.type === ChatRecipientType.Channel) {
      prefix = message.to.name === RECIPIENT_TEAM
        ? this.strings.get("TS:ChatFromAllies", message.from)
        : this.strings.get("TS:ChatFrom", message.from);
    } else if (message.to.type === ChatRecipientType.Page) {
      prefix = this.strings.get("TS:PageFrom", message.from);
    } else {
      if (message.to.type !== ChatRecipientType.Whisper) {
        throw new Error("Unknown message type " + message.to.type);
      }
      prefix = message.from === this.localUsername
        ? this.strings.get("TS:To", message.to.name)
        : this.strings.get("TXT_FROM", message.from);
    }
    return prefix;
  }

  formatPrefixHtml(
    message: { to: { type: ChatRecipientType; name: string }; from: string; time: Date },
    onUserClick?: (username: string) => void
  ): React.ReactNode {
    const displayName = message.to.type === ChatRecipientType.Whisper && message.from === this.localUsername
      ? message.to.name
      : message.from;

    let formattedName: React.ReactNode = displayName;
    const userPlaceholder = "{user}";

    if (message.to.type !== ChatRecipientType.Page) {
      const userColor = this.userColors?.get(message.from);
      if (userColor !== undefined) {
        formattedName = React.createElement(
          "span",
          { style: { color: userColor } },
          formattedName
        );
      }

      if (onUserClick) {
        const [prefix, suffix] = this.strings.get("TS:ChatUserLink", userPlaceholder).split(userPlaceholder);
        formattedName = React.createElement(
          "span",
          { className: "user-link", onClick: () => onUserClick(displayName) },
          prefix,
          formattedName,
          suffix
        );
      }
    }

    const timestamp = this.strings.get(
      "TS:ChatTimestamp",
      message.time.toLocaleTimeString(undefined, { timeStyle: "short" })
    ) + " ";

    let formatString: string;
    if (message.to.type === ChatRecipientType.Channel) {
      formatString = message.to.name === RECIPIENT_TEAM
        ? this.strings.get("TS:ChatFromAllies", userPlaceholder)
        : this.strings.get("TS:ChatFrom", userPlaceholder);
    } else if (message.to.type === ChatRecipientType.Page) {
      formatString = this.strings.get("TS:PageFrom", userPlaceholder);
    } else {
      if (message.to.type !== ChatRecipientType.Whisper) {
        throw new Error("Unknown message type " + message.to.type);
      }
      formatString = message.from === this.localUsername
        ? this.strings.get("TS:To", userPlaceholder)
        : this.strings.get("TXT_FROM", userPlaceholder);
    }

    const [prefix, suffix] = formatString.split(userPlaceholder);

    return React.createElement(
      React.Fragment,
      null,
      timestamp,
      prefix,
      formattedName,
      suffix
    );
  }

  formatTextHtml(text: string, formatUrls: boolean): React.ReactNode {
    return formatUrls ? ReactFormat.formatUrls(text) : text;
  }
}
