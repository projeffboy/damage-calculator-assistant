import {useEffect, useMemo, useState} from 'react';
import type {CalcGen, Notation, PokemonState, Theme} from '../lib/types';
import {applySet, applySpecies, defaultPokemon} from '../lib/pokemon';
import {GEN_BUTTONS} from '../lib/dex';
import {availableSpeciesNames} from '../lib/availability';
import {spsFromEvs} from '../lib/adapters';
import {importOrderedSets} from '../lib/importExport';
import {
  applySwitchIn,
  emptyReveals,
  emptyTeam,
  filledIndexes,
  leadsCount,
  markReveal,
  partySize,
  resetBattleField,
  resetPokemon,
  resizeTeam,
  resolveReveals,
  rosterFromTeams,
  slotToMember,
  SQUAD_SIZE,
  type Reveal,
  type SideKey,
  type Team,
} from '../lib/team';
import {
  defaultTarget,
  defaultTargetMap,
  previewCombo,
  slotsOnTeam,
  teamOf,
  visibleSlots,
  type ArmedAction,
  type ComboHit,
  type VisualSlot,
} from '../lib/visual';
import {FieldPanel} from './FieldPanel';
import {PokemonIcon} from './PokemonIcon';
import {SpeciesPicker} from './SpeciesPicker';
import {TeamRail} from './TeamRail';
import {VisualPaste} from './VisualPaste';
import {VisualPokemonCard} from './VisualPokemonCard';
import {slotLabel, VisualStage} from './VisualStage';

interface VisualSimProps {
  theme: Theme;
  onTheme: (theme: Theme) => void;
}

type EditRef = {side: SideKey; index: number};

function doublesField() {
  return resetBattleField('Doubles');
}

