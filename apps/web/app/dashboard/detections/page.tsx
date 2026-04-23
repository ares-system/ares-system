"use client";

import { 
  AlertTriangle, 
  ShieldAlert, 
  Search, 
  Filter, 
  MoreVertical, 
  ExternalLink,
  ChevronRight,
  Clock,
  User,
  CheckCircle2
} from "lucide-react";
import { mockDetections } from "@/lib/ares/mock-data";
import { cn } from "@/lib/utils";

export default function DetectionsPage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[12px] font-sans font-semibold text-primary uppercase tracking-[0.2em] mb-3">Triage & Analysis</p>
          <h1 className="text-5xl font-serif font-medium tracking-tight text-foreground mb-4">Signal Intelligence</h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Autonomous detection logs from the ARES engine. Each signal represents 
            a behavioral anomaly or known vulnerability pattern.
          </p>
        </div>
        <div className="flex gap-3">
           <button className="px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-[14px] font-medium hover:bg-muted transition-all ring-shadow flex items-center gap-2">
             <CheckCircle2 className="w-4 h-4 text-emerald-500" />
             Dismiss All
           </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="ares-card p-4 bg-secondary/20 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Active Critical</p>
              <p className="text-2xl font-serif font-medium">04</p>
            </div>
         </div>
         <div className="ares-card p-4 bg-secondary/20 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Pending Triage</p>
              <p className="text-2xl font-serif font-medium">18</p>
            </div>
         </div>
         <div className="ares-card p-4 bg-secondary/20 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Avg Resolve Time</p>
              <p className="text-2xl font-serif font-medium">42m</p>
            </div>
         </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 pb-4 border-b border-border">
        <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-secondary/30 rounded-xl border border-border group focus-within:ring-1 focus-within:ring-primary/30 transition-all">
          <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <input 
            type="text" 
            placeholder="Search by indicator, target, or severity..."
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-muted-foreground/60"
          />
        </div>
        <button className="px-4 py-2 bg-secondary/50 border border-border rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-muted transition-all">
          <Filter className="w-4 h-4" />
          More Filters
        </button>
      </div>

      {/* Detection List */}
      <div className="space-y-4">
        {mockDetections.map((detection) => (
          <div key={detection.id} className="ares-card overflow-hidden whisper-shadow group hover:ring-shadow transition-all">
            <div className="p-6 flex flex-col md:flex-row gap-6 md:items-center">
              <div className={cn(
                "w-3 h-12 rounded-full shrink-0",
                detection.severity === 'critical' ? "bg-destructive shadow-lg shadow-destructive/20" : 
                detection.severity === 'high' ? "bg-primary shadow-lg shadow-primary/20" : "bg-muted-foreground/30"
              )} />
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-serif font-medium group-hover:text-primary transition-colors cursor-pointer">{detection.title}</h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                    detection.severity === 'critical' ? "bg-destructive/10 text-destructive border-destructive/20" : 
                    "bg-primary/10 text-primary border-primary/20"
                  )}>
                    {detection.severity}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-[13px] text-muted-foreground font-sans">
                   <div className="flex items-center gap-1.5 underline decoration-border underline-offset-4 cursor-pointer hover:text-foreground transition-colors">
                     <Target className="w-3.5 h-3.5" />
                     {detection.targetId}
                   </div>
                   <div className="flex items-center gap-1.5">
                     <Clock className="w-3.5 h-3.5" />
                     {new Date(detection.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </div>
                   <div className="flex items-center gap-1.5">
                     <User className="w-3.5 h-3.5" />
                     {detection.assignee || "Unassigned"}
                   </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button className="px-5 py-2 bg-secondary text-foreground rounded-xl text-xs font-semibold hover:bg-muted transition-all uppercase tracking-widest">Investigate</button>
                <div className="p-2 border border-border rounded-xl hover:bg-secondary transition-all cursor-pointer">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            
            {/* Expanded section or preview tags */}
            <div className="px-6 py-3 bg-secondary/10 border-t border-border flex gap-2">
               {detection.indicators.map(tag => (
                 <span key={tag} className="text-[10px] font-mono text-muted-foreground bg-card px-2 py-0.5 rounded border border-border">{tag}</span>
               ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
