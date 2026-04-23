"use client";

import { useUIStore } from "@/lib/ares/store";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";

export default function AppRedirect() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      window.location.href = "/dashboard/overview";
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f4ed] flex items-center justify-center font-sans antialiased">
      <div className="flex flex-col items-center gap-8 max-w-sm text-center">
        <div className="relative">
          <div className="w-16 h-16 bg-[#c96442] flex items-center justify-center rounded-2xl shadow-2xl shadow-[#c96442]/20 animate-in zoom-in duration-1000">
            <Shield className="w-8 h-8 text-[#faf9f5]" />
          </div>
          <div className="absolute -inset-4 border-2 border-[#e8e6dc] rounded-[24px] animate-pulse" />
        </div>
        
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <h1 className="text-3xl font-serif text-[#141413] tracking-tight">Initializing ARES</h1>
          <p className="text-sm text-[#5e5d59] leading-relaxed">
            Synchronizing autonomous models and secure telemetry buffers. 
            Establishing encrypted operator session.
          </p>
        </div>

        <div className="w-48 h-1 bg-[#e8e6dc] rounded-full overflow-hidden">
          <div className="h-full bg-[#c96442] w-1/3 animate-[progress_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
