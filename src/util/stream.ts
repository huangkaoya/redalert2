export async function* makeTextFileLineIterator(file: File): AsyncGenerator<string> {
    const decoder = new TextDecoder("utf-8");
    const reader = file.stream().getReader();
    let { value: chunk, done } = await reader.read();
    let text = chunk ? decoder.decode(chunk, { stream: true }) : "";
    const lineEndingRegex = /\r\n|\n|\r/gm;
    let startIndex = 0;
    while (true) {
        const match = lineEndingRegex.exec(text);
        if (match) {
            yield text.substring(startIndex, match.index);
            startIndex = lineEndingRegex.lastIndex;
        }
        else {
            if (done)
                break;
            const remaining = text.substr(startIndex);
            ({ value: chunk, done } = await reader.read());
            text = remaining + (chunk ? decoder.decode(chunk, { stream: true }) : "");
            startIndex = lineEndingRegex.lastIndex = 0;
        }
    }
    if (startIndex < text.length) {
        yield text.substr(startIndex);
    }
}
