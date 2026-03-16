export class Mouse {
    private static instance: Mouse;
    private constructor() { }
    public static getInstance(): Mouse {
        if (!Mouse.instance) {
            Mouse.instance = new Mouse();
        }
        return Mouse.instance;
    }
}
