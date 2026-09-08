import {
  LayoutDashboard,
  FolderOpen,
  Network,
  Clock,
  BellRing,
  Scale,
  FolderSearch,
  FileBarChart,
  ScrollText,
  Car,
  Users,
} from 'lucide-react'

/*
 * Sidebar navigation structure. Each item maps to a route so that
 * later development phases can plug real pages into these routes.
 */

export const NAV_SECTIONS = [
  {
    label: 'Investigation',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'Cases', to: '/cases', icon: FolderOpen },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { label: 'CaseGraph', to: '/graph', icon: Network, caseScoped: true },
      { label: 'CrimeTimeline', to: '/timeline', icon: Clock, caseScoped: true },
      { label: 'Alerts', to: '/alerts', icon: BellRing, caseScoped: true },
      { label: 'Contradictions', to: '/contradictions', icon: Scale, caseScoped: true },
      { label: 'Entity Intelligence', to: '/entities/person-a', icon: Users },
      { label: 'Vehicle Intelligence', to: '/vehicle-intelligence', icon: Car },
    ],
  },
  {
    label: 'Evidence',
    items: [
      { label: 'Evidence', to: '/evidence', icon: FolderSearch, caseScoped: true },
    ],
  },
  {
    label: 'Output',
    items: [{ label: 'Reports', to: '/reports', icon: FileBarChart, caseScoped: true }],
  },
  {
    label: 'System',
    items: [{ label: 'Audit Logs', to: '/audit', icon: ScrollText }],
  },
]
