import { User, Landmark, Globe2, Smartphone, MonitorSmartphone, AtSign, MapPin } from 'lucide-react'

export const ENTITY_TYPE_META = {
  PERSON: { key: 'PERSON', label: 'Person', plural: 'Persons', icon: User, classes: 'bg-sky-500/15 text-sky-300', dot: 'bg-sky-400' },
  PHONE: { key: 'PHONE', label: 'Phone', plural: 'Phones', icon: Smartphone, classes: 'bg-rose-500/15 text-rose-300', dot: 'bg-rose-400' },
  ACCOUNT: { key: 'ACCOUNT', label: 'Account', plural: 'Accounts', icon: Landmark, classes: 'bg-teal-500/15 text-teal-300', dot: 'bg-teal-400' },
  IP: { key: 'IP', label: 'IP', plural: 'IPs', icon: Globe2, classes: 'bg-cyan-500/15 text-cyan-300', dot: 'bg-cyan-400' },
  DEVICE: { key: 'DEVICE', label: 'Device', plural: 'Devices', icon: MonitorSmartphone, classes: 'bg-violet-500/15 text-violet-300', dot: 'bg-violet-400' },
  SOCIAL: { key: 'SOCIAL', label: 'Social account', plural: 'Social accounts', icon: AtSign, classes: 'bg-fuchsia-500/15 text-fuchsia-300', dot: 'bg-fuchsia-400' },
  LOCATION: { key: 'LOCATION', label: 'Location', plural: 'Locations', icon: MapPin, classes: 'bg-amber-500/15 text-amber-300', dot: 'bg-amber-400' },
}

export function humanEntitySlug(slug) {
  if (!slug) return ''
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
