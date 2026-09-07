import type {ReactNode} from 'react';
import type {CalcGen, FieldState} from '../lib/types';
import {TERRAINS, WEATHERS} from '../lib/field';
import {genSupports} from '../lib/dex';

interface FieldPanelProps {
  gen: CalcGen;
  field: FieldState;
  onChange: (field: FieldState) => void;
  onExportLeft: () => void;
  onExportRight: () => void;
  showExport?: boolean;
  hideGameType?: boolean;
}

export function FieldPanel({
  gen,
  field,
  onChange,
  onExportLeft,
  onExportRight,
  showExport = true,
  hideGameType = false,
}: FieldPanelProps) {
  const set = (patch: Partial<FieldState>) => onChange({...field, ...patch});
  const setSide = (side: 'p1' | 'p2', patch: Partial<FieldState['p1']>) =>
    onChange({...field, [side]: {...field[side], ...patch}});

  return (
    <section className="field-panel" aria-label="Field">
      <fieldset>
        <legend>Field</legend>
        {!hideGameType && (
        <div className="btn-row">
          <label className={field.gameType === 'Singles' ? 'btn on' : 'btn'}>
            <input
              type="radio"
              className="visually-hidden"
              checked={field.gameType === 'Singles'}
              onChange={() => set({gameType: 'Singles'})}
            />
            Singles
          </label>
          <label className={field.gameType === 'Doubles' ? 'btn on' : 'btn'}>
            <input
              type="radio"
              className="visually-hidden"
              checked={field.gameType === 'Doubles'}
              onChange={() => set({gameType: 'Doubles'})}
            />
            Doubles
          </label>
        </div>
        )}

        {genSupports('terrain', gen) && (
          <div className="btn-row wrap">
            {TERRAINS.map((terrain) => (
              <label key={terrain.value} className={field.terrain === terrain.value ? 'btn on' : 'btn'}>
                <input
                  type="checkbox"
                  className="visually-hidden"
                  checked={field.terrain === terrain.value}
                  onChange={() => set({terrain: field.terrain === terrain.value ? '' : terrain.value})}
                />
                {terrain.label}
              </label>
            ))}
          </div>
        )}

        {genSupports('ruin', gen) && (
          <div className="btn-row wrap">
            <Toggle label="Beads" checked={field.isBeadsOfRuin} onChange={(isBeadsOfRuin) => set({isBeadsOfRuin})} />
            <Toggle label="Tablets" checked={field.isTabletsOfRuin} onChange={(isTabletsOfRuin) => set({isTabletsOfRuin})} />
            <Toggle label="Sword" checked={field.isSwordOfRuin} onChange={(isSwordOfRuin) => set({isSwordOfRuin})} />
            <Toggle label="Vessel of Ruin" checked={field.isVesselOfRuin} onChange={(isVesselOfRuin) => set({isVesselOfRuin})} />
          </div>
        )}

        {genSupports('aura', gen) && (
          <div className="btn-row wrap">
            <Toggle label="Fairy Aura" checked={field.isFairyAura} onChange={(isFairyAura) => set({isFairyAura})} />
            <Toggle label="Dark Aura" checked={field.isDarkAura} onChange={(isDarkAura) => set({isDarkAura})} />
            <Toggle label="Aura Break" checked={field.isAuraBreak} onChange={(isAuraBreak) => set({isAuraBreak})} />
          </div>
        )}

        <div className="btn-row wrap">
          {WEATHERS.filter((weather) => {
            if (!weather.value) return true;
            const from = 'from' in weather ? weather.from : 1;
            const until = 'until' in weather ? weather.until : 9;
            const n = gen === 0 ? 9 : gen;
            return n >= from && n <= until;
          }).map((weather) => (
            <label key={weather.value || 'none'} className={field.weather === weather.value ? 'btn on' : 'btn'}>
              <input
                type="radio"
                name="weather"
                className="visually-hidden"
                checked={field.weather === weather.value}
                onChange={() => set({weather: weather.value})}
              />
              {weather.label}
            </label>
          ))}
        </div>

        <div className="btn-row wrap">
          <Toggle label="Magic Room" checked={field.isMagicRoom} onChange={(isMagicRoom) => set({isMagicRoom})} />
          <Toggle label="Wonder Room" checked={field.isWonderRoom} onChange={(isWonderRoom) => set({isWonderRoom})} />
          <Toggle label="Gravity" checked={field.isGravity} onChange={(isGravity) => set({isGravity})} />
        </div>

        <table className="side-table">
          <thead>
            <tr>
              <th>Pokémon 1's side</th>
              <th>Pokémon 2's side</th>
            </tr>
          </thead>
          <tbody>
            <SideRow
              label="Stealth Rock"
              left={<Check checked={field.p1.isSR} onChange={(isSR) => setSide('p1', {isSR})} />}
              right={<Check checked={field.p2.isSR} onChange={(isSR) => setSide('p2', {isSR})} />}
            />
            {genSupports('steelsurge', gen) && (
              <SideRow
                label="Steelsurge"
                left={<Check checked={field.p1.steelsurge} onChange={(steelsurge) => setSide('p1', {steelsurge})} />}
                right={<Check checked={field.p2.steelsurge} onChange={(steelsurge) => setSide('p2', {steelsurge})} />}
              />
            )}
            <SideRow
              label="Spikes"
              left={<Spikes value={field.p1.spikes} onChange={(spikes) => setSide('p1', {spikes})} />}
              right={<Spikes value={field.p2.spikes} onChange={(spikes) => setSide('p2', {spikes})} reverse />}
            />
            <SideRow
              label="Toxic Spikes"
              left={<Spikes value={field.p1.toxicSpikes} onChange={(toxicSpikes) => setSide('p1', {toxicSpikes: Math.min(2, toxicSpikes)})} max={2} />}
              right={<Spikes value={field.p2.toxicSpikes} onChange={(toxicSpikes) => setSide('p2', {toxicSpikes: Math.min(2, toxicSpikes)})} max={2} reverse />}
            />
            <SideRow
              label="Reflect / Light Screen"
              left={
                <>
                  <Check label="Reflect" checked={field.p1.isReflect} onChange={(isReflect) => setSide('p1', {isReflect})} />
                  <Check label="Light Screen" checked={field.p1.isLightScreen} onChange={(isLightScreen) => setSide('p1', {isLightScreen})} />
                </>
              }
              right={
                <>
                  <Check label="Light Screen" checked={field.p2.isLightScreen} onChange={(isLightScreen) => setSide('p2', {isLightScreen})} />
                  <Check label="Reflect" checked={field.p2.isReflect} onChange={(isReflect) => setSide('p2', {isReflect})} />
                </>
              }
            />
            <SideRow
              label="Protect"
              left={<Check checked={field.p1.isProtected} onChange={(isProtected) => setSide('p1', {isProtected})} />}
              right={<Check checked={field.p2.isProtected} onChange={(isProtected) => setSide('p2', {isProtected})} />}
            />
            <SideRow
              label="Leech Seed"
              left={<Check checked={field.p1.isSeeded} onChange={(isSeeded) => setSide('p1', {isSeeded})} />}
              right={<Check checked={field.p2.isSeeded} onChange={(isSeeded) => setSide('p2', {isSeeded})} />}
            />
            {genSupports('saltCure', gen) && (
              <SideRow
                label="Salt Cure"
                left={<Check checked={field.p1.isSaltCured} onChange={(isSaltCured) => setSide('p1', {isSaltCured})} />}
                right={<Check checked={field.p2.isSaltCured} onChange={(isSaltCured) => setSide('p2', {isSaltCured})} />}
              />
            )}
            <SideRow
              label="Helping Hand"
              left={<Check checked={field.p1.isHelpingHand} onChange={(isHelpingHand) => setSide('p1', {isHelpingHand})} />}
              right={<Check checked={field.p2.isHelpingHand} onChange={(isHelpingHand) => setSide('p2', {isHelpingHand})} />}
            />
            <SideRow
              label="Tailwind"
              left={<Check checked={field.p1.isTailwind} onChange={(isTailwind) => setSide('p1', {isTailwind})} />}
              right={<Check checked={field.p2.isTailwind} onChange={(isTailwind) => setSide('p2', {isTailwind})} />}
            />
            {genSupports('auroraVeil', gen) && (
              <SideRow
                label="Aurora Veil"
                left={<Check checked={field.p1.isAuroraVeil} onChange={(isAuroraVeil) => setSide('p1', {isAuroraVeil})} />}
                right={<Check checked={field.p2.isAuroraVeil} onChange={(isAuroraVeil) => setSide('p2', {isAuroraVeil})} />}
              />
            )}
            {genSupports('battery', gen) && (
              <SideRow
                label="Battery"
                left={<Check checked={field.p1.isBattery} onChange={(isBattery) => setSide('p1', {isBattery})} />}
                right={<Check checked={field.p2.isBattery} onChange={(isBattery) => setSide('p2', {isBattery})} />}
              />
            )}
            {genSupports('powerSpot', gen) && (
              <SideRow
                label="Power Spot"
                left={<Check checked={field.p1.isPowerSpot} onChange={(isPowerSpot) => setSide('p1', {isPowerSpot})} />}
                right={<Check checked={field.p2.isPowerSpot} onChange={(isPowerSpot) => setSide('p2', {isPowerSpot})} />}
              />
            )}
            <SideRow
              label="Friend Guard"
              left={<Check checked={field.p1.isFriendGuard} onChange={(isFriendGuard) => setSide('p1', {isFriendGuard})} />}
              right={<Check checked={field.p2.isFriendGuard} onChange={(isFriendGuard) => setSide('p2', {isFriendGuard})} />}
            />
            <SideRow
              label="+1 All Stats"
              left={<Check checked={field.p1.plusOneAll} onChange={(plusOneAll) => setSide('p1', {plusOneAll})} />}
              right={<Check checked={field.p2.plusOneAll} onChange={(plusOneAll) => setSide('p2', {plusOneAll})} />}
            />
            <SideRow
              label="Switching Out"
              left={<Check checked={field.p1.isSwitchingOut} onChange={(isSwitchingOut) => setSide('p1', {isSwitchingOut})} />}
              right={<Check checked={field.p2.isSwitchingOut} onChange={(isSwitchingOut) => setSide('p2', {isSwitchingOut})} />}
            />
            {showExport && (
              <tr>
                <td><button type="button" className="bs-btn" onClick={onExportLeft}>Export</button></td>
                <td><button type="button" className="bs-btn" onClick={onExportRight}>Export</button></td>
              </tr>
            )}
          </tbody>
        </table>
      </fieldset>
    </section>
  );
}

function SideRow({label, left, right}: {label: string; left: ReactNode; right: ReactNode}) {
  return (
    <tr>
      <td>{left} {label}</td>
      <td>{right} {label}</td>
    </tr>
  );
}

function Toggle({label, checked, onChange}: {label: string; checked: boolean; onChange: (value: boolean) => void}) {
  return (
    <label className={checked ? 'btn on' : 'btn'}>
      <input type="checkbox" className="visually-hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Check({label, checked, onChange}: {label?: string; checked: boolean; onChange: (value: boolean) => void}) {
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label ? ` ${label}` : ''}
    </label>
  );
}

function Spikes({
  value,
  onChange,
  reverse,
  max = 3,
}: {
  value: number;
  onChange: (value: number) => void;
  reverse?: boolean;
  max?: number;
}) {
  const base = Array.from({length: max + 1}, (_, i) => i);
  const opts = reverse ? [...base].reverse() : base;
  return (
    <span className="spikes">
      {opts.map((n) => (
        <label key={n}>
          <input type="radio" checked={value === n} onChange={() => onChange(n)} />
          {n}
        </label>
      ))}
    </span>
  );
}
