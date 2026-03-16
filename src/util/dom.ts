export function getOffset(element: HTMLElement): {
    top: number;
    left: number;
} {
    let top = 0;
    let left = 0;
    let currentElement: HTMLElement | null = element;
    while (currentElement) {
        top += currentElement.offsetTop || 0;
        left += currentElement.offsetLeft || 0;
        currentElement = currentElement.offsetParent as HTMLElement | null;
    }
    return { top, left };
}
export function contains(container: Element, element: Element | null): boolean {
    let currentElement: Element | null = element;
    do {
        if (currentElement === container) {
            return true;
        }
    } while ((currentElement = currentElement?.parentElement || null));
    return false;
}
