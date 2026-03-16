export function bresenham(x0: number, y0: number, x1: number, y1: number, callback?: (x: number, y: number) => void): Array<{
    x: number;
    y: number;
}> {
    const points: Array<{
        x: number;
        y: number;
    }> = [];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    let error = 0;
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    callback = callback || ((x: number, y: number) => {
        points.push({ x, y });
    });
    if (absDy < absDx) {
        for (let x = x0, y = y0; stepX < 0 ? x >= x1 : x <= x1; x += stepX) {
            callback(x, y);
            error += absDy;
            if ((error << 1) >= absDx) {
                y += stepY;
                error -= absDx;
            }
        }
    }
    else {
        for (let x = x0, y = y0; stepY < 0 ? y >= y1 : y <= y1; y += stepY) {
            callback(x, y);
            error += absDx;
            if ((error << 1) >= absDy) {
                x += stepX;
                error -= absDy;
            }
        }
    }
    return points;
}
