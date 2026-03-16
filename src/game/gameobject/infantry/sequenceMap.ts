import { ZoneType } from '@/game/gameobject/unit/ZoneType';
import { SequenceType } from '../../art/SequenceType';
import { StanceType } from './StanceType';
import { InfDeathType } from './InfDeathType';
export const getFireSequenceBy = (zone: ZoneType, stance: StanceType = StanceType.None): SequenceType => {
    if (stance === StanceType.Deployed) {
        return SequenceType.DeployedFire;
    }
    if (zone === ZoneType.Water) {
        return SequenceType.WetAttack;
    }
    if (zone === ZoneType.Air) {
        return SequenceType.FireFly;
    }
    if (stance === StanceType.Prone) {
        return SequenceType.FireProne;
    }
    return SequenceType.FireUp;
};
export const getMoveSequenceBy = (zone: ZoneType, stance: StanceType, isPanic: boolean): SequenceType => {
    if (zone === ZoneType.Air) {
        return SequenceType.Fly;
    }
    if (zone === ZoneType.Water) {
        return SequenceType.Swim;
    }
    if (stance === StanceType.Prone) {
        return SequenceType.Crawl;
    }
    return isPanic ? SequenceType.Panic : SequenceType.Walk;
};
export const getIdleSequenceBy = (zone: ZoneType, stance: StanceType = StanceType.None): SequenceType[] | undefined => {
    if (stance === StanceType.Deployed) {
        return [SequenceType.DeployedIdle];
    }
    if (zone === ZoneType.Water) {
        return [SequenceType.WetIdle1, SequenceType.WetIdle2];
    }
    if (zone !== ZoneType.Air) {
        return [SequenceType.Idle1, SequenceType.Idle2];
    }
    return undefined;
};
export const getStillSequenceBy = (zone: ZoneType, stance: StanceType = StanceType.None): SequenceType => {
    if (stance === StanceType.Deployed) {
        return SequenceType.Deployed;
    }
    if (zone === ZoneType.Water) {
        return SequenceType.Tread;
    }
    if (zone === ZoneType.Air) {
        return SequenceType.Hover;
    }
    if (stance === StanceType.Prone) {
        return SequenceType.Prone;
    }
    if (stance === StanceType.Guard) {
        return SequenceType.Guard;
    }
    if (stance === StanceType.Paradrop) {
        return SequenceType.Paradrop;
    }
    return SequenceType.Ready;
};
export const getStanceTransitionSequenceBy = (fromStance: StanceType, toStance: StanceType): SequenceType | undefined => {
    if (fromStance === StanceType.Prone) {
        return SequenceType.Up;
    }
    if (toStance === StanceType.Prone) {
        return SequenceType.Down;
    }
    if (fromStance === StanceType.Deployed) {
        return SequenceType.Undeploy;
    }
    if (toStance === StanceType.Deployed) {
        return SequenceType.Deploy;
    }
    if (toStance === StanceType.Cheer) {
        return SequenceType.Cheer;
    }
    return undefined;
};
export const getCrashingSequences = (unit: {
    art: {
        sequences: Map<SequenceType, any>;
    };
}): SequenceType[] | undefined => {
    const availableSequences = [...unit.art.sequences.keys()];
    const sequences = [
        SequenceType.AirDeathStart,
        SequenceType.AirDeathFalling,
    ].filter(seq => availableSequences.includes(seq));
    return sequences.length ? sequences : undefined;
};
export const getDeathSequence = (unit: {
    zone: ZoneType;
    rules: {
        isHuman: boolean;
    };
    art: {
        sequences: Map<SequenceType, any>;
    };
    isCrashing: boolean;
}, deathType: InfDeathType): SequenceType[] | undefined => {
    const zone = unit.zone;
    const isHuman = unit.rules.isHuman;
    const availableSequences = [...unit.art.sequences.keys()];
    let sequences: SequenceType[] | undefined;
    if (unit.isCrashing) {
        sequences = [SequenceType.AirDeathFinish];
    }
    else if (zone === ZoneType.Air) {
        sequences = [SequenceType.Tumble];
    }
    else if (zone === ZoneType.Water) {
        if (![InfDeathType.Gunfire, InfDeathType.Explode].includes(deathType) && isHuman) {
            sequences = [SequenceType.WetDie1, SequenceType.WetDie2];
        }
    }
    else if (deathType !== InfDeathType.Gunfire && isHuman) {
        if (deathType === InfDeathType.Explode) {
            sequences = [SequenceType.Die2];
        }
    }
    else {
        sequences = [SequenceType.Die1];
    }
    if (sequences) {
        sequences = sequences.filter(seq => availableSequences.includes(seq));
        if (!sequences.length) {
            sequences = undefined;
        }
    }
    return sequences;
};
export const getDeathAnim = (unit: {
    audioVisual: {
        infantryExplode: any;
        flamingInfantry: any;
        infantryHeadPop: any;
        infantryNuked: any;
    };
    animationNames: string[];
}, deathType: InfDeathType): any => {
    switch (deathType) {
        case InfDeathType.ExplodeAlt:
            return unit.audioVisual.infantryExplode;
        case InfDeathType.Fire:
            return unit.audioVisual.flamingInfantry;
        case InfDeathType.Electro:
            return [...unit.animationNames][1];
        case InfDeathType.HeadExplode:
            return unit.audioVisual.infantryHeadPop;
        case InfDeathType.Nuke:
            return unit.audioVisual.infantryNuked;
        default:
            return undefined;
    }
};
export const findSequence = (zone: ZoneType, stance: StanceType, isMoving: boolean, isFiring: boolean, isPanic: boolean, availableSequences: SequenceType[]): SequenceType | undefined => {
    const isAvailable = (seq: SequenceType) => availableSequences.indexOf(seq) !== -1;
    let sequence: SequenceType | undefined;
    if (isFiring) {
        sequence = getFireSequenceBy(zone, stance);
        if (!isAvailable(sequence)) {
            sequence = getFireSequenceBy(zone);
            if (!isAvailable(sequence)) {
                sequence = undefined;
            }
        }
    }
    if (sequence === undefined && isMoving) {
        sequence = getMoveSequenceBy(zone, stance, isPanic);
        if (!isAvailable(sequence)) {
            sequence = getMoveSequenceBy(zone, StanceType.None, isPanic);
            if (!isAvailable(sequence)) {
                sequence = undefined;
            }
        }
    }
    if (sequence === undefined) {
        sequence = getStillSequenceBy(zone, stance);
        if (!isAvailable(sequence)) {
            sequence = getStillSequenceBy(zone);
            if (!isAvailable(sequence)) {
                sequence = getStillSequenceBy(ZoneType.Ground);
            }
        }
    }
    return sequence;
};
