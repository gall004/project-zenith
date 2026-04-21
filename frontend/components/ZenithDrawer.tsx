"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { VoiceSessionClient } from "./VoiceSessionClient";

interface ZenithDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionStateChange?: (isActive: boolean) => void;
}

export function ZenithDrawer({ open, onOpenChange, onSessionStateChange }: ZenithDrawerProps): React.JSX.Element {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false} disablePointerDismissal={true}>
      <SheetContent
        hasOverlay={false}
        keepMounted={true}
        className="!w-full !max-w-full lg:!max-w-md border-l border-white/10 shadow-2xl p-0 flex flex-col bg-[#2c3134] text-white"
      >
        {/* Header from Google Stitch styling */}
        <SheetHeader className="p-6 pb-2 text-left shrink-0">
          <SheetTitle className="sr-only">Zenith Support Agent</SheetTitle>
          <div className="flex items-center space-x-4 mb-2">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden flex-shrink-0 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzgUdavKeju415VcsW9QLzNVWs7ACDrxXkmdS86pWHWA7r-FfitJ83dzmzHz5QSt9nYQjg20LpbNPGG-D3Flxh9CBterzvyHzbsQwQidUEWGcOo41QnuYg-QBDG5CfDgS7AcQ-YIBHDDVmhYXKNqXaj4jefFMv04J9w5Cf5MEagAXKVHmxuy0Ey72EEXb24_M1ud4yuJoDLyeRyjupnhyB4wYk-QqVMhUBjIFvi0Y7cB0GrN85qEaGBdKf1lTBAsIhS3-lokXwtCJk"
                alt="Zenith Support Agent portrait"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-white font-headline text-base leading-tight">Zenith Support Agent</h3>
              <p className="text-slate-400 text-xs font-label">TTEC Digital</p>
            </div>
          </div>
        </SheetHeader>

        {/* Payload Space for dual-channel interface */}
        <div className="flex-1 flex flex-col h-full overflow-hidden p-6 pt-2">
          {/* Unconditional mount with keepMounted Sheet ensures we do not disconnect on close */}
          <VoiceSessionClient onSessionStateChange={onSessionStateChange} isOpen={open} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
