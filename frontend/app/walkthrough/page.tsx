"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WalkthroughPage() {
  const handleOpenZenith = () => {
    window.dispatchEvent(new CustomEvent("open-zenith"));
  };

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container min-h-screen flex flex-col pt-16">
      <main className="flex-grow pt-16 pb-24 container mx-auto px-4 md:px-6 max-w-4xl relative">
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary-container/20 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 space-y-12 animate-in slide-in-from-bottom-8 duration-700 fade-in">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-sm font-medium mb-6">
              <span className="material-symbols-outlined text-sm">school</span>
              <span>Interactive Tutorial</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface mb-4 tracking-tight leading-tight">
              The Universal <span className="text-primary">Concierge</span> Walkthrough
            </h1>
            <p className="text-lg text-secondary max-w-2xl mx-auto leading-relaxed">
              A self-guided journey to testing the full capabilities of Zenith's multimodal architecture, from intelligent text routing to live contextual video.
            </p>
          </div>

          <div className="border border-outline-variant rounded-3xl bg-surface-container-low overflow-hidden shadow-xl shadow-surface-container-highest/20">
            <div className="p-8 border-b border-outline-variant/50 bg-surface-container">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">science</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-headline">Preparation</h2>
                  <p className="text-secondary text-sm">Getting your environment ready for the demo.</p>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface border-2 border-outline-variant flex items-center justify-center text-secondary font-bold text-sm">1</div>
                <div>
                  <h3 className="font-bold text-lg mb-1 text-on-surface">Launch the Application</h3>
                  <p className="text-secondary text-sm leading-relaxed">Open the Zenith Agent by clicking the <strong>Launch Agent</strong> button in the top right, or on the main landing page.</p>
                </div>
              </div>
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface border-2 border-outline-variant flex items-center justify-center text-secondary font-bold text-sm">2</div>
                <div>
                  <h3 className="font-bold text-lg mb-1 text-on-surface">Prepare External Objects</h3>
                  <p className="text-secondary text-sm leading-relaxed">For the object recognition phase, grab an everyday object (like a Starbucks coffee cup, a pen, or a notebook) to show the agent.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-outline-variant rounded-3xl bg-surface-container-low overflow-hidden shadow-xl shadow-surface-container-highest/20">
            <div className="p-8 border-b border-outline-variant/50 bg-primary/5">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#00D4FF]/20 text-[#00D4FF] rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">chat</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-headline">Phase 1: Text Orchestration</h2>
                  <p className="text-secondary text-sm">Testing the GECX agent's natural language understanding.</p>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex space-x-4 group">
                <div className="flex-shrink-0 mt-1">
                  <span className="material-symbols-outlined text-[#00D4FF] group-hover:scale-110 transition-transform">keyboard_double_arrow_right</span>
                </div>
                <div>
                  <p className="text-on-surface font-medium mb-2">In the chat window, send the following message:</p>
                  <blockquote className="bg-surface border border-outline-variant p-4 rounded-xl text-secondary font-mono text-sm italic">
                    "I have an object here but I'm not sure what it is. Can you help me identify it?"
                  </blockquote>
                  <div className="mt-3 bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <p><strong>Expected:</strong> The GECX agent should offer to assist and immediately request permission to activate your camera for a visual inspection.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-outline-variant rounded-3xl bg-surface-container-low overflow-hidden shadow-xl shadow-surface-container-highest/20">
            <div className="p-8 border-b border-outline-variant/50 bg-rose-500/5">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">visibility</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-headline">Phase 2: Visual Escalation & Handling</h2>
                  <p className="text-secondary text-sm">Testing the Gemini Live Multimodal WebRTC pipeline.</p>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-8">
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-500/20 border-2 border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-sm">1</div>
                <div className="w-full">
                  <h3 className="font-bold text-lg mb-2 text-on-surface">Accept the Camera Request</h3>
                  <p className="text-secondary text-sm mb-4 leading-relaxed">Click <strong>Connect</strong> when the UI slideover requests hardware access. The Pipecat agent will boot up and greet you warmly via spoken audio.</p>
                </div>
              </div>

              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-500/20 border-2 border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-sm">2</div>
                <div className="w-full">
                  <h3 className="font-bold text-lg mb-2 text-on-surface">Test Edge Case: Pitch Black Camera</h3>
                  <p className="text-secondary text-sm mb-3 leading-relaxed">Cover your laptop camera entirely grouping your hand over it. Wait a few seconds and ask via audio:</p>
                  <blockquote className="bg-surface border border-outline-variant p-4 rounded-xl text-secondary font-mono text-sm italic w-full">
                    "Can you still see what I'm doing?"
                  </blockquote>
                  <div className="mt-3 bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <p><strong>Expected:</strong> The agent should politely inform you that the screen is dark and ask you to adjust your lighting, without speaking any markdown formatting.</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-500/20 border-2 border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-sm">3</div>
                <div className="w-full">
                  <h3 className="font-bold text-lg mb-2 text-on-surface">Provide Visual Context</h3>
                  <p className="text-secondary text-sm mb-3 leading-relaxed">Uncover the camera, hold up your object (e.g. coffee cup), and ask:</p>
                  <blockquote className="bg-surface border border-outline-variant p-4 rounded-xl text-secondary font-mono text-sm italic w-full">
                    "Can you tell me what I'm holding and what it is used for?"
                  </blockquote>
                  <div className="mt-3 bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <p><strong>Expected:</strong> Complete multimodal synthesis. The agent should excitedly identify the object and explain its purpose.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-outline-variant rounded-3xl bg-surface-container-low overflow-hidden shadow-xl shadow-surface-container-highest/20 relative">
             <div className="absolute top-0 right-0 hidden md:block">
               <div className="w-24 h-24 bg-gradient-to-bl from-primary/30 to-transparent rounded-bl-full"></div>
             </div>
            <div className="p-8 border-b border-outline-variant/50 bg-indigo-500/5">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/10">
                  <span className="material-symbols-outlined text-2xl">handshake</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-headline">Phase 3: Contextual Handoff</h2>
                  <p className="text-secondary text-sm">Testing the seamless transition back to text mode with preserved context.</p>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex space-x-4 group">
                <div className="flex-shrink-0 mt-1">
                  <span className="material-symbols-outlined text-indigo-400 group-hover:translate-x-1 transition-transform">double_arrow</span>
                </div>
                <div className="w-full">
                  <p className="text-on-surface font-medium mb-3">When you are satisfied with the interaction, tell the agent via audio:</p>
                  <blockquote className="bg-surface border border-outline-variant p-4 rounded-xl text-secondary font-mono text-sm italic shadow-inner">
                    "That's all the help I need right now. Thanks!"
                  </blockquote>
                  <div className="mt-4 space-y-3">
                    <div className="bg-surface-container border border-outline-variant p-4 rounded-lg text-sm flex items-center gap-3">
                      <span className="material-symbols-outlined text-indigo-400 animate-pulse">videocam_off</span>
                      <p className="text-secondary"><strong>Watch the UI:</strong> The Pipecat agent will confirm the handoff, actively shut down the camera stream, and dynamically collapse the video window.</p>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg text-sm flex items-start gap-3">
                      <span className="material-symbols-outlined text-[20px] mt-0.5">forum</span>
                      <div>
                        <p className="mb-1"><strong>The Magic Handoff:</strong></p>
                        <p>Look at your text chat. The GECX agent will immediately send you a new text message incorporating a summary of your video session (e.g., <em>"I'm glad we could identify that coffee cup for you! Do you need anything else?"</em>), completely preserving the contextual continuity between the two disconnected agent brains.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-8 pb-12">
            <Button onClick={handleOpenZenith} size="lg" className="rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant h-14 px-8 font-bold shadow-lg group">
              Ready? Launch the Universal Concierge
              <span className="material-symbols-outlined ml-2 group-hover:rotate-12 transition-transform text-[#00D4FF]">chat_spark</span>
            </Button>
          </div>

        </div>
      </main>
    </div>
  );
}
