# Proper Aesthetic Application Plan

This revised plan correctly applies the *design patterns* and *color strategies* from the "Precision Void" HTML mock, ensuring **zero structural or content changes** to the existing React components. 

## Context on the Dark Mode Anomaly
The reason the browser continued to render a "dark theme" locally is due to a persistent locally-cached DOM class (`.dark`) on your browser combined with residual Shadcn `.dark` `oklch` variables in `globals.css`. By properly weaving your supplied utility design patterns directly onto the components and purging legacy dark fallbacks, the UI will snap into the intended light surface aesthetic immediately.

## Proposed Strategy:

- **AppShell Header Aesthetic:** Update the underlying `bg-surface/80` to the glassmorphism `bg-white/80 dark:bg-slate-950/80 backdrop-blur-md` aesthetic, shift the font patterns to match the `font-['Space_Grotesk'] font-bold tracking-tight text-slate-900` specification, without adding or removing any existing functional navigations or mobile components.
- **Hero & Landing Gradients:** Swap the harsh primary colors inside `<button className="bg-primary...` and core section elements with the fluid gradients from the mock (`bg-gradient-to-br from-primary to-primary-container`), apply matching shadow depths (`shadow-[0_8px_32px_rgba...]`), and refine font tracking to achieve the airy "Frictionless CX" visual density without touching the actual wording.
- **Drawer Styling Strategy:** Ensure `ZenithDrawer` relies strictly on the isolated deep-dark aesthetic provided (`bg-[#2c3134] text-[#00D4FF] border-l border-white/10 shadow-[-10px_0_30px...]`) without tearing out the `<VoiceSessionClient>`.
- **Global Theme Cleanup:** Clean up lingering Shadcn dark mode collision layers in `globals.css` and enforce strict adoption of the `surface` tokens. Ensure "TTEC Digital" is verified softly in the footer.

No sections will be ripped out, and the React application structure will remain mathematically identical.
