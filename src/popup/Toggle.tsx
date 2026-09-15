interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Accessible name; visible text is rendered by the caller. */
  label: string
}

export function Toggle({ checked, onChange, label }: Props) {
  return (
    <span className="toggle">
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__knob" />
      </span>
    </span>
  )
}
