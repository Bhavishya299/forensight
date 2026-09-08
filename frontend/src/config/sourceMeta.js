import { Landmark, Smartphone, Globe, MapPin, FileText, Box, Cctv } from 'lucide-react'

export const SOURCE_META = {
  CDR: {
    label: 'Call Detail Records',
    icon: Smartphone,
    classes: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  },
  IPDR: {
    label: 'IP Detail Records',
    icon: Globe,
    classes: 'bg-cyan-brand/10 text-cyan-200 border-cyan-brand/30',
  },
  BANKING: {
    label: 'Banking & Ledger',
    icon: Landmark,
    classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  OSINT: {
    label: 'Social / OSINT',
    icon: FileText,
    classes: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  DEVICE: {
    label: 'Device / Location',
    icon: MapPin,
    classes: 'bg-red-500/10 text-red-300 border-red-500/30',
  },
  STATEMENTS: {
    label: 'Statements',
    icon: FileText,
    classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  CCTV: {
    label: 'CCTV / Traffic Cameras',
    icon: Cctv,
    classes: 'bg-slate-400/10 text-slate-200 border-slate-400/40',
  },
}

export const LEGACY_SOURCE_MAP = {
  'Call Detail Records': 'CDR',
  'Call Detail': 'CDR',
  CDR: 'CDR',
  'IP Detail Records': 'IPDR',
  'Internet Protocol Detail Records': 'IPDR',
  'IP Log': 'IPDR',
  Network: 'IPDR',
  IPDR: 'IPDR',
  'Banking & Ledger': 'BANKING',
  'Bank Ledger': 'BANKING',
  Banking: 'BANKING',
  Ledger: 'BANKING',
  'Social / OSINT': 'OSINT',
  'Open Source': 'OSINT',
  OSINT: 'OSINT',
  'Device / Location': 'DEVICE',
  'Device Record': 'DEVICE',
  Device: 'DEVICE',
  Location: 'DEVICE',
  Camera: 'DEVICE',
  'Location Record': 'DEVICE',
  'Statement Records': 'STATEMENTS',
  Statement: 'STATEMENTS',
  Statements: 'STATEMENTS',
  CCTV: 'CCTV',
  Cctv: 'CCTV',
  'Traffic Camera': 'CCTV',
  'Traffic CCTV': 'CCTV',
}

export const FALLBACK_SOURCE_META = {
  label: 'Source',
  icon: Box,
  classes: 'bg-ink-700/60 text-slate-300 border-ink-600',
}

export function normalizeSource(name) {
  if (!name) return 'UNKNOWN'
  return LEGACY_SOURCE_MAP[name] || name
}

export function getSourceMeta(name) {
  const key = normalizeSource(name)
  return SOURCE_META[key] || { ...FALLBACK_SOURCE_META, label: name || 'Source' }
}
