import type {FieldState, SideState} from './types';

export function defaultSide(): SideState {
  return {
    spikes: 0,
    isSR: false,
    steelsurge: false,
    vinelash: false,
    wildfire: false,
    cannonade: false,
    volcalith: false,
    isReflect: false,
    isLightScreen: false,
    isProtected: false,
    isSeeded: false,
    isNightmared: false,
    isSaltCured: false,
    isForesight: false,
    isCharge: false,
    isHelpingHand: false,
    isTailwind: false,
    isFlowerGift: false,
    isPowerTrick: false,
    isSteelySpirit: false,
    isFriendGuard: false,
    isAuroraVeil: false,
    isBattery: false,
    isPowerSpot: false,
    isSwitchingOut: false,
    plusOneAll: false,
  };
}

export function defaultField(): FieldState {
  return {
    gameType: 'Singles',
    weather: '',
    terrain: '',
    isMagicRoom: false,
    isWonderRoom: false,
    isGravity: false,
    isBeadsOfRuin: false,
    isSwordOfRuin: false,
    isTabletsOfRuin: false,
    isVesselOfRuin: false,
    p1: defaultSide(),
    p2: defaultSide(),
  };
}

export const WEATHERS = [
  {value: '', label: 'None'},
  {value: 'Sun', label: 'Sun', from: 2},
  {value: 'Rain', label: 'Rain', from: 2},
  {value: 'Sand', label: 'Sand', from: 2},
  {value: 'Hail', label: 'Hail', from: 3, until: 8},
  {value: 'Snow', label: 'Snow', from: 9},
  {value: 'Harsh Sunshine', label: 'Harsh Sunshine', from: 6, until: 7},
  {value: 'Heavy Rain', label: 'Heavy Rain', from: 6, until: 7},
  {value: 'Strong Winds', label: 'Strong Winds', from: 6, until: 7},
] as const;

export const TERRAINS = [
  {value: 'Electric', label: 'Electric'},
  {value: 'Grassy', label: 'Grassy'},
  {value: 'Misty', label: 'Misty'},
  {value: 'Psychic', label: 'Psychic Terrain'},
] as const;
