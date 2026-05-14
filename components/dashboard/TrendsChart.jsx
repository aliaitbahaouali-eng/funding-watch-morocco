'use client';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, defs } from 'recharts';

export default function TrendsChart({ data }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="brandFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cf2535" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#cf2535" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" stroke="#828a98" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#828a98" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #eef0f3', boxShadow: '0 8px 32px -12px rgba(0,0,0,0.12)' }} />
          <Area type="monotone" dataKey="opportunities" stroke="#cf2535" strokeWidth={3} fill="url(#brandFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
