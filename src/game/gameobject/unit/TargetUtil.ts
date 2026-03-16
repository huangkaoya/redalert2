import { Vector3 } from '@/game/math/Vector3';
import { degToRad, rotateVec2 } from '@/game/math/geometry';
import { GameMath } from '@/game/math/GameMath';
import { Vector2 } from '@/game/math/Vector2';
export class TargetUtil {
    static computeInterceptPoint(source: Vector3, speed: number, target: Vector3, targetVelocity: Vector3): Vector3 {
        const relativePos = source.clone().sub(target);
        const targetSpeed = targetVelocity.length();
        const a = speed * speed - targetSpeed * targetSpeed;
        const b = 2 * relativePos.dot(targetVelocity);
        const c = -relativePos.dot(relativePos);
        if (b * b - 4 * a * c < 0) {
            return new Vector3();
        }
        const time = (-b + GameMath.sqrt(b * b - 4 * a * c)) / (2 * a);
        return targetVelocity.clone().multiplyScalar(time).add(target);
    }
    static computeTurnCircle(position: Vector2, direction: Vector2, turnRate: number, speed: number): {
        center: Vector2;
        radius: number;
    } {
        const radius = speed / degToRad(Math.abs(turnRate));
        const perpendicular = rotateVec2(direction.clone(), 90 * -Math.sign(turnRate));
        return {
            center: isFinite(radius)
                ? perpendicular.setLength(radius).add(position)
                : position.clone(),
            radius,
        };
    }
}
