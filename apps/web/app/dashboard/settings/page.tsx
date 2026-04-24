"use client";

import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Bell, 
  Globe, 
  Cpu, 
  Key, 
  Lock,
  ChevronRight,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden">
        <div>
          <p className="text-[12px] font-sans font-semibold text-primary uppercase tracking-[0.2em] mb-3">System Configuration</p>
          <h1 className="text-5xl font-serif font-medium tracking-tight text-foreground mb-4">Settings</h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Configure ARES orchestration parameters, model provider keys, 
            and decentralized notification preferences.
          </p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary rounded-xl text-[14px] font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 shrink-0">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        <aside className="space-y-1">
           {[
             { id: 'general', label: 'General', icon: SettingsIcon, active: true },
             { id: 'security', label: 'Agent Security', icon: Shield },
             { id: 'intelligence', label: 'Intelligence Keys', icon: Key },
             { id: 'notifications', label: 'Alerting', icon: Bell },
             { id: 'network', label: 'Node Network', icon: Globe },
           ].map((item) => (
             <button 
               key={item.id} 
               className={cn(
                 "w-full flex items-center justify-between px-4 py-3 rounded-xl text-[14px] font-medium transition-all group",
                 item.active ? "bg-secondary text-primary shadow-sm" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
               )}
             >
               <div className="flex items-center gap-3">
                 <item.icon className="w-4 h-4" />
                 {item.label}
               </div>
               {item.active && <ChevronRight className="w-3.5 h-3.5" />}
             </button>
           ))}
        </aside>

        <div className="md:col-span-3 space-y-8">
           <section className="ares-card p-8 bg-secondary/10 whisper-shadow space-y-6">
              <h3 className="text-2xl font-serif font-medium flex items-center gap-3">
                 <Key className="w-6 h-6 text-primary" />
                 Model Provider Authentication
              </h3>
              <p className="text-muted-foreground text-[15px] leading-relaxed max-w-2xl">
                 ARES requires authenticated access to LLM providers to power its autonomous logical buffers. 
                 Keys are stored in your local execution environment (`.env.local`).
              </p>
              
              <div className="space-y-4 pt-4">
                 {[
                   { label: 'Google Gemini API Key', value: '••••••••••••••••' },
                   { label: 'OpenRouter API Key', value: '••••••••••••••••' },
                   { label: 'Helius RPC Endpoint', value: 'https://mainnet.helius-rpc.com/...' }
                 ].map((field, i) => (
                   <div key={i} className="flex flex-col space-y-2">
                      <label className="text-xs font-sans font-bold uppercase tracking-widest text-muted-foreground">{field.label}</label>
                      <div className="flex gap-4">
                         <input 
                           type="password" 
                           defaultValue={field.value}
                           className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-[14px] focus:ring-1 focus:ring-primary/30 transition-all font-mono"
                         />
                         <button className="px-4 py-2 bg-secondary border border-border rounded-xl text-[13px] font-medium hover:bg-muted transition-all">Rotate</button>
                      </div>
                   </div>
                 ))}
              </div>
           </section>

           <section className="ares-card p-8 bg-secondary/10 whisper-shadow space-y-6 opacity-60 pointer-events-none grayscale">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-serif font-medium flex items-center gap-3">
                   <Shield className="w-6 h-6 text-primary" />
                   Agent Execution Sandbox
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full">Managed by Cloud</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                 <div className="space-y-1">
                    <p className="font-medium text-[15px]">Enforce Immutable Snapshots</p>
                    <p className="text-sm text-muted-foreground">Agents cannot modify existing logical buffers after synthesis.</p>
                 </div>
                 <div className="w-10 h-6 bg-primary rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1" />
                 </div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
