import { Component, Fragment } from 'react';
import classNames from 'classnames';
import { ChatRecipientType } from '@/network/chat/ChatMessage';
import { ChatMessageFormat } from '@/gui/chat/ChatMessageFormat';
import { ChatInput } from '@/gui/component/ChatInput';

interface ChatProps {
  messages: any[];
  tooltips?: {
    output?: string;
    input?: string;
    button?: string;
  };
  strings: any;
  chatHistory?: {
    lastComposeTarget?: {
      value: {
        type: ChatRecipientType;
        name: string;
      };
      onChange?: {
        subscribe: (callback: (value: any) => void) => void;
        unsubscribe: (callback: (value: any) => void) => void;
      };
    };
    lastWhisperFrom?: {
      value: string;
      onChange?: {
        subscribe: (callback: () => void) => void;
        unsubscribe: (callback: () => void) => void;
      };
    };
    lastWhisperTo?: {
      value: string;
      onChange?: {
        subscribe: (callback: () => void) => void;
        unsubscribe: (callback: () => void) => void;
      };
    };
  };
  channels?: any[];
  localUsername?: string;
  userColors?: any;
  onSendMessage: (message: any) => void;
  onCancelMessage: () => void;
}

const messageTypeMap = new Map<ChatRecipientType, string>()
  .set(ChatRecipientType.Channel, "type-channel")
  .set(ChatRecipientType.Page, "type-page")
  .set(ChatRecipientType.Whisper, "type-whisper");

export class Chat extends Component<ChatProps> {
  private prevMessageCount = 0;
  private prevOldestMessage: any;
  private prevScrollHeight = 0;
  private messageList?: HTMLDivElement | null;
  private textBox?: { send: () => void } | null;

  render() {
    const { messages, tooltips, strings, chatHistory, channels } = this.props;

    return (
      <div className="chat-wrapper">
        <div 
          className="messages"
          ref={el => (this.messageList = el)}
          data-r-tooltip={tooltips?.output}
        >
          {messages.map((message, index) => this.renderMessage(message, index))}
        </div>
        <div className="new-message-wrapper">
          <ChatInput
            ref={el => (this.textBox = el)}
            chatHistory={chatHistory}
            channels={channels}
            className="new-message"
            tooltip={tooltips?.input}
            strings={strings}
            onSubmit={this.props.onSendMessage}
            onCancel={this.props.onCancelMessage}
          />
          <button
            className="icon-button send-message-button"
            data-r-tooltip={tooltips?.button}
            onClick={() => this.textBox?.send()}
          />
        </div>
      </div>
    );
  }

  componentDidUpdate(prevProps: ChatProps) {
    if (this.props.messages[0] === this.prevOldestMessage && 
        this.props.messages.length === this.prevMessageCount) {
      return;
    }

    this.prevMessageCount = this.props.messages.length;
    this.prevOldestMessage = this.props.messages[0];

    if (!this.messageList) {
      return;
    }

    const scrollHeight = this.messageList.scrollHeight;
    const clientHeight = this.messageList.clientHeight;

    if (scrollHeight !== this.prevScrollHeight && 
        (!this.prevScrollHeight || 
         Math.abs(this.messageList.scrollTop - (this.prevScrollHeight - clientHeight)) <= 1)) {
      this.messageList.scrollTop = scrollHeight - clientHeight;
    }

    this.prevScrollHeight = scrollHeight;
  }

  private renderMessage(message: any, index: number) {
    const formatter = new ChatMessageFormat(
      this.props.strings,
      this.props.localUsername,
      this.props.userColors
    );

    const classes = ["message"];
    let prefix: React.ReactNode;

    if (message.from !== undefined) {
      prefix = formatter.formatPrefixHtml(message, (name: string) => {
        if (this.props.chatHistory && 
            message.to && 
            message.to.type !== ChatRecipientType.Page &&
            this.props.chatHistory.lastComposeTarget) {
          this.props.chatHistory.lastComposeTarget.value = {
            type: ChatRecipientType.Whisper,
            name
          };
        }
      });

      const messageTypeClass = messageTypeMap.get(message.to.type);
      if (messageTypeClass) {
        classes.push(messageTypeClass);
      }
      if (message.operator) {
        classes.push("operator-message");
      }
    }

    const isSystemMessage = message.from === undefined;
    const text = formatter.formatTextHtml(message.text, isSystemMessage);

    return (
      <div key={index} className={classNames(classes)}>
        {prefix ? (
          <Fragment>
            <span>{prefix}</span> {text}
          </Fragment>
        ) : text}
      </div>
    );
  }
}
