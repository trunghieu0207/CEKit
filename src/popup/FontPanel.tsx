import { KEEP_FAMILY, MONO_OPTIONS, SANS_OPTIONS } from '../shared/fonts'
import { SCOPE_OPTIONS } from '../shared/scope'
import type { FontOption } from '../shared/types'
import type { PanelProps } from './panels'
import { Segmented } from './Segmented'
import { Toggle } from './Toggle'

const PREVIEW = 'Aa 0123 Ứng dụng · アプリ'

const SIZE_STEPS = [
  { value: 1, label: '100%' },
  { value: 1.05, label: '105%' },
  { value: 1.1, label: '110%' },
  { value: 1.2, label: '120%' },
  { value: 1.3, label: '130%' },
] as const

const MIN_SIZE_STEPS = [
  { value: 0, label: 'Off' },
  { value: 11, label: '11' },
  { value: 12, label: '12' },
  { value: 13, label: '13' },
  { value: 14, label: '14' },
] as const

const WEIGHT_STEPS = [
  { value: 0, label: 'Default' },
  { value: 100, label: 'Medium' },
  { value: 200, label: 'Bold' },
] as const

/**
 * What the controls show while the feature is switched off: the neutral value
 * of every setting, which is what the page actually looks like. The stored
 * values are left alone, so switching the feature back on restores them.
 *
 * The fieldset is `disabled` in that state, so this display-only divergence is
 * never something the user can act on.
 */
function neutralView(font: PanelProps['settings']['font']): PanelProps['settings']['font'] {
  return {
    ...font,
    family: KEEP_FAMILY,
    applyToMonospace: false,
    smoothing: false,
    sizeScale: 1,
    minSize: 0,
    weightBump: 0,
    scope: { kintone: false, garoon: false, other: false },
  }
}

export function FontPanel({ settings, patchFont }: PanelProps) {
  const { font } = settings
  const view = font.enabled ? font : neutralView(font)

  return (
    <>
      <div className="panel__head">
        <div>
          <h2>Font</h2>
          <p className="hint">Replace the default font, size and weight.</p>
        </div>
        <Toggle
          checked={font.enabled}
          onChange={(enabled) => patchFont({ enabled })}
          label="Enable the font feature"
        />
      </div>

      <fieldset className="panel__body" disabled={!font.enabled}>
        <div className="list" role="radiogroup" aria-label="Interface font">
          {SANS_OPTIONS.map((option) => (
            <FontRow
              key={option.id}
              option={option}
              selected={view.family === option.id}
              onSelect={() => patchFont({ family: option.id })}
            />
          ))}
        </div>

        {/* Visibility follows the *stored* family so the row does not appear
            and disappear as the feature is toggled. */}
        {font.family !== KEEP_FAMILY && (
          <>
            <div className="row" title="Code, keyboard and code-editor elements">
              <Toggle
                checked={view.applyToMonospace}
                onChange={(applyToMonospace) => patchFont({ applyToMonospace })}
                label="Also replace monospace text"
              />
              <span className="row__text">Monospace text</span>
              {view.applyToMonospace && (
                <select
                  aria-label="Monospace font"
                  value={font.monoFamily}
                  onChange={(e) => patchFont({ monoFamily: e.target.value })}
                >
                  {MONO_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}

        <div className="row" title="Antialiasing hint, macOS only">
          <Toggle
            checked={view.smoothing}
            onChange={(smoothing) => patchFont({ smoothing })}
            label="Smoother rendering"
          />
          <span className="row__text">Smoother rendering</span>
        </div>

        <hr className="rule" />

        <Segmented
          name="size-scale"
          label="Text size"
          title="Scales every size proportionally, so headings stay larger than body text"
          value={nearest(view.sizeScale, SIZE_STEPS)}
          options={SIZE_STEPS}
          onChange={(sizeScale) => patchFont({ sizeScale })}
        />

        <Segmented
          name="min-size"
          label="Min size"
          title="Bumps anything smaller than this up to it, in px"
          value={nearest(view.minSize, MIN_SIZE_STEPS)}
          options={MIN_SIZE_STEPS}
          onChange={(minSize) => patchFont({ minSize })}
        />

        <Segmented
          name="weight-bump"
          label="Weight"
          title="Adds thickness, keeping headings heavier than body text"
          value={nearest(view.weightBump, WEIGHT_STEPS)}
          options={WEIGHT_STEPS}
          onChange={(weightBump) => patchFont({ weightBump })}
        />

        <div className="seg">
          <span className="seg__label">Apply on</span>
          <div className="checks">
            {SCOPE_OPTIONS.map((option) => (
              <label key={option.key} className="check" title={option.hint}>
                <input
                  type="checkbox"
                  checked={view.scope[option.key]}
                  // Shallow-merged, so the whole scope object has to go along.
                  onChange={(e) =>
                    patchFont({ scope: { ...font.scope, [option.key]: e.target.checked } })
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <footer className="footer">
        Applies to open kintone and Garoon tabs immediately. Japanese uses your
        system font; size and weight leave icons and layout alone.
      </footer>
    </>
  )
}

/** Snaps a stored value onto the closest offered step. */
function nearest<T extends number>(
  value: number,
  steps: readonly { value: T; label: string }[],
): T {
  return steps.reduce((best, step) =>
    Math.abs(step.value - value) < Math.abs(best.value - value) ? step : best,
  ).value
}

function FontRow({
  option,
  selected,
  onSelect,
}: {
  option: FontOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <label
      className={`font ${selected ? 'font--on' : ''}`}
      {...(option.note ? { title: option.note } : {})}
    >
      <input
        type="radio"
        name="font-family"
        checked={selected}
        onChange={onSelect}
        aria-label={option.label}
      />
      <span className="font__name">
        {option.label}
        {/* KEEP_FAMILY is not a font, so the "system" tag would only confuse. */}
        {option.source === 'system' && option.id !== KEEP_FAMILY && (
          <span className="tag">system</span>
        )}
      </span>
      <span className="font__preview" style={{ fontFamily: option.stack }}>
        {PREVIEW}
      </span>
    </label>
  )
}
