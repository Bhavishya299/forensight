export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function elapsedStrings(sights) {
  if (!sights || sights.length < 2) return []
  const toSec = (t) => {
    const [h, m, sec] = t.split(':').map(Number)
    return h * 3600 + m * 60 + sec
  }
  return sights.slice(1).map((s, i) => {
    const diff = toSec(s.time) - toSec(sights[i].time)
    return formatDuration(diff)
  })
}

export function correlationWhyFlagged(corr) {
  if (!corr) return 'Observed time/sector alignment.'
  return `${corr.sourceLabel || corr.source} observation at ${corr.sector || '—'} near ${corr.time || '—'}.`
}
