"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
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
        showCloseButton={false}
        className="!w-full !max-w-full lg:!max-w-md bg-surface text-on-surface shadow-2xl border-l border-outline-variant/50 flex flex-col p-0 sheet-mobile-height"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Custom Header with Portal Target for Dropdown */}
        <SheetHeader className="p-6 pb-2 text-left shrink-0 relative">
          {/* Custom Close Button */}
          <div className="absolute top-6 right-6 z-50">
            <SheetClose className="p-2 -mr-2 -mt-2 text-secondary hover:text-on-surface hover:bg-surface-container rounded-full transition-colors cursor-pointer outline-none">
              <span className="block sm:hidden">
                <span className="material-symbols-outlined text-[24px] leading-[0]">keyboard_arrow_down</span>
              </span>
              <span className="hidden sm:block">
                <span className="material-symbols-outlined text-[24px] leading-[0]">close</span>
              </span>
              <span className="sr-only">Minimize session</span>
            </SheetClose>
          </div>

          <div className="flex items-center space-x-4 mb-2">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzgUdavKeju415VcsW9QLzNVWs7ACDrxXkmdS86pWHWA7r-FfitJ83dzmzHz5QSt9nYQjg20LpbNPGG-D3Flxh9CBterzvyHzbsQwQidUEWGcOo41QnuYg-QBDG5CfDgS7AcQ-YIBHDDVmhYXKNqXaj4jefFMv04J9w5Cf5MEagAXKVHmxuy0Ey72EEXb24_M1ud4yuJoDLyeRyjupnhyB4wYk-QqVMhUBjIFvi0Y7cB0GrN85qEaGBdKf1lTBAsIhS3-lokXwtCJk"
                alt="Zenith Support Agent portrait"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-on-surface font-headline font-bold text-base leading-tight flex items-center">
                Zenith Support Agent
              </h3>
              <p className="text-secondary text-xs font-label">TTEC Digital</p>
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
