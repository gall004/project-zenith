"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      fontFamily: "var(--font-sans)",
      securityLevel: "loose",
    });
    
    // Create a unique id for the mermaid diagram
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

    if (ref.current) {
      mermaid.render(id, chart).then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg;
          setRendered(true);
        }
      });
    }
  }, [chart]);

  return (
    <div className={`flex justify-center w-full my-12 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-4 sm:p-8 transition-opacity duration-700 ${rendered ? 'opacity-100' : 'opacity-0'}`}>
      <div ref={ref} className="w-full [&>svg]:w-full [&>svg]:max-w-none [&>svg]:h-auto font-sans" />
    </div>
  );
}
