"use client";

import { Shield, ArrowRight, Terminal, Globe, Download, Layout, ShieldCheck, Zap, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f5f4ed] selection:bg-[#c96442]/10 font-sans antialiased text-[#141413]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex items-center justify-between backdrop-blur-md bg-[#f5f4ed]/80 border-b border-[#e8e6dc]/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#c96442] flex items-center justify-center rounded-xl shadow-lg shadow-[#c96442]/20">
            <Shield className="w-5 h-5 text-[#faf9f5]" />
          </div>
          <span className="text-xl font-serif font-medium tracking-tight">ARES</span>
        </div>
        <div className="hidden md:flex items-center gap-10 text-[14px] font-medium text-[#5e5d59]">
          <a href="#features" className="hover:text-[#c96442] transition-colors">Framework</a>
          <a href="#agents" className="hover:text-[#c96442] transition-colors">Intelligence</a>
          <a href="#deploy" className="hover:text-[#c96442] transition-colors">Integrations</a>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/overview" 
            className="px-5 py-2.5 bg-[#c96442] text-[#faf9f5] rounded-xl text-[14px] font-medium hover:bg-[#b05234] transition-all shadow-xl shadow-[#c96442]/20"
          >
            Launch Command Center
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-32 px-8 overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#c96442]/10 border border-[#c96442]/20 rounded-full">
              <span className="w-1.5 h-1.5 bg-[#c96442] rounded-full animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#c96442]">Agentic Security Protocol v1.4</span>
            </div>
            <h1 className="text-7xl md:text-8xl font-serif font-medium leading-[0.9] tracking-tight">
              Autonomous <br />
              <span className="text-[#c96442]">Security</span> for <br />
              the Frontier.
            </h1>
            <p className="text-xl text-[#5e5d59] leading-relaxed max-w-lg">
              ARES is an AI-native orchestration layer that autonomously monitors, 
              audits, and protects your decentralized infrastructure across on-chain 
              and off-chain buffers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link 
                href="/dashboard/overview" 
                className="flex items-center justify-center gap-3 px-8 py-4 bg-[#c96442] text-[#faf9f5] rounded-2xl text-[16px] font-medium hover:bg-[#b05234] transition-all shadow-2xl shadow-[#c96442]/20 group"
              >
                Launch Web Dashboard
                <Layout className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button 
                className="flex items-center justify-center gap-3 px-8 py-4 bg-[#e8e6dc] text-[#141413] rounded-2xl text-[16px] font-medium hover:bg-[#dfddcf] transition-all border border-[#d6d4c5]"
              >
                Download CLI SDK
                <Download className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-8 pt-8">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full bg-[#dfddcf] border-2 border-[#f5f4ed]" />
                ))}
              </div>
              <p className="text-sm text-[#5e5d59]">
                Trusted by <span className="font-bold text-[#141413]">500+</span> protocol operators
              </p>
            </div>
          </div>

          <div className="relative animate-in fade-in zoom-in duration-1000 delay-300">
             <div className="relative z-10 p-8 rounded-[40px] bg-[#faf9f5] border border-[#e8e6dc] shadow-2xl whisper-shadow aspect-[4/5] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                   <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#141413]/5" />
                      <div className="w-3 h-3 rounded-full bg-[#141413]/5" />
                      <div className="w-3 h-3 rounded-full bg-[#141413]/5" />
                   </div>
                   <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-500/10">Active Telemetry</div>
                </div>
                
                <div className="space-y-6 flex-1">
                   <div className="p-5 rounded-2xl bg-secondary/20 border border-[#e8e6dc] space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-bold uppercase tracking-widest text-[#5e5d59]">Autonomous Agent</span>
                         <span className="text-xs font-mono">0x4F...E82</span>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-[#c96442] rounded-xl flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-[#faf9f5]" />
                         </div>
                         <div className="space-y-1">
                            <p className="font-serif font-medium">Vulnerability Analyst</p>
                            <p className="text-xs text-[#5e5d59]">Scanning Treasury_Contract.sol</p>
                         </div>
                      </div>
                   </div>

                   <div className="flex-1 space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-[#e8e6dc]/40 animate-pulse">
                           <div className="w-8 h-8 rounded-lg bg-[#dfddcf]" />
                           <div className="flex-1 space-y-1.5 text-xs">
                              <div className="h-2 w-3/4 bg-[#dfddcf] rounded" />
                              <div className="h-2 w-1/2 bg-[#dfddcf] rounded" />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="mt-8 p-6 bg-[#141413] rounded-3xl text-[#faf9f5] space-y-2">
                   <p className="text-[11px] font-mono opacity-40">SYSTEM OUTPUT</p>
                   <p className="font-serif leading-tight text-lg">"Critical logic flaw detected in line 412. Initiating automated buffer lock."</p>
                </div>
             </div>
             
             {/* Decorative Elements */}
             <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#c96442]/5 rounded-full blur-3xl -z-10" />
             <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#c96442]/10 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-32 px-8 bg-[#faf9f5] border-y border-[#e8e6dc]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-20">
             <h2 className="text-4xl font-serif font-medium tracking-tight italic">Unified Intelligence Layer</h2>
             <p className="text-[#5e5d59] max-w-xl mx-auto leading-relaxed">
                One protocol to secure your entire stack. ARES connects directly to your 
                runtime environments to provide audit-level visibility at 100ms latency.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
             {[
               { title: 'Local SDK', icon: Terminal, desc: 'Install our CLI tools to run ARES models inside your own secure execution partitions.' },
               { title: 'SaaS Command Center', icon: Globe, desc: 'A premium web interface for multisig operators to manage and visualize global threat maps.' },
               { title: 'Autonomous Auditing', icon: Zap, desc: 'Real-time agentic research that doesn\'t sleep. Every commit, every transaction is verified.' }
             ].map((feature, i) => (
               <div key={i} className="space-y-6 group">
                  <div className="w-14 h-14 bg-[#f5f4ed] border border-[#e8e6dc] rounded-2xl flex items-center justify-center group-hover:border-[#c96442]/30 group-hover:bg-[#faf9f5] transition-all duration-500">
                    <feature.icon className="w-6 h-6 text-[#c96442]" />
                  </div>
                  <h3 className="text-2xl font-serif font-medium">{feature.title}</h3>
                  <p className="text-[#5e5d59] leading-relaxed italic">{feature.desc}</p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-40 px-8 text-center max-w-4xl mx-auto space-y-12">
        <h2 className="text-5xl md:text-7xl font-serif font-medium tracking-tight leading-tight">
          Ready to secure your <br /> 
          <span className="italic">digital assets?</span>
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
           <Link 
            href="/dashboard/overview" 
            className="w-full sm:w-auto px-10 py-5 bg-[#c96442] text-[#faf9f5] rounded-2xl text-[18px] font-medium hover:bg-[#b05234] hover:scale-105 transition-all shadow-2xl shadow-[#c96442]/30"
           >
            Get Started Free
           </Link>
           <button className="w-full sm:w-auto px-10 py-5 bg-transparent border-2 border-[#141413] rounded-2xl text-[18px] font-medium hover:bg-[#141413] hover:text-[#faf9f5] transition-all">
             View Documentation
           </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-[#e8e6dc] text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-8 h-8 bg-[#c96442] flex items-center justify-center rounded-lg">
            <Shield className="w-4 h-4 text-[#faf9f5]" />
          </div>
          <span className="text-lg font-serif font-medium">ARES Protocol</span>
        </div>
        <p className="text-[12px] font-sans font-bold uppercase tracking-[0.2em] text-[#5e5d59]/50">
          Built for responsibility. Driven by intelligence.
        </p>
      </footer>
    </div>
  );
}
