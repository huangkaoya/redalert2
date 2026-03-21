interface LzoState {
    inputBuffer: Uint8Array;
    outputBuffer: Uint8Array | null;
}

interface LzoConfig {
    outputSize?: number;
    blockSize?: number;
}

class Lzo1xImpl {
    blockSize = 128 * 1024;
    minNewSize = this.blockSize;
    maxSize = 0;
    OK = 0;
    INPUT_OVERRUN = -4;
    OUTPUT_OVERRUN = -5;
    LOOKBEHIND_OVERRUN = -6;
    EOF_FOUND = -999;
    ret = 0;
    buf: Uint8Array | null = null;
    buf32: Uint32Array | null = null;
    out = new Uint8Array(256 * 1024);
    cbl = 0;
    ip_end = 0;
    op_end = 0;
    t = 0;
    ip = 0;
    op = 0;
    m_pos = 0;
    m_len = 0;
    m_off = 0;
    dv_hi = 0;
    dv_lo = 0;
    dindex = 0;
    ii = 0;
    jj = 0;
    tt = 0;
    v = 0;
    dict = new Uint32Array(16384);
    emptyDict = new Uint32Array(16384);
    skipToFirstLiteralFun = false;
    returnNewBuffers = true;
    state: LzoState = { inputBuffer: new Uint8Array(), outputBuffer: null };

    setBlockSize(blockSize: number) {
        if (typeof blockSize === 'number' && !isNaN(blockSize) && parseInt(String(blockSize), 10) > 0) {
            this.blockSize = parseInt(String(blockSize), 10);
            return true;
        }
        return false;
    }

    setOutputSize(outputSize: number) {
        if (typeof outputSize === 'number' && !isNaN(outputSize) && parseInt(String(outputSize), 10) > 0) {
            this.out = new Uint8Array(parseInt(String(outputSize), 10));
            return true;
        }
        return false;
    }

    setReturnNewBuffers(value: boolean) {
        this.returnNewBuffers = !!value;
    }

    applyConfig(cfg?: LzoConfig) {
        if (cfg?.outputSize !== undefined) {
            this.setOutputSize(cfg.outputSize);
        }
        if (cfg?.blockSize !== undefined) {
            this.setBlockSize(cfg.blockSize);
        }
    }

    extendBuffer() {
        const newBuffer = new Uint8Array(this.minNewSize + (this.blockSize - this.minNewSize % this.blockSize));
        newBuffer.set(this.out);
        this.out = newBuffer;
        this.cbl = this.out.length;
    }

    match_next() {
        this.minNewSize = this.op + 3;
        if (this.minNewSize > this.cbl) {
            this.extendBuffer();
        }
        this.out[this.op++] = this.buf![this.ip++];
        if (this.t > 1) {
            this.out[this.op++] = this.buf![this.ip++];
            if (this.t > 2) {
                this.out[this.op++] = this.buf![this.ip++];
            }
        }
        this.t = this.buf![this.ip++];
    }

    match_done() {
        this.t = this.buf![this.ip - 2] & 3;
        return this.t;
    }

    copy_match() {
        this.t += 2;
        this.minNewSize = this.op + this.t;
        if (this.minNewSize > this.cbl) {
            this.extendBuffer();
        }
        do {
            this.out[this.op++] = this.out[this.m_pos++];
        } while (--this.t > 0);
    }

    copy_from_buf() {
        this.minNewSize = this.op + this.t;
        if (this.minNewSize > this.cbl) {
            this.extendBuffer();
        }
        do {
            this.out[this.op++] = this.buf![this.ip++];
        } while (--this.t > 0);
    }

