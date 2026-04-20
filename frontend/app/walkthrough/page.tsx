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
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-sm font-medium mb-6">
              <span className="material-symbols-outlined text-sm">school</span>
              <span>Interactive Tutorial</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface mb-4 tracking-tight leading-tight">
              Project Zenith <span className="text-primary">Walkthroughs</span>
            </h1>
            <p className="text-lg text-secondary max-w-2xl mx-auto leading-relaxed">
              Self-guided journeys to testing the full capabilities of Zenith's multimodal architecture. Choose a demo below to get started.
            </p>
          </div>

          <div className="bg-surface-container-low border border-outline-variant p-6 rounded-3xl mx-auto mb-12 shadow-sm">
            <h3 className="font-headline font-bold text-lg mb-4 text-on-surface flex items-center">
              <span className="material-symbols-outlined mr-2 text-primary">menu_book</span>
              Table of Contents
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#preparation" className="text-primary hover:underline hover:text-primary/80 flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-sm">build</span> Preparation
                </a>
              </li>
              <li>
                <a href="#visual-context" className="text-primary hover:underline hover:text-primary/80 flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-sm">visibility</span> Visual Context Demo
                </a>
                <p className="text-sm text-secondary ml-6 mt-1">A deep-dive into the Universal Technical Concierge, multimodal escalation, and contextual text handoffs.</p>
              </li>
              <li>
                <a href="#sentiment" className="text-primary hover:underline hover:text-primary/80 flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-sm">mood</span> Sentiment Analysis Demo
                </a>
                <p className="text-sm text-secondary ml-6 mt-1">Test the agent's ability to read your facial expression, empathize, and match your emotional energy in real-time.</p>
              </li>
            </ul>
          </div>

          <div id="preparation" className="scroll-mt-28 border border-outline-variant rounded-3xl bg-surface-container-low overflow-hidden shadow-xl shadow-surface-container-highest/20">
            <div className="p-8 border-b border-outline-variant/50 bg-surface-container">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">science</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-headline">Preparation</h2>
                  <p className="text-secondary text-sm">Getting your environment ready for the demos.</p>
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
                  <p className="text-secondary text-sm leading-relaxed">If you plan on testing the Visual Context Demo, grab an everyday object (like a Starbucks coffee cup, a pen, or a notebook) to show the agent.</p>
                </div>
              </div>
            </div>
          </div>

          <div id="visual-context" className="scroll-mt-28 space-y-12">
            <h2 className="text-3xl font-headline font-bold text-on-surface border-b border-outline-variant pb-4 mt-8 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#00D4FF] text-3xl">camera_view</span>
              Visual Context Demo
            </h2>

            <div className="border border-outline-variant rounded-3xl bg-surface-container-low overflow-hidden shadow-xl shadow-surface-container-highest/20">
              <div className="p-8 border-b border-outline-variant/50 bg-primary/5">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[#00D4FF]/20 text-[#00D4FF] rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">chat</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-headline">Phase 1: Text Orchestration</h2>
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
                    <p className="text-on-surface font-medium mb-2">In the chat window, click the <strong>Visual Context Demo</strong> suggested badge, or type:</p>
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
                    <h2 className="text-xl font-bold font-headline">Phase 2: Visual Escalation & Handling</h2>
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
                    <h2 className="text-xl font-bold font-headline">Phase 3: Contextual Handoff</h2>
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
                    <p className="text-on-surface font-medium mb-3">When you are satisfied with the interaction, tell the agent via audio, or press the End button:</p>
                    <blockquote className="bg-surface border border-outline-variant p-4 rounded-xl text-secondary font-mono text-sm italic shadow-inner">
                      "That's all the help I need right now. Thanks!"
                    </blockquote>
                    <div className="mt-4 space-y-3">
                      <div className="bg-surface-container border border-outline-variant p-4 rounded-lg text-sm flex items-center gap-3">
                        <span className="material-symbols-outlined text-indigo-400 animate-pulse">videocam_off</span>
                        <p className="text-secondary"><strong>Watch the UI:</strong> The session will silently end — the camera stream shuts down and the video window collapses automatically. No spoken goodbye, no manual steps.</p>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg text-sm flex items-start gap-3">
                        <span className="material-symbols-outlined text-[20px] mt-0.5">forum</span>
                        <div>
                          <p className="mb-1"><strong>The Magic Handoff:</strong></p>
                          <p>Look at your text chat. The GECX text agent will seamlessly resume the conversation with a follow-up message that acknowledges what happened in the video session (e.g., <em>"Is there anything else I can help you with?"</em>). Two completely separate agent brains — one voice, one text — and the context carries over automatically.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="sentiment" className="scroll-mt-28 space-y-12">
            <h2 className="text-3xl font-headline font-bold text-on-surface border-b border-outline-variant pb-4 mt-12 flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-500 text-3xl">sentiment_satisfied</span>
              Sentiment Analysis Demo
            </h2>

            <div className="border border-outline-variant rounded-3xl bg-surface-container-low overflow-hidden shadow-xl shadow-surface-container-highest/20">
              <div className="p-8 border-b border-outline-variant/50 bg-amber-500/5">
                <div className="flex items-center space-x-4">
                   <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/10">
                     <span className="material-symbols-outlined text-2xl">chat</span>
                   </div>
                   <div>
                     <h2 className="text-xl font-bold font-headline">Phase 1: Empathetic Triage</h2>
                     <p className="text-secondary text-sm">Testing the agent's ability to detect emotional intent and route to the right specialist.</p>
                   </div>
                 </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex space-x-4 group">
                   <div className="flex-shrink-0 mt-1">
                     <span className="material-symbols-outlined text-amber-400 group-hover:scale-110 transition-transform">keyboard_double_arrow_right</span>
                   </div>
                   <div>
                     <p className="text-on-surface font-medium mb-2">In the chat window, click the <strong>Sentiment Analysis</strong> suggested badge, or type:</p>
                     <blockquote className="bg-surface border border-outline-variant p-4 rounded-xl text-secondary font-mono text-sm italic">
                       "I've been feeling a bit off today and I'm not sure why. Could you take a look at me and tell me how I'm coming across?"
                     </blockquote>
                     <div className="mt-3 bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm flex items-start gap-2">
                       <span className="material-symbols-outlined text-[18px]">check_circle</span>
                       <p><strong>Expected:</strong> The agent should empathize with your feelings and ask for permission to enable your camera so it can see how you're doing.</p>
                     </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="border border-outline-variant rounded-3xl bg-surface-container-low overflow-hidden shadow-xl shadow-surface-container-highest/20">
              <div className="p-8 border-b border-outline-variant/50 bg-rose-500/5">
                <div className="flex items-center space-x-4">
                   <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center">
                     <span className="material-symbols-outlined text-2xl">mood</span>
                   </div>
                   <div>
                     <h2 className="text-xl font-bold font-headline">Phase 2: Emotional Check-In</h2>
                     <p className="text-secondary text-sm">Testing face-to-face sentiment analysis and empathetic mirroring.</p>
                   </div>
                 </div>
              </div>
              <div className="p-8 space-y-8">
                <div className="flex space-x-4">
                   <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-500/20 border-2 border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-sm">1</div>
                   <div className="w-full">
                     <h3 className="font-bold text-lg mb-2 text-on-surface">Accept the Camera Request</h3>
                     <p className="text-secondary text-sm mb-4 leading-relaxed">Grant consent by saying <strong>"Yes"</strong> or <strong>"Sure"</strong> in the chat. Then click <strong>Connect</strong> when the UI requests hardware access. The agent will greet you warmly via spoken audio.</p>
                   </div>
                </div>

                <div className="flex space-x-4">
                   <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-500/20 border-2 border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-sm">2</div>
                   <div className="w-full">
                     <h3 className="font-bold text-lg mb-2 text-on-surface">Show an Expression</h3>
                     <p className="text-secondary text-sm mb-3 leading-relaxed">Ensure your face is clearly visible. Try different expressions — an exaggerated frown, a big smile, or a neutral look — and ask:</p>
                     <blockquote className="bg-surface border border-outline-variant p-4 rounded-xl text-secondary font-mono text-sm italic w-full">
                       "How do I look today?"
                     </blockquote>
                     <div className="mt-4 space-y-3">
                       <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm flex items-start gap-2">
                         <span className="material-symbols-outlined text-[18px]">check_circle</span>
                         <p><strong>Expected:</strong> The agent should read your facial expression and respond with genuine empathy — commenting on whether you look happy, tired, stressed, or relaxed, and following up with a natural question.</p>
                       </div>
                       <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 p-3 rounded-lg text-sm flex items-start gap-2">
                         <span className="material-symbols-outlined text-[18px]">radio_button_checked</span>
                         <p><strong>Conversational Presence:</strong> Notice the glowing orb inside the video view — it pulses in sync with the agent's voice, providing visual feedback that the agent is actively listening.</p>
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="border border-outline-variant rounded-3xl bg-surface-container-low overflow-hidden shadow-xl shadow-surface-container-highest/20 relative">
               <div className="absolute top-0 right-0 hidden md:block">
                 <div className="w-24 h-24 bg-gradient-to-bl from-amber-500/30 to-transparent rounded-bl-full"></div>
               </div>
              <div className="p-8 border-b border-outline-variant/50 bg-indigo-500/5">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/10">
                    <span className="material-symbols-outlined text-2xl">handshake</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-headline">Phase 3: Contextual Handoff</h2>
                    <p className="text-secondary text-sm">Testing the seamless transition back to text with preserved emotional context.</p>
                  </div>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex space-x-4 group">
                  <div className="flex-shrink-0 mt-1">
                    <span className="material-symbols-outlined text-indigo-400 group-hover:translate-x-1 transition-transform">double_arrow</span>
                  </div>
                  <div className="w-full">
                    <p className="text-on-surface font-medium mb-3">When you are satisfied with the interaction, tell the agent via audio, or press the End button:</p>
                    <blockquote className="bg-surface border border-outline-variant p-4 rounded-xl text-secondary font-mono text-sm italic shadow-inner">
                      "That's everything, thank you!"
                    </blockquote>
                    <div className="mt-4 space-y-3">
                      <div className="bg-surface-container border border-outline-variant p-4 rounded-lg text-sm flex items-center gap-3">
                        <span className="material-symbols-outlined text-indigo-400 animate-pulse">videocam_off</span>
                        <p className="text-secondary"><strong>Watch the UI:</strong> The session will silently end — the camera stream shuts down and the video window collapses automatically. No spoken goodbye, no manual steps.</p>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg text-sm flex items-start gap-3">
                        <span className="material-symbols-outlined text-[20px] mt-0.5">forum</span>
                        <div>
                          <p className="mb-1"><strong>The Magic Handoff:</strong></p>
                          <p>Look at your text chat. The GECX text agent will seamlessly resume the conversation with a follow-up that acknowledges your emotional check-in (e.g., <em>"Is there anything else I can help you with?"</em>). Two separate agent brains — one voice, one text — and the emotional context carries over automatically.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-8 pb-12">
            <Button onClick={handleOpenZenith} size="lg" className="rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant h-14 px-8 font-bold shadow-lg group">
              Ready? Launch a Demonstration
              <span className="material-symbols-outlined ml-2 group-hover:rotate-12 transition-transform text-[#00D4FF]">chat_spark</span>
            </Button>
          </div>

        </div>
      </main>
    </div>
  );
}
