import { Search } from 'lucide-react'

/** The filter box over a long list. Only shown once a list needs one. */
export default function SearchField({ value, onChange, placeholder, label }) {
  return (
    <div className="relative mb-4">
      <Search
        className="pointer-events-none absolute inset-y-0 start-3 my-auto h-5 w-5 text-subtle"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="input ps-10"
        autoComplete="off"
      />
    </div>
  )
}