export function VisualSim({theme, onTheme}: VisualSimProps) {
  const [calcGen, setCalcGen] = useState<CalcGen>(0);
  const [notation, setNotation] = useState<Notation>('%');
  const [field, setFieldState] = useState(doublesField);
  const doubles = field.gameType === 'Doubles';
  const bring = partySize(doubles);
  const leads = leadsCount(doubles);
  const [p1Team, setP1Team] = useState<Team>(() => emptyTeam());
  const [p2Team, setP2Team] = useState<Team>(() => emptyTeam());
  const [p1Party, setP1Party] = useState<number[]>([]);
  const [p1Active, setP1Active] = useState<number[]>(() => [-1, -1]);
  const [p2Active, setP2Active] = useState<number[]>(() => [-1, -1]);
  const [p2Reveals, setP2Reveals] = useState<Reveal[]>(() => emptyReveals());
  const [pickingParty, setPickingParty] = useState(false);
  const [pickOrder, setPickOrder] = useState<number[]>([]);
  const [switching, setSwitching] = useState(false);
  const [assigning, setAssigning] = useState<VisualSlot | null>(null);
  const [editing, setEditing] = useState<EditRef | null>(null);
  const [armed, setArmed] = useState<Partial<Record<VisualSlot, number>>>({});
  const [targets, setTargets] = useState(() => defaultTargetMap(true));
  const [previewSide, setPreviewSide] = useState<'p1' | 'p2'>('p1');

  const names = useMemo(
    () => availableSpeciesNames(calcGen, calcGen === 0 ? 'champions' : 'one-vs-one'),
    [calcGen],
  );
  const unrestricted = false;
  const roster = useMemo(
    () => rosterFromTeams(p1Team, p2Team, p1Active, p2Active, doubles),
    [doubles, p1Active, p1Team, p2Active, p2Team],
  );

  const actions: ArmedAction[] = useMemo(() => {
    return slotsOnTeam(previewSide, doubles).flatMap((slot) => {
      const moveIndex = armed[slot];
      if (moveIndex === undefined || !roster[slot]) return [];
      return [{slot, moveIndex, target: targets[slot] ?? defaultTarget(slot, doubles)}];
    });
  }, [armed, doubles, previewSide, roster, targets]);

  const hits: ComboHit[] = useMemo(() => {
    if (actions.length === 0) return [];
    return previewCombo(calcGen, roster, actions, field, notation);
  }, [actions, calcGen, field, notation, roster]);

  const armedNames = useMemo(() => {
    const namesBySlot: Partial<Record<VisualSlot, string>> = {};
    for (const slot of visibleSlots(doubles)) {
      const moveIndex = armed[slot];
      const poke = roster[slot];
      if (moveIndex === undefined || !poke) continue;
      const move = poke.moves[moveIndex]?.name;
      if (move && move !== '(No Move)') namesBySlot[slot] = move;
    }
    return namesBySlot;
  }, [armed, doubles, roster]);

  const yourCount = slotsOnTeam('p1', doubles).filter((slot) => armed[slot] !== undefined && roster[slot]).length;
  const foeCount = slotsOnTeam('p2', doubles).filter((slot) => armed[slot] !== undefined && roster[slot]).length;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setEditing(null);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function teamOfSide(side: SideKey): Team {
    return side === 'p1' ? p1Team : p2Team;
  }

  function setTeam(side: SideKey, team: Team) {
    if (side === 'p1') setP1Team(team);
    else setP2Team(team);
  }

  function setMember(side: SideKey, index: number, pokemon: PokemonState | null) {
    const current = teamOfSide(side);
    const next = [...current];
    next[index] = pokemon;
    setTeam(side, next);
    if (!pokemon) {
      const slot = fieldSlotFor(side, index);
      if (slot) {
        setArmed((armedNow) => {
          const copy = {...armedNow};
          delete copy[slot];
          return copy;
        });
      }
    }
  }

  function fieldSlotFor(side: SideKey, index: number): VisualSlot | null {
    const active = side === 'p1' ? p1Active : p2Active;
    if (side === 'p1') {
      if (active[0] === index) return 'allyA';
      if (leads > 1 && active[1] === index) return 'allyB';
    } else {
      if (active[0] === index) return 'foeA';
      if (leads > 1 && active[1] === index) return 'foeB';
    }
    return null;
  }

  function slotPos(slot: VisualSlot): number {
    if (slot === 'allyA' || slot === 'foeA') return 0;
    return 1;
  }

  function changeGen(next: CalcGen) {
    setCalcGen(next);
    setP1Team(emptyTeam());
    setP2Team(emptyTeam());
    setP1Party([]);
    setP1Active(leadsCount(doubles) > 1 ? [-1, -1] : [-1]);
    setP2Active(leadsCount(doubles) > 1 ? [-1, -1] : [-1]);
    setP2Reveals(emptyReveals());
    setPickingParty(false);
    setPickOrder([]);
    setEditing(null);
    setArmed({});
    setTargets(defaultTargetMap(doubles));
  }

  function setField(next: typeof field) {
    const nextDoubles = next.gameType === 'Doubles';
    const nextLeads = leadsCount(nextDoubles);
    setFieldState(next);
    setP1Team((team) => resizeTeam(team));
    setP2Team((team) => resizeTeam(team));
    setP1Active((active) => (nextLeads > 1 ? [active[0] ?? -1, active[1] ?? -1] : [active[0] ?? -1]));
    setP2Active((active) => (nextLeads > 1 ? [active[0] ?? -1, active[1] ?? -1] : [active[0] ?? -1]));
    setTargets(defaultTargetMap(nextDoubles));
    setPickingParty(filledIndexes(p1Team).length >= leadsCount(nextDoubles));
    setPickOrder([]);
    if (!nextDoubles) {
      setArmed((current) => {
        const copy = {...current};
        delete copy.allyB;
        delete copy.foeB;
        return copy;
      });
    }
  }

  function pickSpecies(side: SideKey, index: number, species: string) {
    const current = teamOfSide(side)[index];
    if (current) {
      setMember(side, index, applySpecies(current, species, calcGen));
      return;
    }
    const created = defaultPokemon(calcGen, species, names);
    const poke = created.species === species ? created : applySpecies(created, species, calcGen);
    if (assigning && teamOf(assigning) === side) {
      sendOut(assigning, index, poke);
      return;
    }
    setMember(side, index, poke);
  }

  function openFieldSlot(slot: VisualSlot) {
    const side = teamOf(slot);
    if (pickingParty && side === 'p1') return;
    const ref = slotToMember(slot, p1Active, p2Active);
    if (ref.index < 0) {
      setAssigning(slot);
      setSwitching(false);
      const team = teamOfSide(side);
      if (filledIndexes(team).length === 0) {
        setEditing({side, index: 0});
      } else {
        setEditing(null);
      }
      return;
    }
    setAssigning(null);
    setSwitching(false);
    setEditing((current) =>
      current?.side === ref.side && current.index === ref.index ? null : ref,
    );
  }

  function openTeamIndex(side: SideKey, index: number) {
    if (assigning && teamOf(assigning) === side) {
      if (teamOfSide(side)[index]) {
        sendOut(assigning, index);
        return;
      }
      setEditing({side, index});
      return;
    }
    setAssigning(null);
    setSwitching(false);
    setEditing((current) =>
      current?.side === side && current.index === index ? null : {side, index},
    );
  }

  function sendOut(slot: VisualSlot, squadIndex: number, incomingPoke?: PokemonState) {
    const side = teamOf(slot);
    if (side === 'p1' && p1Party.length > 0 && !p1Party.includes(squadIndex)) return;
    const team = teamOfSide(side);
    const incoming = incomingPoke ?? team[squadIndex];
    if (!incoming) return;
    const pos = slotPos(slot);
    const {pokemon, field: nextField} = applySwitchIn(incoming, calcGen, field, side);
    const nextTeam = [...team];
    nextTeam[squadIndex] = pokemon;
    setTeam(side, nextTeam);
    const setter = side === 'p1' ? setP1Active : setP2Active;
    setter((active) => {
      const next = [...active];
      for (let i = 0; i < next.length; i++) {
        if (i !== pos && next[i] === squadIndex) next[i] = -1;
      }
      next[pos] = squadIndex;
      return next;
    });
    if (side === 'p2') {
      setP2Reveals((reveals) => markReveal(reveals, nextTeam, squadIndex, 'in'));
    }
    setFieldState(nextField);
    setArmed((current) => {
      const copy = {...current};
      delete copy[slot];
      return copy;
    });
    setAssigning(null);
    setSwitching(false);
    setEditing({side, index: squadIndex});
  }

  function switchIn(side: SideKey, benchIndex: number) {
    const from = editing?.side === side ? fieldSlotFor(side, editing.index) : null;
    const slot = from ?? (side === 'p1' ? 'allyA' : 'foeA');
    sendOut(slot, benchIndex);
  }

  function togglePick(index: number) {
    if (!p1Team[index]) return;
    setPickOrder((order) => {
      if (order.includes(index)) return order.filter((item) => item !== index);
      if (order.length >= bring) return order;
      return [...order, index];
    });
  }

  const filledP1 = filledIndexes(p1Team);
  const canConfirmParty =
    pickOrder.length >= leads &&
    pickOrder.length <= bring &&
    (filledP1.length >= bring ? pickOrder.length === bring : pickOrder.length === filledP1.length);

  function confirmParty() {
    if (!canConfirmParty) return;
    let team = [...p1Team];
    let nextField = field;
    const nextActive = pickOrder.slice(0, leads);
    for (const index of nextActive) {
      const poke = team[index];
      if (!poke) continue;
      const result = applySwitchIn(poke, calcGen, nextField, 'p1');
      team[index] = result.pokemon;
      nextField = result.field;
    }
    setP1Team(team);
    setP1Party(pickOrder);
    setP1Active(nextActive);
    setFieldState(nextField);
    setPickingParty(false);
    setPickOrder([]);
  }

  function ruleOut(index: number) {
    setP2Reveals((reveals) => {
      const current = reveals[index] === 'out' ? 'possible' : 'out';
      return markReveal(reveals, p2Team, index, current);
    });
  }

  function useMove(slot: VisualSlot, index: number) {
    setPreviewSide(teamOf(slot));
    setArmed((current) => {
      if (current[slot] === index) {
        const next = {...current};
        delete next[slot];
        return next;
      }
      return {...current, [slot]: index};
    });
    const vis = visibleSlots(doubles);
    const filled = vis.filter((item) => item !== slot && roster[item]);
    const chosen = targets[slot];
    if (!filled.includes(chosen)) {
      const fallback = defaultTarget(slot, doubles);
      setTargets((current) => ({
        ...current,
        [slot]: filled.includes(fallback) ? fallback : (filled[0] ?? fallback),
      }));
    }
  }

  function clearArmed(side: 'p1' | 'p2' | 'all' = previewSide) {
    if (side === 'all') {
      setArmed({});
      return;
    }
    setArmed((current) => {
      const next = {...current};
      for (const slot of slotsOnTeam(side, doubles)) delete next[slot];
      return next;
    });
  }

  function newBattle() {
    setP1Team((team) => team.map((poke) => (poke ? resetPokemon(calcGen, poke) : null)));
    setP2Team((team) => team.map((poke) => (poke ? resetPokemon(calcGen, poke) : null)));
    setP2Reveals(emptyReveals());
    setP1Active(leads > 1 ? [-1, -1] : [-1]);
    setP2Active(leads > 1 ? [-1, -1] : [-1]);
    setArmed({});
    setFieldState(resetBattleField(field.gameType));
    setEditing(null);
    setSwitching(false);
    setAssigning(null);
    const filled = filledIndexes(p1Team);
    setPickingParty(filled.length > 0);
    setPickOrder(filled.length <= bring ? filled.slice(0, bring) : []);
    setP1Party([]);
  }

  function importSide(side: SideKey, text: string) {
    const parsed = importOrderedSets(text, calcGen);
    const next = emptyTeam();
    parsed.forEach((entry, index) => {
      if (index >= SQUAD_SIZE) return;
      let poke = applySet(defaultPokemon(calcGen, entry.species, names), entry.species, entry.set, calcGen);
      if (calcGen === 0) poke = {...poke, evs: spsFromEvs(poke.evs)};
      next[index] = poke;
    });
    setTeam(side, next);
    if (side === 'p1') {
      const filled = filledIndexes(next);
      setPickingParty(true);
      setPickOrder(filled.length <= bring ? filled : []);
      setP1Party([]);
      setP1Active(leads > 1 ? [-1, -1] : [-1]);
    } else {
      setP2Reveals(resolveReveals(emptyReveals(), next));
      setP2Active(leads > 1 ? [-1, -1] : [-1]);
    }
    setEditing(null);
  }

  function removeEditing() {
    if (!editing) return;
    setMember(editing.side, editing.index, null);
    setEditing(null);
  }

  function applyPreviewHP(slot: VisualSlot) {
    const poke = roster[slot];
    const hit = hits.find((item) => item.slot === slot);
    if (!poke || !hit) return;
    const ref = slotToMember(slot, p1Active, p2Active);
    setMember(ref.side, ref.index, {
      ...poke,
      curHP: hit.remain,
      percentHP: hit.maxHP === 0 ? 0 : Math.round((hit.remain * 1000) / hit.maxHP) / 10,
    });
  }

  const editPoke = editing ? teamOfSide(editing.side)[editing.index] ?? null : null;
  const editSlot = editing ? fieldSlotFor(editing.side, editing.index) : null;
  const targetOptions = editSlot
    ? visibleSlots(doubles).filter((slot) => slot !== editSlot && roster[slot])
    : [];
  const editorTarget = editSlot
    ? targetOptions.includes(targets[editSlot])
      ? targets[editSlot]
      : (targetOptions[0] ?? targets[editSlot])
    : 'foeA';
  const previewRemain = editSlot ? hits.find((hit) => hit.slot === editSlot)?.remain : undefined;
  const p1Bench = (p1Party.length ? p1Party : filledIndexes(p1Team)).filter(
    (index) => p1Team[index] && !p1Active.includes(index),
  );
  const switchChoices =
    editing && editSlot
      ? editing.side === 'p1'
        ? p1Bench.filter((index) => index !== editing.index)
        : p2Team.flatMap((poke, index) =>
            poke && !p2Active.includes(index) && p2Reveals[index] !== 'out' ? [index] : [],
          )
      : [];
  const broughtCount = p2Reveals.filter((status, index) => status === 'in' && p2Team[index]).length;

  const editor = editing ? (
    <div className="visual-editor">
      <div className="visual-bubble-bar">
        <strong>
          {editSlot ? slotLabel(editSlot) : `${editing.side === 'p1' ? 'Your' : 'Opposing'} slot ${editing.index + 1}`}
        </strong>
        <span className="visual-bubble-actions">
          {editPoke && (
            <button type="button" className="bs-btn" onClick={removeEditing}>
              Remove
            </button>
          )}
          <button type="button" className="bs-btn" onClick={() => setEditing(null)}>
            Close
          </button>
        </span>
      </div>
      {!editPoke ? (
        <SpeciesPicker
          species=""
          names={names}
          onChange={(species) => pickSpecies(editing.side, editing.index, species)}
        />
      ) : (
        <>
          {editSlot && targetOptions.length > 0 && (
            <div className="row visual-target-row">
              <label htmlFor="visual-target">Target</label>
              <select
                id="visual-target"
                value={editorTarget}
                onChange={(e) =>
                  setTargets((current) => ({...current, [editSlot]: e.target.value as VisualSlot}))
                }
              >
                {targetOptions.map((slot) => (
                  <option key={slot} value={slot}>
                    {slotLabel(slot)} ({roster[slot]?.species})
                  </option>
                ))}
              </select>
            </div>
          )}
          {editSlot && switchChoices.length > 0 && !pickingParty && (
            <div className="switch-box">
              <button
                type="button"
                className={switching ? 'btn on' : 'bs-btn'}
                onClick={() => setSwitching((on) => !on)}
              >
                Switch out
              </button>
              {switching ? (
                <div className="switch-choices">
                  <p className="team-rail-hint">Who comes in?</p>
                  {switchChoices.map((index) => {
                    const poke = teamOfSide(editing.side)[index];
                    if (!poke) return null;
                    const maybe = editing.side === 'p2' && p2Reveals[index] === 'possible';
                    return (
                      <button
                        key={index}
                        type="button"
                        className="bs-btn switch-choice"
                        onClick={() => switchIn(editing.side, index)}
                      >
                        <PokemonIcon species={poke.species} />
                        {poke.species}
                        {maybe ? ' · maybe' : ''}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="team-rail-hint">Send this Pokémon back and pick who replaces it.</p>
              )}
            </div>
          )}
          <VisualPokemonCard
            gen={calcGen}
            title={editSlot ? slotLabel(editSlot) : 'Pokémon'}
            pokemon={editPoke}
            speciesNames={names}
            unrestricted={unrestricted}
            activeMove={editSlot ? armed[editSlot] ?? null : null}
            previewRemain={previewRemain}
            onChange={(pokemon) => setMember(editing.side, editing.index, pokemon)}
            onUseMove={(index) => {
              if (editSlot) useMove(editSlot, index);
            }}
            onApplyPreview={editSlot ? () => applyPreviewHP(editSlot) : undefined}
          />
        </>
      )}
    </div>
  ) : null;

  return (
    <div className="visual-sim">
      <div className="settings visual-toolbar" role="region" aria-label="Format">
        <span className="btn-row" role="radiogroup" aria-label="Generation">
          <label className={calcGen === 0 ? 'btn on' : 'btn'}>
            <input
              type="radio"
              name="visual-gen"
              className="visually-hidden"
              checked={calcGen === 0}
              onChange={() => changeGen(0)}
            />
            Champions
          </label>
          {GEN_BUTTONS.map((button) => (
            <label key={button.gen} className={calcGen === button.gen ? 'btn on' : 'btn'}>
              <input
                type="radio"
                name="visual-gen"
                className="visually-hidden"
                checked={calcGen === button.gen}
                onChange={() => changeGen(button.gen)}
              />
              {button.label}
            </label>
          ))}
        </span>
        <span className="btn-row" role="radiogroup" aria-label="Battle format">
          <label className={!doubles ? 'btn on' : 'btn'}>
            <input
              type="radio"
              name="visual-format"
              className="visually-hidden"
              checked={!doubles}
              onChange={() => setField({...field, gameType: 'Singles'})}
            />
            Singles
          </label>
          <label className={doubles ? 'btn on' : 'btn'}>
            <input
              type="radio"
              name="visual-format"
              className="visually-hidden"
              checked={doubles}
              onChange={() => setField({...field, gameType: 'Doubles'})}
            />
            Doubles
          </label>
        </span>
        <span className="btn-row" role="radiogroup" aria-label="Notation">
          <label className={notation === 'px' ? 'btn on' : 'btn'}>
            <input
              type="radio"
              name="visual-notation"
              className="visually-hidden"
              checked={notation === 'px'}
              onChange={() => setNotation('px')}
            />
            48th
          </label>
          <label className={notation === '%' ? 'btn on' : 'btn'}>
            <input
              type="radio"
              name="visual-notation"
              className="visually-hidden"
              checked={notation === '%'}
              onChange={() => setNotation('%')}
            />
            100%
          </label>
        </span>
        <span className="btn-row theme-row" role="radiogroup" aria-label="Theme">
          {(['auto', 'light', 'dark'] as Theme[]).map((item) => (
            <label key={item} className={theme === item ? 'btn on' : 'btn'}>
              <input
                type="radio"
                name="visual-theme"
                className="visually-hidden"
                checked={theme === item}
                onChange={() => onTheme(item)}
              />
              {item === 'auto' ? 'Auto' : item === 'light' ? 'Light' : 'Dark'}
            </label>
          ))}
        </span>
      </div>

      <div className="visual-turn" role="toolbar" aria-label="Attack preview">
        <span className="btn-row" role="radiogroup" aria-label="Whose attacks">
          <label className={previewSide === 'p1' ? 'btn on' : 'btn'}>
            <input
              type="radio"
              name="visual-side"
              className="visually-hidden"
              checked={previewSide === 'p1'}
              onChange={() => setPreviewSide('p1')}
            />
            Your attacks{yourCount ? ` (${yourCount})` : ''}
          </label>
          <label className={previewSide === 'p2' ? 'btn on' : 'btn'}>
            <input
              type="radio"
              name="visual-side"
              className="visually-hidden"
              checked={previewSide === 'p2'}
              onChange={() => setPreviewSide('p2')}
            />
            Opposing attacks{foeCount ? ` (${foeCount})` : ''}
          </label>
        </span>
        <button type="button" className="bs-btn" onClick={() => clearArmed()}>
          Clear
        </button>
        <button type="button" className="bs-btn" onClick={newBattle}>
          New battle
        </button>
        {actions.length > 0 && (
          <span className="visual-turn-moves">
            {actions
              .map((action) => {
                const poke = roster[action.slot];
                const move = poke?.moves[action.moveIndex]?.name;
                return poke && move ? `${poke.species}: ${move}` : '';
              })
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
      </div>

      <div className="visual-arena">
        <aside className="visual-side-panel" aria-label="Your team">
          <TeamRail
            title="Your team (6)"
            hint={
              pickingParty
                ? doubles
                  ? `Click in order: 1 left, 2 right, 3–4 back (${pickOrder.length}/${bring})`
                  : `Click in order: 1 lead, 2–3 back (${pickOrder.length}/${bring})`
                : assigning && teamOf(assigning) === 'p1'
                  ? `Click who to send to ${slotLabel(assigning)}`
                  : doubles
                    ? 'Bring 4: 1 left, 2 right, 3–4 back. New battle to re-pick.'
                    : 'Bring 3: 1 lead, 2–3 back. New battle to re-pick.'
            }
            gen={calcGen}
            team={p1Team}
            active={p1Active}
            party={p1Party}
            picking={pickingParty}
            pickOrder={pickOrder}
            doubles={doubles}
            editingIndex={editing?.side === 'p1' ? editing.index : null}
            onSelect={(index) => openTeamIndex('p1', index)}
            onTogglePick={togglePick}
          />
          {pickingParty && (
            <button
              type="button"
              className="bs-btn visual-confirm"
              disabled={!canConfirmParty}
              onClick={confirmParty}
            >
              Confirm party
            </button>
          )}
          {editing?.side === 'p1' && editor}
        </aside>
        <VisualStage
          doubles={doubles}
          roster={roster}
          hits={hits}
          attackers={actions.map((action) => action.slot)}
          editing={editSlot ?? assigning}
          armedNames={armedNames}
          onOpenSlot={openFieldSlot}
        />
        <aside className="visual-side-panel" aria-label="Opposing team">
          <TeamRail
            title="Opposing team (6)"
            hint={
              assigning && teamOf(assigning) === 'p2'
                ? `Click who to send to ${slotLabel(assigning)}`
                : `All 6 shown. Field mons count toward the 4 (${broughtCount}/4). Mark “Not brought” to drop the unused 2.`
            }
            gen={calcGen}
            team={p2Team}
            active={p2Active}
            reveals={p2Reveals}
            opponent
            doubles={doubles}
            editingIndex={editing?.side === 'p2' ? editing.index : null}
            onSelect={(index) => openTeamIndex('p2', index)}
            onRuleOut={ruleOut}
          />
          {editing?.side === 'p2' && editor}
        </aside>
      </div>

      <div className="visual-bottom">
        <details className="visual-field-wrap" open>
          <summary>Field settings</summary>
          <FieldPanel
            gen={calcGen}
            field={field}
            onChange={setField}
            onExportLeft={() => undefined}
            onExportRight={() => undefined}
            showExport={false}
            hideGameType
          />
        </details>
        <VisualPaste
          gen={calcGen}
          yours={p1Team}
          foes={p2Team}
          onImportYours={(text) => importSide('p1', text)}
          onImportFoes={(text) => importSide('p2', text)}
        />
      </div>
    </div>
  );
}
