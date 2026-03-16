export class MapLighting {
    level: number;
    ambient: number;
    red: number;
    green: number;
    blue: number;
    ground: number;
    forceTint: boolean;
    constructor() {
        this.level = 0;
        this.ambient = 1;
        this.red = 1;
        this.green = 1;
        this.blue = 1;
        this.ground = 0;
        this.forceTint = false;
    }
    read(reader: any, prefix: string = ""): MapLighting {
        this.level = reader.getNumber(prefix + "Level", 0.032);
        this.ambient = reader.getNumber(prefix + "Ambient", 1);
        this.red = reader.getNumber(prefix + "Red", 1);
        this.green = reader.getNumber(prefix + "Green", 1);
        this.blue = reader.getNumber(prefix + "Blue", 1);
        this.ground = reader.getNumber(prefix + "Ground", 0);
        return this;
    }
    copy(source: MapLighting): MapLighting {
        this.level = source.level;
        this.ambient = source.ambient;
        this.red = source.red;
        this.green = source.green;
        this.blue = source.blue;
        this.ground = source.ground;
        this.forceTint = source.forceTint;
        return this;
    }
}
