import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Activity } from 'lucide-react'
import Card from '../ui/Card.jsx'
import EmptyState from '../ui/EmptyState.jsx'

const SourceActivityChart = ({ data = [] }) => {
  return (
    <Card
      title="Evidence Source Activity"
      subtitle="Ingestion volume by source type"
      icon={<Activity className="h-4 w-4" aria-hidden="true" />}
    >
      {data.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-6 w-6" aria-hidden="true" />}
          title="No source activity"
          description="Evidence source ingestion data will appear here once records are available."
        />
      ) : (
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
            barCategoryGap={8}
          >
            <CartesianGrid stroke="#1e2b47" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#8aa6cc', fontSize: 11 }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(56,189,248,0.05)' }}
              contentStyle={{
                backgroundColor: '#111a2d',
                border: '1px solid #2a3a5c',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#e2e8f0',
              }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Bar dataKey="value" fill="#38bdf8" radius={[0, 3, 3, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </Card>
  )
}

export default SourceActivityChart
