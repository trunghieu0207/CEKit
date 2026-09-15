interface Props<T extends number | string> {
  /** Accessible group name; must be unique within the popup. */
  name: string
  label: string
  /** Shown on hover; kept out of the layout to hold the popup under 600px. */
  title?: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}

export function Segmented<T extends number | string>({
  name,
  label,
  title,
  value,
  options,
  onChange,
}: Props<T>) {
  return (
    <div className="seg" title={title}>
      <span className="seg__label">{label}</span>
      <div className="seg__opts" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <label
            key={String(option.value)}
            className={`seg__opt ${option.value === value ? 'seg__opt--on' : ''}`}
          >
            <input
              type="radio"
              name={name}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  )
}
