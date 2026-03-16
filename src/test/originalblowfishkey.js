const s = "AihRvNoIbTn85FZRYNZRcT+i6KpU+maCsEqr3Q5q+LDB5tH7Tz2qQ38V";
const a = new Int8Array([
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54,
    55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3,
    4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32,
    33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
    50, 51, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
]);
class i {
    constructor() {
        (this.key1 = new Uint32Array(64)),
            (this.key2 = new Uint32Array(64));
    }
}
export class BlowfishKey {
    constructor() {
        (this.pubkey = new i()),
            (this.glob1 = new Uint32Array(64)),
            (this.glob2 = new Uint32Array(130)),
            (this.glob1_hi = new Uint32Array(4)),
            (this.glob1_hi_inv = new Uint32Array(4));
    }
    init_bignum(e, t, i) {
        for (let r = 0; r < i; r++)
            e[r] = 0;
        e[0] = t;
    }
    move_key_to_big(e, t, i, r) {
        let s;
        s = 0 != (128 & t[0]) ? 255 : 0;
        const a = new Uint8Array(e.buffer, e.byteOffset);
        let n = 4 * r;
        for (; n > i; n--)
            a[n - 1] = s;
        for (; 0 < n; n--)
            a[n - 1] = t[i - n];
    }
    key_to_bignum(e, t, i) {
        let r, s, a = 0;
        if (2 === t[a]) {
            if ((a++, 0 != (128 & t[a]))) {
                for (r = 0, s = 0; s < (127 & t[a]); s++)
                    r = (((r << 8) >>> 0) | t[a + s + 1]) >>> 0;
                a += 1 + (127 & t[a]);
            }
            else
                (r = t[a]), a++;
            r <= 4 * i && this.move_key_to_big(e, t.subarray(a), r, i);
        }
    }
    len_bignum(e, t) {
        let i = t - 1;
        for (; 0 <= i && 0 === e[i];)
            i--;
        return i + 1;
    }
    bitlen_bignum(e, t) {
        var i;
        let r, s;
        if (0 === (i = this.len_bignum(e, t)))
            return 0;
        for (r = 32 * i, s = 2147483648; 0 == (s & e[i - 1]);)
            (s >>>= 1), r--;
        return r;
    }
    init_pubkey() {
        let e = 0, t;
        var i;
        const r = new Uint8Array(256);
        for (this.init_bignum(this.pubkey.key2, 65537, 64), t = 0; e < s.length;)
            (i =
                ((((((((((((a[s.charCodeAt(e++)] >>> 0) << 6) >>> 0) |
                    (255 & a[s.charCodeAt(e++)])) >>>
                    0) <<
                    6) >>>
                    0) |
                    (255 & a[s.charCodeAt(e++)])) >>>
                    0) <<
                    6) >>>
                    0) |
                    (255 & a[s.charCodeAt(e++)])) >>>
                    0),
                (r[t++] = (i >> 16) & 255),
                (r[t++] = (i >> 8) & 255),
                (r[t++] = 255 & i);
        this.key_to_bignum(this.pubkey.key1, r, 64),
            (this.pubkey.len =
                this.bitlen_bignum(this.pubkey.key1, 64) - 1);
    }
    len_predata() {
        var e = ((this.pubkey.len - 1) / 8) | 0;
        return ((1 + ((55 / e) | 0)) * (1 + e)) >>> 0;
    }
    cmp_bignum(e, t, i) {
        for (; 0 < i;) {
            if (e[--i] < t[i])
                return -1;
            if (e[i] > t[i])
                return 1;
        }
        return 0;
    }
    mov_bignum(e, t, i) {
        for (let r = 0; r < i; r++)
            e[r] = t[r];
    }
    shr_bignum(e, t, i) {
        let r;
        var s = (t / 32) | 0;
        if (0 < s) {
            for (r = 0; r < i - s; r++)
                e[r] = e[r + s];
            for (; r < i; r++)
                e[r] = 0;
            t %= 32;
        }
        if (0 !== t) {
            for (r = 0; r < i - 1; r++)
                e[r] =
                    ((e[r] >>> t) | ((e[r + 1] << (32 - t)) >>> 0)) >>> 0;
            e[r] = e[r] >>> t;
        }
    }
    shl_bignum(e, t, i) {
        let r;
        var s = (t / 32) | 0;
        if (0 < s) {
            for (r = i - 1; r > s; r--)
                e[r] = e[r - s];
            for (; 0 < r; r--)
                e[r] = 0;
            t %= 32;
        }
        if (0 !== t) {
            for (r = i - 1; 0 < r; r--)
                e[r] =
                    (((e[r] << t) >>> 0) | (e[r - 1] >>> (32 - t))) >>> 0;
            e[0] = (e[0] << t) >>> 0;
        }
    }
    sub_bignum(e, t, i, r, s) {
        var a, n;
        s += s;
        var o = new Uint16Array(t.buffer, t.byteOffset), l = new Uint16Array(i.buffer, i.byteOffset);
        const c = new Uint16Array(e.buffer, e.byteOffset);
        let h = 0;
        for (; -1 != --s;)
            (a = o[h]),
                (n = l[h]),
                (c[h] = (a - n - r) & 65535),
                (r = 0 != ((a - n - r) & 65536) ? 1 : 0),
                h++;
        return r;
    }
    sub_bignum_word(e, t, i, r, s) {
        var a, n;
        let o = 0;
        for (; -1 != --s;)
            (a = t[o]),
                (n = i[o]),
                (e[o] = (a - n - r) & 65535),
                (r = 0 != ((a - n - r) & 65536) ? 1 : 0),
                o++;
        return r;
    }
    inv_bignum(e, t, i) {
        const r = new Uint32Array(64);
        var s;
        let a, n, o = 0;
        for (this.init_bignum(r, 0, i),
            this.init_bignum(e, 0, i),
            n = this.bitlen_bignum(t, i),
            a = (1 << n % 32) >>> 0,
            o = (((n + 32) / 32) | 0) - 1,
            s = (4 * (((n - 1) / 32) | 0)) >>> 0,
            r[(s / 4) | 0] =
                r[(s / 4) | 0] | ((1 << ((n - 1) & 31)) >>> 0); 0 < n;)
            n--,
                this.shl_bignum(r, 1, i),
                -1 !== this.cmp_bignum(r, t, i) &&
                    (this.sub_bignum(r, r, t, 0, i),
                        (e[o] = e[o] | (a >>> 0))),
                (a >>>= 1),
                0 === a && (o--, (a = 2147483648));
        this.init_bignum(r, 0, i);
    }
    inc_bignum(e, t) {
        let i = 0;
        for (; 0 == ++e[i] && 0 < --t;)
            i++;
    }
    init_two_dw(e, t) {
        this.mov_bignum(this.glob1, e, t),
            (this.glob1_bitlen = this.bitlen_bignum(this.glob1, t)),
            (this.glob1_len_x2 = ((this.glob1_bitlen + 15) / 16) | 0),
            this.mov_bignum(this.glob1_hi, this.glob1.subarray(this.len_bignum(this.glob1, t) - 2), 2),
            (this.glob1_hi_bitlen =
                (this.bitlen_bignum(this.glob1_hi, 2) - 32) >>> 0),
            this.shr_bignum(this.glob1_hi, this.glob1_hi_bitlen, 2),
            this.inv_bignum(this.glob1_hi_inv, this.glob1_hi, 2),
            this.shr_bignum(this.glob1_hi_inv, 1, 2),
            (this.glob1_hi_bitlen =
                (((this.glob1_hi_bitlen + 15) % 16) + 1) >>> 0),
            this.inc_bignum(this.glob1_hi_inv, 2),
            32 < this.bitlen_bignum(this.glob1_hi_inv, 2) &&
                (this.shr_bignum(this.glob1_hi_inv, 1, 2),
                    this.glob1_hi_bitlen--),
            (this.glob1_hi_inv_lo = 65535 & this.glob1_hi_inv[0]),
            (this.glob1_hi_inv_hi =
                (this.glob1_hi_inv[0] >>> 16) & 65535);
    }
    mul_bignum_word(e, t, i, r) {
        let s, a;
        var n = new Uint16Array(t.buffer, t.byteOffset);
        let o = (a = 0);
        for (s = 0; s < r; s++)
            (a = i * n[o] + e[o] + a),
                (e[o] = 65535 & a),
                o++,
                (a >>>= 16);
        e[o] += 65535 & a;
    }
    mul_bignum(e, t, i, r) {
        let s;
        var a = new Uint16Array(i.buffer, i.byteOffset);
        let n = new Uint16Array(e.buffer, e.byteOffset);
        this.init_bignum(e, 0, 2 * r);
        let o = 0;
        for (s = 0; s < 2 * r; s++)
            this.mul_bignum_word(n.subarray(o), t, a[o], 2 * r), o++;
    }
    not_bignum(e, t) {
        let i;
        for (i = 0; i < t; i++)
            e[i] = ~e[i] >>> 0;
    }
    neg_bignum(e, t) {
        this.not_bignum(e, t), this.inc_bignum(e, t);
    }
    get_mulword(e, t) {
        let i = (((((((((65535 & (65535 ^ e[t - 1])) * this.glob1_hi_inv_lo +
            65536) >>>
            1) +
            (((65535 ^ e[t - 2]) * this.glob1_hi_inv_hi +
                this.glob1_hi_inv_hi) >>>
                1) +
            1) >>>
            16) +
            (((65535 & (65535 ^ e[t - 1])) * this.glob1_hi_inv_hi) >>>
                1) +
            (((65535 ^ e[t]) * this.glob1_hi_inv_lo) >>> 1) +
            1) >>>
            14) +
            this.glob1_hi_inv_hi * (65535 ^ e[t]) * 2) >>>
            this.glob1_hi_bitlen) >>>
            0;
        return 65535 < i && (i = 65535), 65535 & i;
    }
    dec_bignum(e, t) {
        let i = 0;
        for (; --e[i] >>> 0 == 4294967295 && 0 < --t;)
            i++;
    }
    calc_a_bignum(e, t, i, r) {
        var s;
        let a;
        var n = this.glob1, o = this.glob2;
        if ((this.mul_bignum(this.glob2, t, i, r),
            (this.glob2[2 * r] = 0),
            (s = 2 * this.len_bignum(this.glob2, 2 * r + 1)) >=
                this.glob1_len_x2)) {
            this.inc_bignum(this.glob2, 2 * r + 1),
                this.neg_bignum(this.glob2, 2 * r + 1),
                (a = 1 + s - this.glob1_len_x2);
            let e = new Uint16Array(o.buffer), t = a, i = 1 + s;
            for (; 0 !== a; a--) {
                i--;
                var l = this.get_mulword(e, i);
                t--;
                var c = e.subarray(t);
                0 < l &&
                    (this.mul_bignum_word(c, this.glob1, l, 2 * r),
                        0 == (32768 & e[i]) &&
                            0 !==
                                this.sub_bignum_word(c, c, new Uint16Array(n.buffer), 0, 2 * r) &&
                            e[i]--);
            }
            this.neg_bignum(this.glob2, r),
                this.dec_bignum(this.glob2, r);
        }
        this.mov_bignum(e, this.glob2, r);
    }
    clear_tmp_vars(e) {
        this.init_bignum(this.glob1, 0, e),
            this.init_bignum(this.glob2, 0, e),
            this.init_bignum(this.glob1_hi_inv, 0, 4),
            this.init_bignum(this.glob1_hi, 0, 4),
            (this.glob1_bitlen = 0),
            (this.glob1_hi_bitlen = 0),
            (this.glob1_len_x2 = 0),
            (this.glob1_hi_inv_lo = 0),
            (this.glob1_hi_inv_hi = 0);
    }
    calc_a_key(e, t, i, r, s) {
        var a, n, o = new Uint32Array(64);
        let l, c, h = 0;
        for (this.init_bignum(e, 1, s),
            n = this.len_bignum(r, s),
            this.init_two_dw(r, n),
            l = (this.bitlen_bignum(i, n) << 24) >> 24,
            a = (((l + 31) / 32) | 0) >>> 0,
            c = (1 << (l - 1) % 32) >>> 1,
            h += a - 1,
            l--,
            this.mov_bignum(e, t, n); -1 != --l;)
            0 === c && ((c = 2147483648), h--),
                this.calc_a_bignum(o, e, e, n),
                0 != (i[h] & c)
                    ? this.calc_a_bignum(e, o, t, n)
                    : this.mov_bignum(e, o, n),
                (c >>>= 1);
        this.init_bignum(o, 0, n), this.clear_tmp_vars(s);
    }
    memcpy(e, t, i) {
        let r = 0;
        for (; 0 != i--;)
            (e[r] = t[r]), r++;
    }
    process_predata(e, t, i) {
        var r = new Uint32Array(64), s = new Uint32Array(64);
        let a = 0, n = 0;
        for (var o = ((this.pubkey.len - 1) / 8) | 0; 1 + o <= t;)
            this.init_bignum(r, 0, 64),
                this.memcpy(new Uint8Array(r.buffer), e.subarray(a), 1 + o),
                this.calc_a_key(s, r, this.pubkey.key2, this.pubkey.key1, 64),
                this.memcpy(i.subarray(n), new Uint8Array(s.buffer), o),
                (t -= 1 + o),
                (a += 1 + o),
                (n += o);
    }
    decryptKey(e) {
        this.init_pubkey();
        let t = new Uint8Array(256);
        return (this.process_predata(e, this.len_predata(), t),
            t.subarray(0, 56));
    }
}
