import { pad } from "./string";
export class Color {
    public r: number;
    public g: number;
    public b: number;
    static fromRgb(r: number, g: number, b: number): Color {
        return new Color(r, g, b);
    }
    static fromHsv(h: number, s: number, v: number): Color {
        let r_out = 0, g_out = 0, b_out = 0;
        const h_norm = ((h / 255) * 360) % 360;
        const s_norm = s / 255;
        const v_norm = v / 255;
        if (s_norm === 0) {
            r_out = v_norm;
            g_out = v_norm;
            b_out = v_norm;
        }
        else {
            const i = Math.floor(h_norm / 60);
            const f = h_norm / 60 - i;
            const p = v_norm * (1 - s_norm);
            const q = v_norm * (1 - s_norm * f);
            const t = v_norm * (1 - s_norm * (1 - f));
            switch (i) {
                case 0:
                    r_out = v_norm;
                    g_out = t;
                    b_out = p;
                    break;
                case 1:
                    r_out = q;
                    g_out = v_norm;
                    b_out = p;
                    break;
                case 2:
                    r_out = p;
                    g_out = v_norm;
                    b_out = t;
                    break;
                case 3:
                    r_out = p;
                    g_out = q;
                    b_out = v_norm;
                    break;
                case 4:
                    r_out = t;
                    g_out = p;
                    b_out = v_norm;
                    break;
                case 5:
                default:
                    r_out = v_norm;
                    g_out = p;
                    b_out = q;
                    break;
            }
        }
        return Color.fromRgb(Math.floor(r_out * 255), Math.floor(g_out * 255), Math.floor(b_out * 255));
    }
    constructor(r: number, g: number, b: number) {
        this.r = r;
        this.g = g;
        this.b = b;
    }
    asHex(): number {
        return (this.r << 16) | (this.g << 8) | this.b;
    }
    asHexString(): string {
        return "#" + this.asHex().toString(16).padStart(6, '0');
    }
    clone(): Color {
        return new Color(this.r, this.g, this.b);
    }
}
