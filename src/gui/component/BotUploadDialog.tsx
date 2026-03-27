import React from 'react';
import { BotUploader } from '@/game/ai/thirdpartbot/BotUploader';
import { BotRegistry } from '@/game/ai/thirdpartbot/BotRegistry';
import { ThirdPartyBotMeta } from '@/game/ai/thirdpartbot/ThirdPartyBotInterface';

interface BotUploadDialogProps {
    strings: any;
    onClose: () => void;
    onBotRegistered?: (meta: ThirdPartyBotMeta) => void;
}

interface BotUploadDialogState {
    uploading: boolean;
    message: string;
    messageType: 'info' | 'success' | 'error';
    registeredBots: ThirdPartyBotMeta[];
}

export class BotUploadDialog extends React.Component<BotUploadDialogProps, BotUploadDialogState> {
    private fileInputRef: React.RefObject<HTMLInputElement>;

    constructor(props: BotUploadDialogProps) {
        super(props);
        this.fileInputRef = React.createRef();
        this.state = {
            uploading: false,
            message: '',
            messageType: 'info',
            registeredBots: BotRegistry.getInstance().getUploadedBots(),
        };
    }

    private handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        this.setState({ uploading: true, message: '', messageType: 'info' });

        try {
            const result = await BotUploader.processUpload(file);

            if (result.success && result.meta) {
                this.setState({
                    uploading: false,
                    message: this.props.strings.get('GUI:BotUpload:Success') || 'Bot uploaded successfully!',
                    messageType: 'success',
                    registeredBots: BotRegistry.getInstance().getUploadedBots(),
                });
                this.props.onBotRegistered?.(result.meta);
            } else {
                this.setState({
                    uploading: false,
                    message: (result.errors || ['Upload failed']).join('\n'),
                    messageType: 'error',
                });
            }
        } catch (e) {
            this.setState({
                uploading: false,
                message: `Error: ${(e as Error).message}`,
                messageType: 'error',
            });
        }

        // Reset file input
        if (this.fileInputRef.current) {
            this.fileInputRef.current.value = '';
        }
    };

    private handleRemoveBot = (botId: string) => {
        BotRegistry.getInstance().unregister(botId);
        this.setState({
            registeredBots: BotRegistry.getInstance().getUploadedBots(),
        });
    };

    render() {
        const { strings, onClose } = this.props;
        const { uploading, message, messageType, registeredBots } = this.state;

        return (
            <div className="bot-upload-dialog-overlay" onClick={onClose}>
                <div
                    className="bot-upload-dialog"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bot-upload-header">
                        <h3>{strings.get('GUI:BotUpload:Title') || 'Upload AI Bot Script'}</h3>
                        <button
                            className="bot-upload-close"
                            onClick={onClose}
                        >
                            ×
                        </button>
                    </div>

                    <div className="bot-upload-body">
                        <div className="bot-upload-section">
                            <label className="bot-upload-label">
                                {strings.get('GUI:BotUpload:Select') || 'Select Bot Zip File'}
                            </label>
                            <input
                                ref={this.fileInputRef as any}
                                type="file"
                                accept=".zip"
                                onChange={this.handleFileSelect}
                                disabled={uploading}
                                className="bot-upload-input"
                            />
                            <div className="bot-upload-hint">
                                {strings.get('GUI:BotUpload:Hint') || 'Upload a .zip file containing bot.ts or index.ts'}
                            </div>
                        </div>

                        {uploading && (
                            <div className="bot-upload-status">Loading...</div>
                        )}

                        {message && (
                            <div className={`bot-upload-message bot-upload-message-${messageType}`}>
                                {message}
                            </div>
                        )}

                        <div className="bot-upload-section">
                            <h4>{strings.get('GUI:BotUpload:Manage') || 'Manage Bots'}</h4>
                            {registeredBots.length === 0 ? (
                                <div className="bot-upload-empty">
                                    {strings.get('GUI:BotUpload:NoBot') || 'No custom bots uploaded'}
                                </div>
                            ) : (
                                <ul className="bot-upload-list">
                                    {registeredBots.map((bot) => (
                                        <li key={bot.id} className="bot-upload-item">
                                            <div className="bot-upload-item-info">
                                                <span className="bot-upload-item-name">
                                                    {bot.displayName}
                                                </span>
                                                <span className="bot-upload-item-version">
                                                    v{bot.version}
                                                </span>
                                                <span className="bot-upload-item-author">
                                                    by {bot.author}
                                                </span>
                                            </div>
                                            <button
                                                className="bot-upload-item-remove"
                                                onClick={() => this.handleRemoveBot(bot.id)}
                                            >
                                                {strings.get('GUI:BotUpload:Remove') || 'Remove'}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="bot-upload-footer">
                        <button
                            className="dialog-button"
                            onClick={onClose}
                        >
                            {strings.get('GUI:Ok') || 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
