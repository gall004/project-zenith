"use client";

import { useState } from "react";
import { ZenithDrawer } from "@/components/ZenithDrawer";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';

const Mermaid = dynamic(() => import('@/components/Mermaid'), { ssr: false });

export default function LandingPage() {
  return (
    <>
      <main className="min-h-screen">
        <HeroSection />
        <FeaturesSection />
        <ArchitectureSection />
        <CostEstimateSection />
      </main>

      <Footer />
    </>
  );
}

function HeroSection() {
  const handleOpenZenith = () => {
    window.dispatchEvent(new CustomEvent("open-zenith"));
  };
  
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
            onClick={handleOpenZenith}
            size="lg"
            data-slot="button"
            className="w-full sm:w-auto bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-lg font-bold text-lg hover:shadow-[0_8px_32px_rgba(0,84,214,0.3)] transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center space-x-3 group h-14 px-8"
          >
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
            <span>Ask Zenith</span>
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
        <div className="mt-16 text-center">
          <a href="/walkthrough" className="inline-flex items-center space-x-2 bg-primary/10 hover:bg-primary/20 text-primary px-6 py-3 rounded-full font-bold transition-all border border-primary/20 hover:border-primary/40 group">
            <span className="material-symbols-outlined text-xl">school</span>
            <span>Take the Interactive Walkthrough</span>
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </a>
        </div>
      </div>
    </section>
  );
}



function Footer() {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white w-full border-t border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-6 py-10 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <span className="material-symbols-outlined text-2xl text-primary">radar</span>
          <span className="font-headline font-black text-xl tracking-tight">
            Project <span className="text-primary">Zenith</span>
          </span>
        </div>
        <div className="text-sm text-outline-variant font-label">
          &copy; {new Date().getFullYear()} TTEC Digital. All systems operational.
        </div>
      </div>
    </footer>
  );
}

