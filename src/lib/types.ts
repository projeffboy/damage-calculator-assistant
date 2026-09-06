export type GenerationNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type CalcGen = 0 | GenerationNum;

export type Mode =
  | 'one-vs-one'
  | 'one-vs-all'
  | 'all-vs-one'
  | 'champions'
  | 'randoms'
  | 'oms';

export type Notation = '%' | 'px';
export type Theme = 'auto' | 'light' | 'dark';

export type StatID = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export type StatsTable = Record<StatID, number>;

export type StatusName = '' | 'psn' | 'tox' | 'brn' | 'par' | 'slp' | 'frz';
export type Gender = '' | 'M' | 'F' | 'N';
export type MoveCategory = 'Physical' | 'Special' | 'Status';

export const STAT_IDS: StatID[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

export const STAT_LABELS: Record<StatID, string> = {
  hp: 'HP',
  atk: 'Attack',
  def: 'Defense',
  spa: 'Sp. Atk',
  spd: 'Sp. Def',
  spe: 'Speed',
};

export const GEN1_STAT_LABELS: Record<StatID, string> = {
  hp: 'HP',
  atk: 'Attack',
  def: 'Defense',
  spa: 'Special',
  spd: 'Special',
  spe: 'Speed',
};

export interface MoveSlot {
  name: string;
  bp: number;
  type: string;
  category: MoveCategory;
  isCrit: boolean;
  useZ: boolean;
  isStellarFirstUse: boolean;
  hits: number;
  timesUsed: number;
  timesUsedWithMetronome: number;
}

export interface PokemonState {
  species: string;
  types: [string, string];
  teraType: string;
  teraActive: boolean;
  gender: Gender;
  gmax: boolean;
  level: number;
  weightkg: number;
  baseStats: StatsTable;
  ivs: StatsTable;
  evs: StatsTable;
  boosts: StatsTable;
  nature: string;
  ability: string;
  abilityOn: boolean;
  item: string;
  status: StatusName;
  toxicCounter: number;
  curHP: number;
  percentHP: number;
  isDynamaxed: boolean;
  alliesFainted: number;
  boostedStat: '' | 'auto' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
  moves: [MoveSlot, MoveSlot, MoveSlot, MoveSlot];
}

export interface SideState {
  spikes: number;
  isSR: boolean;
  steelsurge: boolean;
  vinelash: boolean;
  wildfire: boolean;
  cannonade: boolean;
  volcalith: boolean;
  isReflect: boolean;
  isLightScreen: boolean;
  isProtected: boolean;
  isSeeded: boolean;
  isNightmared: boolean;
  isSaltCured: boolean;
  isForesight: boolean;
  isCharge: boolean;
  isHelpingHand: boolean;
  isTailwind: boolean;
  isFlowerGift: boolean;
  isPowerTrick: boolean;
  isSteelySpirit: boolean;
  isFriendGuard: boolean;
  isAuroraVeil: boolean;
  isBattery: boolean;
  isPowerSpot: boolean;
  isSwitchingOut: boolean;
  plusOneAll: boolean;
}

export interface FieldState {
  gameType: 'Singles' | 'Doubles';
  weather: string;
  terrain: string;
  isMagicRoom: boolean;
  isWonderRoom: boolean;
  isGravity: boolean;
  isBeadsOfRuin: boolean;
  isSwordOfRuin: boolean;
  isTabletsOfRuin: boolean;
  isVesselOfRuin: boolean;
  p1: SideState;
  p2: SideState;
}

export interface CalcSet {
  level?: number;
  ability?: string;
  item?: string;
  nature?: string;
  gender?: Gender;
  evs?: Partial<StatsTable>;
  ivs?: Partial<StatsTable>;
  moves: string[];
  teraType?: string;
}

export type Setdex = Record<string, Record<string, CalcSet>>;
