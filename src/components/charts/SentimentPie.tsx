"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

interface SentimentPieProps {
  data: Array<{ name: string; value: number; sentiment: string | null }>;
}

const COLORS: Record<string, string> = {
  Positive: "#10b981",
  Neutral: "#f59e0b",
  Negative: "#ef4444",
  Unknown: "#94a3b8",
};

export default function SentimentPie({ data }: SentimentPieProps) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
        No sentiment data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name] ?? "#94a3b8"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ color: "#94a3b8", fontSize: "12px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
