import { useState } from 'react'
import { Search } from 'lucide-react'
import Input from '../ui/Input.jsx'

/*
 * Plate search panel for the vehicle intelligence page. Accepts a
 * synthetic plate and triggers a demo trace lookup. No real lookups
 * occur — results come from the local synthetic index only.
 */
const VehicleSearchPanel = ({ onSearch, onDemo, loading, empty }) => {
  const [plate, setPlate] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const q = plate.trim()
    if (!q) return
    onSearch(q)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        />
        <Input
          label="Search vehicle"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          placeholder="Enter a vehicle number plate…"
          name="vehicle-plate"
          hint={empty ? undefined : 'Enter a plate number to search camera records'}
          error={empty ? 'No trace found for that plate.' : undefined}
          className="[&>input]:pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading || !plate.trim()}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-cyan-brand px-4 text-sm font-medium text-ink-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-ink-600 disabled:text-slate-500"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Trace vehicle
        </button>
      </div>
    </form>
  )
}

export default VehicleSearchPanel