function ArchitectureSection() {
  return (
    <section id="architecture" className="py-24 bg-surface-container-low border-t border-outline-variant/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-surface mb-4">Enterprise Multimodal Architecture</h2>
          <p className="text-secondary max-w-2xl mx-auto">Evaluating the path to production: Why a portable middleware stack is mandatory for enterprise AI integration.</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8 mb-16">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-4">
              <span className="material-symbols-outlined text-4xl">lan</span>
            </div>
            <h3 className="text-2xl font-bold text-on-surface">Portable Middleware Stack <span className="text-secondary font-normal text-lg block sm:inline mt-1 sm:mt-0">(e.g., LiveKit + Pipecat)</span></h3>
            <p className="text-secondary leading-relaxed text-lg pb-4 text-left md:text-center">
              Direct frontend SDKs rely on standard WebSockets (TCP), which suffer from packet-loss and stuttering during media streaming. A proper enterprise architecture routes user audio and video through a dedicated WebRTC server, where a backend process orchestrates the AI logic before connecting to the LLM.
            </p>
          </div>

          <Mermaid chart={`graph TB
    subgraph "Google Cloud Platform"
        subgraph "Cloud Run"
            FE["Web Frontend"]
            BE_API["FastAPI Backend<br/>(CX Orchestrator)"]
            BE_MEDIA["Pipecat Backend<br/>(Media Pipeline)"]
        end
        
        subgraph "Managed Services"
            MS["Memorystore"]
            SM["Secret Manager"]
        end
        
        subgraph "Networking"
            VPC["Serverless VPC Connector"]
        end
        
        BE_API -->|Private IP| VPC
        BE_MEDIA -->|Private IP| VPC
        VPC -->|VPC Peering| MS
        BE_API -.->|Mounted Secrets| SM
    end
    
    subgraph "WebRTC Transport"
        LK["LiveKit Cloud"]
    end
    
    subgraph "Google AI Edge"
        CX["Gemini Enterprise for CX"]
        GL["Gemini Multimodal Live API"]
    end
    
    User["Web Browser"] -->|HTTPS| FE
    User -->|WSS Control| BE_API
    BE_API -->|REST or Webhooks| CX
    
    User <-->|UDP WebRTC Media| LK
    LK <-->|Server to Server WebRTC| BE_MEDIA
    BE_MEDIA <-->|Realtime Streaming| GL
`} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface p-6 rounded-2xl border border-outline-variant hover:border-primary/50 transition-colors">
              <h4 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">router</span>
                Enterprise Transport
              </h4>
              <p className="text-sm text-secondary leading-relaxed">
                Platforms like LiveKit provide true WebRTC (UDP) transport, preventing the packet-loss and stuttering inherent to standard direct-to-browser WebSockets.
              </p>
            </div>
            <div className="bg-surface p-6 rounded-2xl border border-outline-variant hover:border-primary/50 transition-colors">
              <h4 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">webhook</span>
                Function Calling
              </h4>
              <p className="text-sm text-secondary leading-relaxed">
                Middleware provides the secure, server-side environment needed to natively execute Gemini tool calls, enabling dynamic routing and external API integration.
              </p>
            </div>
            <div className="bg-surface p-6 rounded-2xl border border-outline-variant hover:border-primary/50 transition-colors">
              <h4 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">swap_horiz</span>
                Provider Portability
              </h4>
              <p className="text-sm text-secondary leading-relaxed">
                Abstracts the LLM connection. You can swap Gemini for OpenAI or Anthropic by changing a single pipeline node, preventing vendor lock-in.
              </p>
            </div>
            <div className="bg-surface p-6 rounded-2xl border border-outline-variant hover:border-primary/50 transition-colors">
              <h4 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">graphic_eq</span>
                AI Noise Filtering
              </h4>
              <p className="text-sm text-secondary leading-relaxed">
                Client-side WebAssembly models optionally isolate the primary speaker from background voices before audio ever hits the network.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CostEstimateSection() {
  return (
    <section id="costs" className="py-24 bg-surface">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-0">
          <h3 className="text-3xl font-headline font-bold text-on-surface mb-8 text-center text-primary">Cost Estimate per Average Session</h3>
          <p className="text-secondary text-center mb-12 text-sm max-w-3xl mx-auto">Illustrative per-interaction unit costs for a 10-minute multimodal session utilizing a middleware stack. Assumes enterprise scale (1M+ interactions/mo) with the Gemini Flash tier.</p>
          
          <div className="max-w-xl mx-auto">
            <div className="bg-surface p-8 rounded-3xl border border-primary/40 relative shadow-xl shadow-primary/5">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-primary rounded-t-3xl"></div>
              <h4 className="text-xl font-bold text-on-surface mb-6 flex items-center justify-between">
                <span>Enterprise Implementation <span className="font-normal text-secondary text-sm block mt-1">LiveKit + Pipecat (or equivalent)</span></span>
                <span className="text-2xl font-mono text-primary">~$0.32</span>
              </h4>
              <div className="space-y-4 text-sm mt-8">
                <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                  <span className="text-secondary font-medium">GECX Text Processing</span>
                  <span className="font-mono text-on-surface">$0.05</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                  <span className="text-secondary font-medium">Gemini Audio Input (10m)</span>
                  <span className="font-mono text-on-surface">$0.12</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                  <span className="text-secondary font-medium">Gemini Audio Output (Gen)</span>
                  <span className="font-mono text-on-surface">$0.08</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                  <span className="text-secondary font-medium flex items-center">
                    Middleware Compute
                    <span className="ml-2 text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded">Execution Server</span>
                  </span>
                  <span className="font-mono text-on-surface">$0.05</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                  <span className="text-secondary font-medium flex items-center">
                    WebRTC Platform
                    <span className="ml-2 text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded">Bandwidth & Connect</span>
                  </span>
                  <span className="font-mono text-on-surface">$0.02</span>
                </div>
              </div>
              <p className="mt-8 text-xs text-secondary/70 leading-relaxed italic text-center">Incorporates the server-side resources strictly required to intercept, route, and proxy the media streams for active AI orchestration.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
