"use client";

import { useState } from "react";
import { ZenithDrawer } from "@/components/ZenithDrawer";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container relative">
      <TopNavBar onAskZenith={() => setIsDrawerOpen(true)} />

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

      <main className="min-h-screen">
        <HeroSection onAskZenith={() => setIsDrawerOpen(true)} />
        <FeaturesSection />
        <ArchitectureComparisonSection />
        <CostEstimateSection />
      </main>

      <Footer />

      {/* The unified drawer overlay for the live application interaction */}
      <ZenithDrawer 
        open={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen} 
        onSessionStateChange={setIsSessionActive}
      />
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
          <a href="#costs" className="text-secondary hover:text-primary transition-colors text-sm font-medium">Costs</a>
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

function ArchitectureComparisonSection() {
  return (
    <section id="architecture" className="py-24 bg-surface-container-low border-t border-outline-variant/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-surface mb-4">Enterprise Architecture Trade-offs</h2>
          <p className="text-secondary max-w-2xl mx-auto">Evaluating the path to production: Lightweight Google-native integration vs a Heavyweight portable middleware stack.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-on-surface flex items-center">
              <span className="material-symbols-outlined text-primary mr-3 text-3xl">flight_takeoff</span>
              Google-Native (Lightweight)
            </h3>
            <p className="text-secondary leading-relaxed">
              This approach completely eliminates WebRTC middleware. The client browser establishes a direct secure feed with the Gemini Live API, bypassing custom server-side media orchestration.
            </p>
            <div className="space-y-4 pt-2">
              <div className="bg-surface p-5 rounded-2xl border border-outline-variant">
                <h4 className="font-bold text-on-surface mb-2 text-green-500">Pros</h4>
                <ul className="text-sm text-secondary space-y-2 list-disc pl-4">
                  <li><strong>Absolute Minimum Latency:</strong> Direct path from browser to Google Cloud CDN.</li>
                  <li><strong>Lower TCO:</strong> Eliminates continuous server compute costs and third-party WebRTC cloud usage.</li>
                  <li><strong>Less Operational Burden:</strong> No media servers or Python Pipecat loops to maintain or scale.</li>
                </ul>
              </div>
              <div className="bg-surface p-5 rounded-2xl border border-outline-variant">
                <h4 className="font-bold text-on-surface mb-2 text-rose-400">Cons</h4>
                <ul className="text-sm text-secondary space-y-2 list-disc pl-4">
                  <li><strong>Vendor Lock-in:</strong> Tightly coupled to Google's specific WebRTC implementation and SDK.</li>
                  <li><strong>Limited Interception:</strong> Audio passes directly to the LLM, making mid-stream server-side redaction/interception difficult.</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-on-surface flex items-center">
              <span className="material-symbols-outlined text-primary mr-3 text-3xl">Pipecat + LiveKit (Heavyweight)</span>
            </h3>
            <p className="text-secondary leading-relaxed">
              This approach routes all user audio and video through a dedicated WebRTC server (LiveKit), where a backend process (Pipecat) intercepts and orchestras the AI logic before connecting to the LLM.
            </p>
            <div className="space-y-4 pt-2">
              <div className="bg-surface p-5 rounded-2xl border border-outline-variant">
                <h4 className="font-bold text-on-surface mb-2 text-green-500">Pros</h4>
                <ul className="text-sm text-secondary space-y-2 list-disc pl-4">
                  <li><strong>Provider Portability:</strong> Pipecat abstracts the LLM. You can swap Gemini for OpenAI or Anthropic by changing a single node.</li>
                  <li><strong>Deep Server-Side Orchestration:</strong> Full control to inject tool calls, transcribe in real-time, or alter audio payloads before the LLM hears them.</li>
                  <li><strong>Enterprise Features:</strong> LiveKit provides native SIP routing, cloud recording, and advanced room management.</li>
                </ul>
              </div>
              <div className="bg-surface p-5 rounded-2xl border border-outline-variant">
                <h4 className="font-bold text-on-surface mb-2 text-rose-400">Cons</h4>
                <ul className="text-sm text-secondary space-y-2 list-disc pl-4">
                  <li><strong>Higher Latency & Cost:</strong> Dual-routing bandwidth (Browser → LiveKit → Pipecat → Gemini) and dedicated container compute limits optimization.</li>
                  <li><strong>Complex Transports:</strong> Introduces multi-point WebRTC fragility (track dropping, dangling tasks) that must be managed.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-surface rounded-3xl border border-outline-variant overflow-hidden mb-16 shadow-lg shadow-outline-variant/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant/50">
                  <th className="p-4 font-headline font-bold text-on-surface">Phase</th>
                  <th className="p-4 font-headline font-bold text-on-surface border-l border-outline-variant/30">Google-Native Alternative <span className="text-secondary font-normal text-sm block mt-1">(Lightweight / Direct)</span></th>
                  <th className="p-4 font-headline font-bold text-on-surface border-l border-outline-variant/30 mt-1">Portable Middleware <span className="text-primary font-normal text-sm block mt-1">(LiveKit + Pipecat)</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-sm">
                <tr>
                  <td className="p-4 font-medium text-on-surface">Text chat</td>
                  <td className="p-4 text-secondary border-l border-outline-variant/30">GECX agent via WebSocket</td>
                  <td className="p-4 text-secondary border-l border-outline-variant/30">Same — no change</td>
                </tr>
                <tr className="bg-surface-container/30">
                  <td className="p-4 font-medium text-on-surface">Initial Escalation</td>
                  <td className="p-4 text-secondary border-l border-outline-variant/30">Browser securely fetches API token and connects directly to Gemini via <br/><code className="text-primary bg-primary/10 px-1 py-0.5 rounded">@google/genai</code> JS SDK</td>
                  <td className="p-4 text-secondary border-l border-outline-variant/30">Backend spins up dedicated Pipecat Python task + LiveKit WebRTC room token.</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-on-surface">Audio/Video Path</td>
                  <td className="p-4 text-secondary border-l border-outline-variant/30">Browser ↔ Gemini Live API</td>
                  <td className="p-4 text-secondary border-l border-outline-variant/30">Browser ↔ LiveKit ↔ Pipecat ↔ Gemini WSS</td>
                </tr>
                <tr className="bg-surface-container/30">
                  <td className="p-4 font-medium text-on-surface">Required Infrastructure</td>
                  <td className="p-4 text-secondary border-l border-outline-variant/30">Auth Token Proxy (Minimal Compute)</td>
                  <td className="p-4 text-secondary border-l border-outline-variant/30">LiveKit Cloud + Sustained Compute Container</td>
                </tr>
              </tbody>
            </table>
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
        {/* Cost Analysis Module */}
        <div className="mb-0">
          <h3 className="text-3xl font-headline font-bold text-on-surface mb-8 text-center text-primary">Cost Estimate per Average Session</h3>
          <p className="text-secondary text-center mb-8 text-sm">Illustrative per-interaction unit costs for a 10-minute multimodal session. Assumes enterprise scale (1M+ interactions/mo) utilizing standard Gemini Flash tier.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:px-12">
            <div className="bg-surface p-8 rounded-3xl border border-outline-variant relative shadow-md">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-t-3xl"></div>
              <h4 className="text-xl font-bold text-on-surface mb-6 flex items-center justify-between">
                <span>Google-Native <span className="font-normal text-secondary text-sm block mt-1">Lightweight</span></span>
                <span className="text-2xl font-mono text-primary">~$0.26</span>
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
                  <span className="text-secondary font-medium">Secure Auth Proxy Compute</span>
                  <span className="font-mono text-on-surface">$0.01</span>
                </div>
              </div>
              <p className="mt-6 text-xs text-secondary/70 leading-relaxed italic">By pushing the WebRTC stream natively to the client, infrastructure overhead is effectively zeroed out, limiting the bill to raw API consumption.</p>
            </div>

            <div className="bg-surface p-8 rounded-3xl border border-primary/40 relative shadow-xl shadow-primary/5">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-primary rounded-t-3xl"></div>
              <h4 className="text-xl font-bold text-on-surface mb-6 flex items-center justify-between">
                <span>Pipecat + LiveKit <span className="font-normal text-secondary text-sm block mt-1">Heavyweight</span></span>
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
                    <span className="ml-2 text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded">Pipecat Container</span>
                  </span>
                  <span className="font-mono text-on-surface">$0.05</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                  <span className="text-secondary font-medium flex items-center">
                    WebRTC Platform limits
                    <span className="ml-2 text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded">LiveKit Bandwidth</span>
                  </span>
                  <span className="font-mono text-on-surface">$0.02</span>
                </div>
              </div>
              <p className="mt-6 text-xs text-secondary/70 leading-relaxed italic">Accumulates a roughly ~20% markup per session due to the continuous server-side resources strictly required to proxy the media streams.</p>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-primary-container/30 rounded-2xl p-6 border border-primary/30 flex items-start gap-4 mx-auto max-w-4xl">
           <span className="material-symbols-outlined text-primary text-3xl mt-1">balance</span>
           <div>
              <p className="text-on-surface font-medium leading-relaxed">
                <strong className="text-primary tracking-wide">THE VERDICT:</strong><br/>
                If your deployment focuses strictly on cost-optimization and relies exclusively on Google's Gemini models, the native lightweight approach is vastly superior. Conversely, if you prioritize enterprise portability, multi-LLM fallback strategies, or require deep server-side observability of the audio payload before the AI processes it, the heavyweight investment is mandatory.
              </p>
           </div>
        </div>

      </div>
    </section>
  );
}
