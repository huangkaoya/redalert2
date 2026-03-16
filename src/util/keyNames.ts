const keyMap = new Map<number, string>([
    [8, "Backspace"],
    [9, "Tab"],
    [12, "Clear"],
    [13, "Enter"],
    [19, "Pause/Break"],
    [20, "CapsLock"],
    [27, "Esc"],
    [32, "Space"],
    [33, "PageUp"],
    [34, "PageDown"],
    [35, "End"],
    [36, "Home"],
    [37, "ArrowLeft"],
    [38, "ArrowUp"],
    [39, "ArrowRight"],
    [40, "ArrowDown"],
    [44, "PrintScreen"],
    [45, "Insert"],
    [46, "Delete"],
    [91, "LeftWin/⌘"],
    [92, "RightWin/⌘"],
    ...Array.from({ length: 10 }, (_, i): [
        number,
        string
    ] => [96 + i, `Num${i}`]),
    [106, "Num*"],
    [107, "Num+"],
    [109, "Num-"],
    [110, "NumDel"],
    [111, "Num/"],
    ...Array.from({ length: 32 }, (_, i): [
        number,
        string
    ] => [111 + i + 1, `F${i + 1}`]),
    [144, "NumLock"],
    [145, "ScrollLock"],
    [186, ";"],
    [187, "="],
    [188, ","],
    [189, "-"],
    [190, "."],
    [191, "/"],
    [192, "`"],
    [219, "["],
    [220, "\\"],
    [221, "]"],
    [222, "'"],
]);
export function getKeyName(keyCode: number): string {
    const name = keyMap.get(keyCode);
    return name !== undefined ? name : String.fromCharCode(keyCode);
}
