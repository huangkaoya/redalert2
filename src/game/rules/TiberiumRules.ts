export class TiberiumRules {
    public value: number;
    readIni(ini: any): this {
        this.value = ini.getNumber("Value");
        return this;
    }
}
