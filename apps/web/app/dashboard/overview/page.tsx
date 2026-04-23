"use client";

import { 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  ArrowUpRight,
  Shield,
  Zap,
  Target as TargetIcon,
  Terminal,
  ExternalLink
} from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { mockDetections, mockTargets, mockAgents } from "@/lib/ares/mock-data";
import { cn } from "@/lib/utils";

const postureData = [
  { name: "Mon", score: 82 },
  { name: "Tue", score: 85 },
  { name: "Wed", score: 84 },
  { name: "Thu", score: 88 },
  { name: "Fri", score: 91 },
  { name: "Sat", score: 89 },
  { name: "Sun", score: 92 },
];

export default function OverviewPage() {
  const criticalCount = mockDetections.filter(d => d.severity === 'critical').length;
  const protectedCount = mockTargets.filter(t => t.status === 'protected').length;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden">
        <div className="max-w-2xl">
          <p className="text-[12px] font-sans font-semibold text-primary uppercase tracking-[0.2em] mb-3">Build for the frontier</p>
          <h1 className="text-5xl md:text-6xl font-serif font-medium leading-tight text-foreground mb-4">Security Command</h1>
          <p className="text-lg text-muted-foreground font-sans leading-relaxed">
            Centralized monitoring and autonomous detection for your on-chain assets. 
            Calm, precise, and operator-focused.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button className="px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-[14px] font-medium hover:bg-muted transition-all ring-shadow">Generate Report</button>
          <button className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[14px] font-medium hover:opacity-90 transition-all shadow-xl shadow-primary/20">Initiate Scan</button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Security Posture" 
          value="92%" 
          trend="+4.2%" 
          icon={<Shield className="w-5 h-5" />} 
        />
        <StatCard 
          label="Protected Assets" 
          value={protectedCount.toString()} 
          trend="0" 
          icon={<TargetIcon className="w-5 h-5" />} 
        />
        <StatCard 
          label="Critical Detections" 
          value={criticalCount.toString()} 
          trend="-2" 
          isAlert={criticalCount > 0}
          icon={<AlertTriangle className="w-5 h-5" />} 
        />
        <StatCard 
          label="Automation Rate" 
          value="84%" 
          trend="+1.2%" 
          icon={<Zap className="w-5 h-5" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <div className="lg:col-span-2 ares-card p-8 whisper-shadow">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-serif flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Posture Lifecycle
            </h3>
            <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Aggregate Confidence
            </div>
          </div>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={postureData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c96442" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#c96442" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-sans)' }}
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'var(--font-sans)' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))', 
                    borderRadius: '12px',
                    boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 24px'
                  }}
                  itemStyle={{ color: 'hsl(var(--primary))', fontFamily: 'var(--font-sans)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Panel - Active Agents */}
        <div className="ares-card p-8 bg-secondary/30 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-serif flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" />
              Agent Systems
            </h3>
            <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider">Active</span>
          </div>
          
          <div className="space-y-3 flex-1">
            {mockAgents.map(agent => (
              <div key={agent.id} className="p-4 rounded-xl bg-card border border-border flex items-center gap-4 group hover:ring-shadow transition-all">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  agent.status === 'running' ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-foreground truncate">{agent.name}</p>
                  <p className="text-[12px] text-muted-foreground truncate font-sans">{agent.currentTask || "Idle: Waiting for telemetry"}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                   <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full py-2.5 mt-8 bg-card border border-border rounded-xl text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all uppercase tracking-[0.15em] font-sans">
            Scale Autonomous Jobs
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, icon, isAlert }: { label: string, value: string, trend: string, icon: React.ReactNode, isAlert?: boolean }) {
  const isNeutral = trend === "0";
  const isDown = trend.startsWith("-");

  return (
    <div className={cn(
      "ares-card p-6 whisper-shadow hover:ring-shadow group relative overflow-hidden",
      isAlert ? "border-destructive/30" : ""
    )}>
      <div className="flex items-center justify-between mb-6">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm",
          isAlert ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground"
        )}>
          {icon}
        </div>
        {!isNeutral && (
          <div className={cn(
            "text-[12px] font-bold px-2.5 py-1 rounded-full",
            isDown ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-500"
          )}>
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-[13px] font-medium text-muted-foreground mb-1 font-sans">{label}</p>
        <p className="text-4xl font-serif font-medium">{value}</p>
      </div>
    </div>
  );
}
