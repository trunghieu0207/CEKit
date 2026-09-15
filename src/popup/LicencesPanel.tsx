import { FONT_OPTIONS } from '../shared/fonts'

/**
 * The OFL only requires the licences to travel inside the package, which they
 * already do. This view exists so a user can actually find them: every entry
 * links to the licence file shipped at `fonts/licenses/<id>.txt`.
 *
 * The list is derived from the font catalogue rather than written out again,
 * so adding a font to `FONT_OPTIONS` cannot leave its licence unlisted.
 */
const BUNDLED = FONT_OPTIONS.filter((font) => font.source === 'bundled')

export function LicencesPanel() {
  return (
    <>
      <div className="panel__head">
        <div>
          <h2>Fonts &amp; licences</h2>
          <p className="hint">
            {BUNDLED.length} fonts ship inside this extension. All are SIL Open
            Font License 1.1.
          </p>
        </div>
      </div>

      <div className="panel__body">
        <ul className="licences">
          {BUNDLED.map((font) => (
            <li key={font.id}>
              <span className="licences__name" style={{ fontFamily: font.stack }}>
                {font.label}
              </span>
              <a
                href={chrome.runtime.getURL(`fonts/licenses/${font.id}.txt`)}
                target="_blank"
                rel="noreferrer"
              >
                OFL 1.1
              </a>
            </li>
          ))}
        </ul>

        <p className="hint">
          The fonts are redistributed unchanged and under their original names.
          The extension's own code is MIT.
        </p>
      </div>
    </>
  )
}
