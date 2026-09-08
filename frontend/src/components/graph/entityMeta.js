import { User, Landmark, Network, Smartphone, MapPin, Users, Car, Cctv } from 'lucide-react'

/*
 * Restrained per-type styling for graph entities.
 * Colors are muted pairings (border + soft fill) and are always paired
 * with an icon + label so type is never communicated by color alone.
 */

export const ENTITY_TYPES = [
  {
    key: 'PERSON',
    plural: 'People',
    singular: 'Person',
    icon: User,
    nodeClasses: 'border-sky-500/40 bg-sky-500/10',
    iconClasses: 'bg-sky-500/15 text-sky-300',
    dot: 'bg-sky-400',
    minimap: '#3f6ea5',
  },
  {
    key: 'ACCOUNT',
    plural: 'Accounts',
    singular: 'Account',
    icon: Landmark,
    nodeClasses: 'border-teal-brand/40 bg-teal-brand/10',
    iconClasses: 'bg-teal-brand/15 text-teal-brand',
    dot: 'bg-teal-brand',
    minimap: '#2aa894',
  },
  {
    key: 'IP',
    plural: 'IP Addresses',
    singular: 'IP',
    icon: Network,
    nodeClasses: 'border-cyan-brand/40 bg-cyan-brand/10',
    iconClasses: 'bg-cyan-brand/15 text-cyan-brand',
    dot: 'bg-cyan-brand',
    minimap: '#38bdf8',
  },
  {
    key: 'DEVICE',
    plural: 'Devices',
    singular: 'Device',
    icon: Smartphone,
    nodeClasses: 'border-violet-400/40 bg-violet-400/10',
    iconClasses: 'bg-violet-400/15 text-violet-300',
    dot: 'bg-violet-400',
    minimap: '#8b7bb8',
  },
  {
    key: 'LOCATION',
    plural: 'Locations',
    singular: 'Location',
    icon: MapPin,
    nodeClasses: 'border-amber-500/40 bg-amber-500/10',
    iconClasses: 'bg-amber-500/15 text-amber-300',
    dot: 'bg-amber-400',
    minimap: '#b8862d',
  },
  {
    key: 'SOCIAL',
    plural: 'Social Accounts',
    singular: 'Social',
    icon: Users,
    nodeClasses: 'border-purple-400/40 bg-purple-400/10',
    iconClasses: 'bg-purple-400/15 text-purple-300',
    dot: 'bg-purple-400',
    minimap: '#9178bd',
  },
  {
    key: 'VEHICLE',
    plural: 'Vehicles',
    singular: 'Vehicle',
    icon: Car,
    nodeClasses: 'border-rose-400/40 bg-rose-400/10',
    iconClasses: 'bg-rose-400/15 text-rose-300',
    dot: 'bg-rose-400',
    minimap: '#d8567f',
  },
  {
    key: 'CAMERA',
    plural: 'Traffic Cameras',
    singular: 'Camera',
    icon: Cctv,
    nodeClasses: 'border-emerald-400/40 bg-emerald-400/10',
    iconClasses: 'bg-emerald-400/15 text-emerald-300',
    dot: 'bg-emerald-400',
    minimap: '#4f9d7e',
  },
]

export const ENTITY_META = Object.fromEntries(ENTITY_TYPES.map((t) => [t.key, t]))

export function entityLabel(type) {
  return ENTITY_META[type]?.singular || type
}