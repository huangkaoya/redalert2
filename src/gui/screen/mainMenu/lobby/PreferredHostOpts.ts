import { GameOpts } from '@/game/gameopts/GameOpts';
export class PreferredHostOpts {
    gameSpeed: number = 6;
    credits: number = 10000;
    unitCount: number = 10;
    shortGame: boolean = true;
    superWeapons: boolean = false;
    buildOffAlly: boolean = true;
    mcvRepacks: boolean = true;
    cratesAppear: boolean = false;
    hostTeams: boolean = false;
    destroyableBridges: boolean = true;
    multiEngineer: boolean = false;
    noDogEngiKills: boolean = false;
    slotsClosed: Set<number> = new Set();
    serialize(): string {
        return [
            this.gameSpeed,
            this.credits,
            this.unitCount,
            Number(this.shortGame),
            Number(this.superWeapons),
            Number(this.buildOffAlly),
            Number(this.mcvRepacks),
            Number(this.cratesAppear),
            [...this.slotsClosed].join(','),
            Number(this.hostTeams),
            Number(this.destroyableBridges),
            Number(this.multiEngineer),
            Number(this.noDogEngiKills),
        ].join(';');
    }
    unserialize(data: string): this {
        const [gameSpeed, credits, unitCount, shortGame, superWeapons, buildOffAlly, mcvRepacks, cratesAppear, slotsClosed, hostTeams = '0', destroyableBridges = '1', multiEngineer, noDogEngiKills] = data.split(';');
        this.gameSpeed = Number(gameSpeed);
        this.credits = Number(credits);
        this.unitCount = Number(unitCount);
        this.shortGame = Boolean(Number(shortGame));
        this.superWeapons = Boolean(Number(superWeapons));
        this.buildOffAlly = Boolean(Number(buildOffAlly));
        this.mcvRepacks = Boolean(Number(mcvRepacks));
        this.cratesAppear = Boolean(Number(cratesAppear));
        this.hostTeams = Boolean(Number(hostTeams));
        this.destroyableBridges = Boolean(Number(destroyableBridges));
        this.multiEngineer = Boolean(Number(multiEngineer));
        this.noDogEngiKills = Boolean(Number(noDogEngiKills));
        this.slotsClosed = new Set(slotsClosed && slotsClosed.length > 0
            ? slotsClosed.split(',').map(Number)
            : []);
        return this;
    }
    applyMpDialogSettings(mpDialogSettings: any): this {
        this.gameSpeed = mpDialogSettings.gameSpeed ?? this.gameSpeed;
        this.credits = mpDialogSettings.money ?? this.credits;
        this.unitCount = mpDialogSettings.unitCount ?? this.unitCount;
        this.shortGame = mpDialogSettings.shortGame ?? this.shortGame;
        this.superWeapons = mpDialogSettings.superWeapons ?? this.superWeapons;
        this.buildOffAlly = mpDialogSettings.buildOffAlly ?? this.buildOffAlly;
        this.mcvRepacks = mpDialogSettings.mcvRedeploys ?? this.mcvRepacks;
        this.cratesAppear = mpDialogSettings.crates ?? this.cratesAppear;
        this.destroyableBridges = mpDialogSettings.bridgeDestruction ?? this.destroyableBridges;
        this.multiEngineer = mpDialogSettings.multiEngineer ?? this.multiEngineer;
        this.noDogEngiKills = mpDialogSettings.noDogEngiKills ?? this.noDogEngiKills;
        return this;
    }
    applyGameOpts(gameOpts: GameOpts): this {
        this.gameSpeed = gameOpts.gameSpeed;
        this.credits = gameOpts.credits;
        this.unitCount = gameOpts.unitCount;
        this.shortGame = gameOpts.shortGame;
        this.superWeapons = gameOpts.superWeapons;
        this.buildOffAlly = gameOpts.buildOffAlly;
        this.mcvRepacks = gameOpts.mcvRepacks;
        this.cratesAppear = gameOpts.cratesAppear;
        this.hostTeams = gameOpts.hostTeams ?? false;
        this.destroyableBridges = gameOpts.destroyableBridges;
        this.multiEngineer = gameOpts.multiEngineer;
        this.noDogEngiKills = gameOpts.noDogEngiKills;
        return this;
    }
}
