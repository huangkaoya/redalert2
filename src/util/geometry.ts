import { isBetween } from "./math";
import * as THREE from "three";
interface Point {
    x: number;
    y: number;
}
interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface Circle {
    center: Point;
    radius: number;
}
export function pointEquals(a: Point | null | undefined, b: Point | null | undefined): boolean {
    return (a && b && a.x === b.x && a.y === b.y) || (!a && !b);
}
export function rectIntersect(a: Rect, b: Rect): boolean {
    return (a.x <= b.x + b.width &&
        b.x <= a.x + a.width &&
        a.y <= b.y + b.height &&
        b.y <= a.y + a.height);
}
export function rectEquals(a: Rect, b: Rect): boolean {
    return (a.x === b.x &&
        a.y === b.y &&
        a.width === b.width &&
        a.height === b.height);
}
export function circleIntersect(a: Circle, b: Circle): boolean {
    const centerA = a.center;
    const centerB = b.center;
    return isBetween((centerA.x - centerB.x) * (centerA.x - centerB.x) + (centerA.y - centerB.y) * (centerA.y - centerB.y), (a.radius - b.radius) * (a.radius - b.radius), (a.radius + b.radius) * (a.radius + b.radius));
}
export function circleContainsPoint(circle: Circle, point: Point): boolean {
    const center = circle.center;
    return ((center.x - point.x) * (center.x - point.x) + (center.y - point.y) * (center.y - point.y) <=
        circle.radius * circle.radius);
}
export function rectContainsPoint(rect: Rect, point: Point): boolean {
    const box = new THREE.Box2(new THREE.Vector2(rect.x, rect.y), new THREE.Vector2(rect.x + rect.width, rect.y + rect.height));
    return box.containsPoint(new THREE.Vector2(point.x, point.y));
}
export function rectContainsRect(outer: Rect, inner: Rect): boolean {
    const outerBox = new THREE.Box2(new THREE.Vector2(outer.x, outer.y), new THREE.Vector2(outer.x + outer.width, outer.y + outer.height));
    const innerBox = new THREE.Box2(new THREE.Vector2(inner.x, inner.y), new THREE.Vector2(inner.x + inner.width, inner.y + inner.height));
    return outerBox.containsBox(innerBox);
}
export function rectClampPoint(rect: Rect, point: Point): THREE.Vector2 {
    const box = new THREE.Box2(new THREE.Vector2(rect.x, rect.y), new THREE.Vector2(rect.x + rect.width, rect.y + rect.height));
    return box.clampPoint(new THREE.Vector2(point.x, point.y), new THREE.Vector2());
}
export function octileDistance(a: Point, b: Point): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
}
