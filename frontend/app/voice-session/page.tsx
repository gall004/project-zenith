import { LiveKitSession } from "@/components/LiveKitSession";

export default function VoiceSessionPage(): React.JSX.Element {
  // Generate a random user ID for demo purposes without using client hooks in page
  const identity = `user-${Math.floor(Math.random() * 100000)}`;
  
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen p-6 sm:p-12 bg-background">
      <div className="w-full max-w-4xl space-y-6 mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Voice Intercept Terminal</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Initializing connection to the enterprise Pipecat orchestrator block natively.
        </p>
      </div>
      
      <LiveKitSession roomName="gecx-demo-engine" identity={identity} />
    </div>
  );
}
