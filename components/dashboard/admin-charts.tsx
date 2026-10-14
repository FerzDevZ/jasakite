"use client"

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatIDR } from "@/lib/utils"

// Recharts ~150 kB. File ini hanya berisi grafik supaya bisa dimuat lewat
// next/dynamic (ssr:false) — halaman admin tidak lagi membawanya di bundle awal.

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
  color: "hsl(var(--foreground))",
} as const

const AXIS = {
  fontSize: 11,
  stroke: "hsl(var(--muted-foreground))",
  tickLine: false,
  axisLine: false,
} as const

export function OrdersAreaChart({
  data,
}: {
  data: { date: string; count: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="orderFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" {...AXIS} />
        <YAxis {...AXIS} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="count"
          name="Pesanan"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#orderFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function CategoryRevenueChart({
  data,
}: {
  data: { name: string; value: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="name"
          {...AXIS}
          fontSize={10}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis
          {...AXIS}
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `${Math.round(v / 1_000_000)}jt`
              : `${Math.round(v / 1000)}rb`
          }
        />
        <Tooltip
          formatter={(v) => [formatIDR(Number(v)), "Pendapatan"]}
          contentStyle={TOOLTIP_STYLE}
        />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
