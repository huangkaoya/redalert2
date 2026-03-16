export class SpecialFlags {
    initialVeteran: boolean;
    read(data: {
        getBool: (key: string) => boolean;
    }): SpecialFlags {
        this.initialVeteran = data.getBool("InitialVeteran");
        return this;
    }
}
