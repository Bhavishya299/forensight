import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CornerDownLeft, FileSearch, FolderKanban, Search, Car } from 'lucide-react'
import EmptyState from '../ui/EmptyState.jsx'
import { ENTITY_TYPE_META } from '../../config/entityMeta.js'
import api from '../../services/api.js'

function Highlight({ text, needle }) {
  if (!needle) return text
  const lower = text.toLowerCase()
  const idx = lower.indexOf(needle.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-cyan-brand/30 px-0.5 text-cyan-100">{text.slice(idx, idx + needle.length)}</mark>
      {text.slice(idx + needle.length)}
    </>
  )
}

function resultIcon(type, subType) {
  if (type === 'ENTITY') return ENTITY_TYPE_META[subType]?.icon || Search
  if (type === 'EVIDENCE') return FileSearch
  if (type === 'CASE') return FolderKanban
  if (type === 'VEHICLE') return Car
  return Search
}

const GlobalSearch = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [groups, setGroups] = useState([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  const fetchResults = useCallback((q) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setGroups([])
      setSearching(false)
      return
    }
    setSearching(true)
    api.get(`/search?q=${encodeURIComponent(trimmed)}`)
      .then((res) => setGroups(res.data.groups || []))
      .catch(() => setGroups([]))
      .finally(() => setSearching(false))
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setGroups([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(() => fetchResults(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, fetchResults])

  const flat = groups.flatMap((g) => g.items.map((item) => ({ group: g, item })))

  useEffect(() => setActiveIndex(0), [query])

  useEffect(() => {
    if (!open) return
    const onDocKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    const onDocMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onDocKeyDown)
    document.addEventListener('mousedown', onDocMouseDown)
    return () => {
      document.removeEventListener('keydown', onDocKeyDown)
      document.removeEventListener('mousedown', onDocMouseDown)
    }
  }, [open])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const selectItem = (i) => {
    const entry = flat[i]
    if (!entry) return
    navigate(entry.item.href)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  const onInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selectItem(activeIndex)
    }
  }

  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-result-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const showDropdown = open && (query.trim().length > 0)

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onInputKeyDown}
        placeholder="Search anything…"
        aria-label="Search everything — entities, evidence, cases and vehicles"
        aria-expanded={showDropdown}
        aria-controls="global-search-results"
        className="h-9 w-full rounded-md border border-ink-600 bg-ink-800 pl-9 pr-20 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-brand/60 focus:outline-none focus:ring-1 focus:ring-cyan-brand/40"
      />
      <kbd className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1 font-sans text-[10px] text-slate-500">
        Ctrl <span className="rounded border border-ink-600 px-1">K</span>
      </kbd>

      {showDropdown && (
        <div
          id="global-search-results"
          role="listbox"
          aria-label="Search results"
          className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-ink-600 bg-ink-800 shadow-2xl shadow-black/40"
        >
          {searching ? (
            <div className="p-4 text-center text-sm text-slate-400">Searching…</div>
          ) : flat.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Search}
                title="NO RESULTS FOUND"
                description="Try searching for a person, account, IP, device, evidence ID, location or case."
              />
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {groups.map((group) => (
                <div key={group.type} role="group" aria-label={group.label}>
                  <p className="sticky top-0 z-10 border-b border-ink-600/70 bg-ink-800/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-brand/80 backdrop-blur">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const Icon = resultIcon(item.type, item.subType)
                    const index = flat.findIndex((f) => f.item.key === item.key)
                    return (
                      <button
                        key={item.key}
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        data-result-index={index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectItem(index)}
                        className={[
                          'flex w-full items-start gap-3 px-3 py-2 text-left transition-colors',
                          index === activeIndex ? 'bg-ink-700/70' : 'hover:bg-ink-700/50',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                            item.type === 'ENTITY'
                              ? ENTITY_TYPE_META[item.subType]?.classes || 'bg-ink-700 text-slate-300'
                              : 'bg-ink-700 text-slate-300',
                          ].join(' ')}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-slate-100">
                              <Highlight text={item.label} needle={query.trim()} />
                            </span>
                            {item.type !== 'ENTITY' && (
                              <span className="shrink-0 text-[10px] uppercase tracking-wider text-slate-500">
                                {item.subType || item.type}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-400">
                            {item.metaLines?.join(' · ')}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-ink-600/70 bg-ink-900/95 px-3 py-1.5 text-[10px] text-slate-500">
            <span>↑↓ navigate · Enter open · Esc close · Ctrl+K focus</span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" aria-hidden="true" /> open
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default GlobalSearch
