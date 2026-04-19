"use client";

import { useState } from "react";
import { ZenithDrawer } from "@/components/ZenithDrawer";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container relative">
      <TopNavBar onAskZenith={() => setIsDrawerOpen(true)} />

      <main className="min-h-screen">
        <HeroSection onAskZenith={() => setIsDrawerOpen(true)} />
        <FeaturesSection />
        <BentoGrid />
      </main>

      <Footer />

      {/* The unified drawer overlay for the live application interaction */}
      <ZenithDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} />
    </div>
  );
}

function TopNavBar({ onAskZenith }: { onAskZenith: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 text-on-surface">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center space-x-2 text-primary group">
          <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform duration-300">
            radar
          </span>
          <span className="font-headline font-bold text-xl tracking-tight text-on-surface">
            Project <span className="text-primary">Zenith</span>
          </span>
        </a>
        <nav className="hidden md:flex space-x-8">
          <a href="#features" className="text-secondary hover:text-primary transition-colors text-sm font-medium">Features</a>
          <a href="#architecture" className="text-secondary hover:text-primary transition-colors text-sm font-medium">Architecture</a>
        </nav>
        <Button
          onClick={onAskZenith}
          data-slot="button"
          className="bg-primary hover:bg-primary/90 text-on-primary rounded-full font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center space-x-2"
        >
          <span>Ask Zenith</span>
          <span className="material-symbols-outlined text-sm">chat_spark</span>
        </Button>
      </div>
    </header>
  );
}

function HeroSection({ onAskZenith }: { onAskZenith: () => void }) {
  return (
    <section className="pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-container/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
        <div className="inline-flex items-center space-x-2 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span>v1.0 Operational</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-on-surface mb-6 tracking-tight leading-tight">
          The Precision <span className="text-primary relative inline-block">Void.
            <svg className="absolute -bottom-2 left-0 w-full text-tertiary" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="transparent" />
            </svg>
          </span>
        </h1>
        <p className="text-xl text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
          Project Zenith demonstrates the future of customer experience through multimodal AI. A seamless fusion of Voice, Vision, and Intelligence natively powered by Google Customer Engagement Suite and the Gemini API.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Button
            onClick={onAskZenith}
            size="lg"
            data-slot="button"
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-on-primary rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center space-x-2 group h-14"
          >
            <span>Ask Zenith (Agent)</span>
            <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </Button>
          <a href="https://ai.google.dev/gemini-api/docs" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto bg-surface-container hover:bg-surface-container-high text-on-surface px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 border border-outline-variant hover:border-outline flex items-center justify-center space-x-2 text-center h-14">
            <span>Gemini API Docs</span>
          </a>
          <a href="https://docs.cloud.google.com/customer-engagement-ai/conversational-agents/ps" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto bg-surface-container hover:bg-surface-container-high text-on-surface px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 border border-outline-variant hover:border-outline flex items-center justify-center space-x-2 text-center h-14 whitespace-nowrap">
            <span>CX Agent Studio</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-surface-container-low">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-surface mb-4">Core Capabilities</h2>
          <p className="text-secondary max-w-2xl mx-auto">Engineered for extreme low-latency and maximum context retention.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: "speed", title: "Ultra Low-Latency", desc: "Built on Google's high-speed WebRTC infrastructure for sub-100ms audio delivery, enabling naturally conversational turn-taking." },
            { icon: "visibility", title: "Multimodal Vision", desc: "Seamlessly escalate from text to voice and live video analysis using Gemini Live's native multimodal capabilities." },
            { icon: "architecture", title: "Agentic Orchestration", desc: "Routing intelligence powered by Gemini Enterprise for CX, maintaining continuous conversational context across modalities." }
          ].map((feature, i) => (
            <div key={i} className="bg-surface p-8 rounded-3xl border border-outline-variant hover:border-primary/50 transition-colors group">
              <div className="w-14 h-14 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-3">{feature.title}</h3>
              <p className="text-secondary leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoGrid() {
  return (
    <section id="architecture" className="py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-surface mb-4">Architecture Deep Dive</h2>
          <p className="text-secondary max-w-2xl">The anatomy of the Zenith Stack.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[250px]">
          <div className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-surface-container-high to-surface rounded-[2rem] p-8 border border-outline-variant relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <span className="inline-block bg-primary text-on-primary px-3 py-1 rounded-full text-xs font-bold mb-4 tracking-wider uppercase">Agent Routing</span>
                <h3 className="text-3xl font-headline font-bold text-on-surface mb-4 leading-tight">Dynamic WebSocket Interception</h3>
                <p className="text-secondary text-lg">Traffic routed automatically between the lightweight GECX agent and the heavy-duty Gemini Live multimodal pipeline based on conversational context.</p>
              </div>
              <div className="mt-8 flex items-center space-x-2 text-primary font-medium hover:text-primary/80 cursor-pointer w-fit">
                <span>View Routing Logic</span>
                <span className="material-symbols-outlined text-sm">arrow_outward</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-surface-container rounded-[2rem] p-8 border border-outline-variant flex flex-col justify-between">
            <h3 className="text-xl font-bold text-on-surface">Vertex AI Integration</h3>
            <div className="bg-surface rounded-xl p-4 mt-4 font-mono text-sm text-secondary overflow-hidden border border-outline-variant">
              <code>
                <span className="text-tertiary">async def</span> <span className="text-primary">invoke_agent</span>(session):<br/>
                &nbsp;&nbsp;client = AgentsAsyncClient()<br/>
                &nbsp;&nbsp;<span className="text-tertiary">await</span> client.detect_intent(session)<br/>
                &nbsp;&nbsp;...
              </code>
            </div>
          </div>

          <div className="md:col-span-1 bg-surface-container-highest rounded-[2rem] p-8 border border-outline-variant flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-5xl text-primary mb-4">deployed_code</span>
            <h3 className="font-bold text-on-surface mb-2">Shadcn UI</h3>
            <p className="text-sm text-secondary">Accessible primitives styling.</p>
          </div>

          <div className="md:col-span-1 bg-tertiary-container text-on-tertiary-container rounded-[2rem] p-8 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-5xl mb-4">bolt</span>
            <h3 className="font-bold mb-2">FastAPI Core</h3>
            <p className="text-sm opacity-90">Async Python Engine.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-inverse-surface text-inverse-on-surface py-12 border-t border-outline">
      <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <span className="material-symbols-outlined text-2xl text-primary">radar</span>
          <span className="font-headline font-bold text-xl tracking-tight">
            Project <span className="text-primary">Zenith</span>
          </span>
        </div>
        <div className="text-sm text-outline-variant">
          &copy; {new Date().getFullYear()} TTEC Digital. All systems operational.
        </div>
      </div>
    </footer>
  );
}
