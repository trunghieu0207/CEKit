import { COPY_FORMATS } from '../shared/github'
import type { PanelProps } from './panels'
import { Toggle } from './Toggle'

const SAMPLE = `PROJ-142: Cache the weekly schedule query
https://github.com/example-org/example-app/pull/248`

export function GithubPanel({ settings, patchGithub }: PanelProps) {
  const { github } = settings

  return (
    <>
      <div className="panel__head">
        <div>
          <h2>GitHub</h2>
          <p className="hint">Copy a pull request or issue as title, link, or both.</p>
        </div>
        <Toggle
          checked={github.enabled}
          onChange={(enabled) => patchGithub({ enabled })}
          label="Enable the GitHub feature"
        />
      </div>

      <fieldset className="panel__body" disabled={!github.enabled}>
        <p className="hint">
          Adds a <strong>Copy</strong> button next to the title on
          <code> /pull/</code> and <code> /issues/</code> pages. Clicking it
          offers three formats:
        </p>

        <ul className="formats">
          {COPY_FORMATS.map((format) => (
            <li key={format.id}>{format.label}</li>
          ))}
        </ul>

        <pre className="sample">{SAMPLE}</pre>

        <p className="hint">
          “Title and link” is shown above. The link is normalised, so copying
          from the Files or Commits tab still gives the plain pull request URL.
        </p>
      </fieldset>
    </>
  )
}