    match() {
        for (;;) {
            if (this.t >= 64) {
                this.m_pos = (this.op - 1) - ((this.t >> 2) & 7) - (this.buf![this.ip++] << 3);
                this.t = (this.t >> 5) - 1;
                this.copy_match();
            }
            else if (this.t >= 32) {
                this.t &= 31;
                if (this.t === 0) {
                    while (this.buf![this.ip] === 0) {
                        this.t += 255;
                        this.ip++;
                    }
                    this.t += 31 + this.buf![this.ip++];
                }
                this.m_pos = (this.op - 1) - (this.buf![this.ip] >> 2) - (this.buf![this.ip + 1] << 6);
                this.ip += 2;
                this.copy_match();
            }
            else if (this.t >= 16) {
                this.m_pos = this.op - ((this.t & 8) << 11);
                this.t &= 7;
                if (this.t === 0) {
                    while (this.buf![this.ip] === 0) {
                        this.t += 255;
                        this.ip++;
                    }
                    this.t += 7 + this.buf![this.ip++];
                }
                this.m_pos -= (this.buf![this.ip] >> 2) + (this.buf![this.ip + 1] << 6);
                this.ip += 2;
                if (this.m_pos === this.op) {
                    this.state.outputBuffer = this.returnNewBuffers
                        ? new Uint8Array(this.out.subarray(0, this.op))
                        : this.out.subarray(0, this.op);
                    return this.EOF_FOUND;
                }
                this.m_pos -= 0x4000;
                this.copy_match();
            }
            else {
                this.m_pos = (this.op - 1) - (this.t >> 2) - (this.buf![this.ip++] << 2);
                this.minNewSize = this.op + 2;
                if (this.minNewSize > this.cbl) {
                    this.extendBuffer();
                }
                this.out[this.op++] = this.out[this.m_pos++];
                this.out[this.op++] = this.out[this.m_pos];
            }
            if (this.match_done() === 0) {
                return this.OK;
            }
            this.match_next();
        }
    }

    decompress(state: LzoState) {
        this.state = state;
        this.buf = this.state.inputBuffer;
        this.cbl = this.out.length;
        this.ip_end = this.buf.length;
        this.t = 0;
        this.ip = 0;
        this.op = 0;
        this.m_pos = 0;
        this.skipToFirstLiteralFun = false;
        if (this.buf[this.ip] > 17) {
            this.t = this.buf[this.ip++] - 17;
            if (this.t < 4) {
                this.match_next();
                this.ret = this.match();
                if (this.ret !== this.OK) {
                    return this.ret === this.EOF_FOUND ? this.OK : this.ret;
                }
            }
            else {
                this.copy_from_buf();
                this.skipToFirstLiteralFun = true;
            }
        }
        for (;;) {
            if (!this.skipToFirstLiteralFun) {
                this.t = this.buf[this.ip++];
                if (this.t >= 16) {
                    this.ret = this.match();
                    if (this.ret !== this.OK) {
                        return this.ret === this.EOF_FOUND ? this.OK : this.ret;
                    }
                    continue;
                }
                else if (this.t === 0) {
                    while (this.buf[this.ip] === 0) {
                        this.t += 255;
                        this.ip++;
                    }
                    this.t += 15 + this.buf[this.ip++];
                }
                this.t += 3;
                this.copy_from_buf();
            }
            else {
                this.skipToFirstLiteralFun = false;
            }
            this.t = this.buf[this.ip++];
            if (this.t < 16) {
                this.m_pos = this.op - (1 + 0x0800);
                this.m_pos -= this.t >> 2;
                this.m_pos -= this.buf[this.ip++] << 2;
                this.minNewSize = this.op + 3;
                if (this.minNewSize > this.cbl) {
                    this.extendBuffer();
                }
                this.out[this.op++] = this.out[this.m_pos++];
                this.out[this.op++] = this.out[this.m_pos++];
                this.out[this.op++] = this.out[this.m_pos];
                if (this.match_done() === 0) {
                    continue;
                }
                this.match_next();
            }
            this.ret = this.match();
            if (this.ret !== this.OK) {
                return this.ret === this.EOF_FOUND ? this.OK : this.ret;
            }
        }
    }

    compress(_state: LzoState) {
        throw new Error('MiniLzo compression is not implemented in the ESM migration');
    }
}

const instance = new Lzo1xImpl();

export const lzo1x = {
    setBlockSize(blockSize: number) {
        return instance.setBlockSize(blockSize);
    },
    setOutputEstimate(outputSize: number) {
        return instance.setOutputSize(outputSize);
    },
    setReturnNewBuffers(value: boolean) {
        instance.setReturnNewBuffers(value);
    },
    compress(state: LzoState, cfg?: LzoConfig) {
        if (cfg !== undefined) {
            instance.applyConfig(cfg);
        }
        return instance.compress(state);
    },
    decompress(state: LzoState, cfg?: LzoConfig) {
        if (cfg !== undefined) {
            instance.applyConfig(cfg);
        }
        return instance.decompress(state);
    },
};

export type { LzoState, LzoConfig };
