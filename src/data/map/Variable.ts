export class Variable {
    name: string;
    value: any;
    constructor(name: string, value: any) {
        this.name = name;
        this.value = value;
    }
    clone(): Variable {
        return new Variable(this.name, this.value);
    }
}
