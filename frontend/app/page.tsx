import { buttonVariants } from "@/components/ui/button";

export default function Home(): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      {/* Ambient glow effect */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <main className="relative z-10 flex max-w-2xl flex-col items-center gap-8 text-center">
        {/* Status badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          All Systems Operational
        </div>

        {/* Heading */}
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Project Zenith
        </h1>

        {/* Description */}
        <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
          Real-time voice AI platform powered by LiveKit WebRTC and Pipecat
          media pipelines. Ultra-low-latency conversational AI for enterprise.
        </p>

        {/* Stack tags */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            "Next.js 16",
            "React 19",
            "Tailwind v4",
            "Shadcn UI",
            "LiveKit",
            "TypeScript",
          ].map((tech) => (
            <span
              key={tech}
              className="rounded-md border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            data-slot="button"
            href="https://docs.livekit.io"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "lg" })}
          >
            LiveKit Docs
          </a>
          <a
            data-slot="button"
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Next.js Docs
          </a>
        </div>
      </main>
    </div>
  );
}
