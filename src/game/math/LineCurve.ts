import { Vector2 } from "./Vector2";
import { LineCurve as ThreeLineCurve } from "three";
export class LineCurve extends ThreeLineCurve {
    constructor(v1?: Vector2, v2?: Vector2) {
        super(v1 || new Vector2(), v2 || new Vector2());
    }
    getPoint(t: number, optionalTarget?: Vector2): Vector2 {
        return super.getPoint(t, optionalTarget || new Vector2());
    }
}
