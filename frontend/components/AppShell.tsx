"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ZenithDrawer } from "@/components/ZenithDrawer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsDrawerOpen(true);
    window.addEventListener("open-zenith", handleOpen);
    return () => window.removeEventListener("open-zenith", handleOpen);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 text-on-surface">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-primary group">
            <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform duration-300">
              radar
            </span>
            <span className="font-headline font-bold text-xl tracking-tight text-on-surface">
              Project <span className="text-primary">Zenith</span>
            </span>
          </Link>
          <nav className="hidden md:flex space-x-8 items-center">
            <Link href="/#features" className="text-secondary hover:text-primary transition-colors text-sm font-medium">Features</Link>
            <Link href="/#architecture" className="text-secondary hover:text-primary transition-colors text-sm font-medium">Architecture</Link>
            <Link href="/#costs" className="text-secondary hover:text-primary transition-colors text-sm font-medium">Costs</Link>
            <Link href="/walkthrough" className="text-secondary hover:text-primary transition-colors text-sm font-medium">Walkthroughs</Link>
          </nav>
          <Button
            onClick={() => setIsDrawerOpen(true)}
            data-slot="button"
            className="bg-primary hover:bg-primary/90 text-on-primary rounded-full font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center space-x-2"
          >
            <span>Ask Zenith</span>
            <span className="material-symbols-outlined text-sm">chat_spark</span>
          </Button>
        </div>
      </header>

      {isSessionActive && !isDrawerOpen && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-primary text-on-primary shadow-md animate-in slide-in-from-top duration-300 border-b border-primary-container">
          <div className="container mx-auto px-4 md:px-6 py-2 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <span className="text-sm font-medium tracking-tight">Active Zenith Session</span>
            </div>
            <Button 
              size="sm" 
              onClick={() => setIsDrawerOpen(true)}
              className="h-8 text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-sm"
            >
              Return to Session
            </Button>
          </div>
        </div>
      )}

      {children}

      <ZenithDrawer 
        open={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen} 
        onSessionStateChange={setIsSessionActive}
      />
    </>
  );
}
