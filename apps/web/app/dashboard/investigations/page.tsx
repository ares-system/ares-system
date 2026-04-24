"use client";

import { 
  Plus, 
  Search, 
  Filter, 
  Activity, 
  History, 
  ChevronRight,
  ShieldAlert,
  SearchCode,
  Globe,
  Zap,
  Clock,
  ExternalLink,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export default function InvestigationsPage() {
  const [loading, setLoading] = useState(true);
  const [investigations, setInvestigations] = useState<any[]>([]);

  useEffect(() => {
    async function fetchInvestigations() {
      try {
        const res = await fetch("/api/findings");
        const data = await res.json();
        // Group findings into "investigations" for UI
        const grouped = (data.findings || []).slice(0, 5).map((f: any, i: number) => ({
          id: `inv-${i}`,
          title: f.title,
          target: f.file || "Network Buffer",
          status: i === 0 ? 'active' : 'resolved',
          severity: f.severity,
          assignedAgent: f.tool || "Analysis Engine",
          updatedAt: new Date().toISOString().split('T')[0]
        }));
        setInvestigations(grouped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvestigations();
  }, []);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden">
        <div>
          <p className="text-[12px] font-sans font-semibold text-primary uppercase tracking-[0.2em] mb-3">Live Analysis Threads</p>
          <h1 className="text-5xl font-serif font-medium tracking-tight text-foreground mb-4">Investigations</h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Deep-packet tracing and behavioral research threads currently 
            active within the ARES orchestration layer.
          </p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary rounded-xl text-[14px] font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 shrink-0">
          <Plus className="w-4 h-4" />
          Open New Case
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Analysis Stats */}
        <div className="lg:col-span-1 space-y-6">
           <div className="ares-card p-8 bg-secondary/10 whisper-shadow">
              <h3 className="text-xl font-serif font-medium mb-6 flex items-center gap-2">
                 <Zap className="w-5 h-5 text-primary" />
                 Buffer Status
              </h3>
              <div className="space-y-6">
                 {[
                   { label: "Active Traces", value: investigations.filter(v => v.status === 'active').length, color: "text-primary" },
                   { label: "Pending Verification", value: investigations.length, color: "text-amber-500" },
                   { label: "High Severity", value: investigations.filter(v => ['critical', 'high'].includes(v.severity?.toLowerCase())).length, color: "text-rose-500" }
                 ].map((stat, i) => (
                   <div key={i} className="flex justify-between items-center group cursor-default">
                      <span className="text-sm font-sans text-muted-foreground group-hover:text-foreground transition-colors">{stat.label}</span>
                      <span className={cn("text-2xl font-serif font-medium", stat.color)}>{stat.value}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="ares-card p-8 bg-secondary/10 whisper-shadow border-dashed border-2 border-border/40 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                 <Target className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                 <h4 className="font-serif font-medium">Trace Target</h4>
                 <p className="text-sm text-muted-foreground">Redirect agent attention to a specific hash or contract address.</p>
              </div>
              <button className="text-[13px] font-medium text-primary hover:underline">Configure Probe</button>
           </div>
        </div>

        {/* Trace Timeline */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-2xl font-serif font-medium">Open Case Registry</h2>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted-foreground">Search Registry</span>
              </div>
           </div>

           <div className="space-y-4">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="ares-card p-6 bg-secondary/5 animate-pulse h-24" />
                ))
              ) : investigations.length === 0 ? (
                <div className="ares-card p-12 text-center text-muted-foreground italic font-serif">
                   Clear horizon. No active investigation threads.
                </div>
              ) : investigations.map((inv) => (
                 <div key={inv.id} className="ares-card p-6 whisper-shadow group hover:ring-shadow transition-all bg-card border border-border">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <div className="space-y-1">
                          <div className="flex items-center gap-3">
                             <div className={cn(
                               "w-2 h-2 rounded-full",
                               inv.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-muted"
                             )} />
                             <h4 className="text-lg font-serif font-medium group-hover:text-primary transition-colors cursor-pointer">{inv.title}</h4>
                             <span className={cn(
                               "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                               inv.severity?.toLowerCase() === 'critical' ? "bg-rose-500/10 text-rose-500 border-rose-500/10" : 
                               inv.severity?.toLowerCase() === 'high' ? "bg-amber-500/10 text-amber-500 border-amber-500/10" : "bg-muted text-muted-foreground"
                             )}>{inv.severity || 'Low'}</span>
                          </div>
                          <div className="flex items-center gap-6 text-[12px] text-muted-foreground font-sans">
                             <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />{inv.target}</span>
                             <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Updated {inv.updatedAt}</span>
                             <span className="flex items-center gap-1.5"><SearchCode className="w-3.5 h-3.5" />{inv.assignedAgent}</span>
                          </div>
                       </div>
                       <button className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-lg text-[13px] font-medium hover:bg-secondary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                          Enter Buffer
                          <ChevronRight className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
