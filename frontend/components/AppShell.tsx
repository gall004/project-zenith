"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ZenithDrawer } from "@/components/ZenithDrawer";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsDrawerOpen(true);
    window.addEventListener("open-zenith", handleOpen);
    return () => window.removeEventListener("open-zenith", handleOpen);
  }, []);

  return (
    <>
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 text-on-surface transition-all duration-300 ease-in-out",
        isDrawerOpen ? "lg:pr-[28rem]" : "pr-0"
      )}>
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-primary group shrink-0">
            <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform duration-300">
              radar
            </span>
            <span className="font-headline font-bold text-xl tracking-tight text-on-surface whitespace-nowrap hidden sm:inline">
              Project <span className="text-primary">Zenith</span>
            </span>
          </Link>
          <nav className="hidden lg:flex space-x-8 items-center shrink-0">
            <Link href="/#features" className="text-secondary hover:text-primary transition-colors text-sm font-medium flex items-center space-x-1.5"><span className="material-symbols-outlined text-[18px]">star</span><span>Features</span></Link>
            <Link href="/#architecture" className="text-secondary hover:text-primary transition-colors text-sm font-medium flex items-center space-x-1.5"><span className="material-symbols-outlined text-[18px]">account_tree</span><span>Architecture</span></Link>
            <Link href="/#costs" className="text-secondary hover:text-primary transition-colors text-sm font-medium flex items-center space-x-1.5"><span className="material-symbols-outlined text-[18px]">payments</span><span>Costs</span></Link>
            <Link href="/walkthrough" className="text-secondary hover:text-primary transition-colors text-sm font-medium flex items-center space-x-1.5"><span className="material-symbols-outlined text-[18px]">explore</span><span>Walkthroughs</span></Link>
          </nav>
          <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
            <Button
              onClick={() => setIsDrawerOpen(true)}
              data-slot="button"
              className="bg-primary hover:bg-primary/90 text-on-primary rounded-full font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center space-x-2 px-3 sm:px-4"
            >
              <span className="hidden sm:inline whitespace-nowrap">Ask Zenith</span>
              <span className="material-symbols-outlined text-[18px] sm:text-sm">chat_spark</span>
            </Button>
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-on-surface hover:text-primary transition-colors focus:outline-hidden flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-2xl">
                {isMobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-16 left-0 right-0 bg-surface/95 backdrop-blur-xl border-b border-outline-variant/30 shadow-lg animate-in slide-in-from-top-2 fade-in duration-200">
            <nav className="flex flex-col p-4 space-y-2">
              <Link href="/#features" onClick={() => setIsMobileMenuOpen(false)} className="text-secondary hover:text-primary transition-colors text-base font-medium px-4 py-3 hover:bg-white/5 rounded-md flex items-center space-x-3"><span className="material-symbols-outlined text-xl">star</span><span>Features</span></Link>
              <Link href="/#architecture" onClick={() => setIsMobileMenuOpen(false)} className="text-secondary hover:text-primary transition-colors text-base font-medium px-4 py-3 hover:bg-white/5 rounded-md flex items-center space-x-3"><span className="material-symbols-outlined text-xl">account_tree</span><span>Architecture</span></Link>
              <Link href="/#costs" onClick={() => setIsMobileMenuOpen(false)} className="text-secondary hover:text-primary transition-colors text-base font-medium px-4 py-3 hover:bg-white/5 rounded-md flex items-center space-x-3"><span className="material-symbols-outlined text-xl">payments</span><span>Costs</span></Link>
              <Link href="/walkthrough" onClick={() => setIsMobileMenuOpen(false)} className="text-secondary hover:text-primary transition-colors text-base font-medium px-4 py-3 hover:bg-white/5 rounded-md flex items-center space-x-3"><span className="material-symbols-outlined text-xl">explore</span><span>Walkthroughs</span></Link>
            </nav>
          </div>
        )}
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

      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isDrawerOpen ? "lg:pr-[28rem]" : "pr-0"
      )}>
        {children}
      </div>

      <ZenithDrawer 
        open={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen} 
        onSessionStateChange={setIsSessionActive}
      />
    </>
  );
}
