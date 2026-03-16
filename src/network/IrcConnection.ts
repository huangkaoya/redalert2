export class IrcConnection {
    static SocketError = class SocketError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'SocketError';
        }
    };
    static NoReplyError = class NoReplyError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'NoReplyError';
        }
    };
    static ConnectError = class ConnectError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'ConnectError';
        }
    };
}
