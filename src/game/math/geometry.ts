import { clamp } from "../../util/math";
import { GameMath } from "./GameMath";
import { Matrix4 } from "./Matrix4";
import { Quaternion } from "./Quaternion";
import { Vector2 } from "./Vector2";
import { Vector3 } from "./Vector3";
const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;
export function radToDeg(rad: number): number {
    return rad * RAD2DEG;
}
export function degToRad(deg: number): number {
    return deg * DEG2RAD;
}
export function rotateVec2(vec: Vector2, angle: number): Vector2 {
    const rad = degToRad(Math.floor(angle));
    return vec.rotateAround(new Vector2(), rad);
}
export function angleDegFromVec2(vec: Vector2): number {
    return Math.round(radToDeg(vec.angle()));
}
export function angleDegBetweenVec2(vec1: Vector2, vec2: Vector2): number {
    const angle1 = angleDegFromVec2(vec1);
    const angle2 = angleDegFromVec2(vec2);
    return Math.min((angle1 - angle2 + 360) % 360, (angle2 - angle1 + 360) % 360);
}
export function angleDegBetweenVec3(vec1: Vector3, vec2: Vector3): number {
    return angleBetweenQuaternions(quaternionFromVec3(vec1, new Quaternion()), quaternionFromVec3(vec2, new Quaternion()));
}
export function quaternionFromVec3(vec: Vector3, quat: Quaternion = new Quaternion()): Quaternion {
    return quat.setFromRotationMatrix(new Matrix4().lookAt(vec, new Vector3(0, 0, 0), new Vector3(0, 1, 0)));
}
export function rotateVec3Towards(vec: Vector3, target: Vector3, maxAngle: number): void {
    const length = vec.length();
    const targetQuat = quaternionFromVec3(target, new Quaternion());
    const currentQuat = quaternionFromVec3(vec, new Quaternion());
    const angle = angleBetweenQuaternions(currentQuat, targetQuat);
    if (angle !== 0) {
        const t = Math.min(1, maxAngle / angle);
        currentQuat.slerp(targetQuat, t);
    }
    vec.set(0, 0, 1).applyQuaternion(currentQuat).setLength(length);
}
function angleBetweenQuaternions(q1: Quaternion, q2: Quaternion): number {
    const angle = radToDeg(2 * GameMath.acos(Math.abs(clamp(q1.dot(q2), -1, 1))));
    return Math.round(angle);
}
