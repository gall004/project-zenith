import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
Object.defineProperty(window.navigator, "mediaDevices", {
  value: {
    getUserMedia: vi.fn(),
    enumerateDevices: vi.fn(),
  },
  writable: true,
});

vi.mock("next/font/google", () => ({
  Inter: () => ({
    style: { fontFamily: "Inter" },
    className: "className",
    variable: "--font-sans",
  }),
  Manrope: () => ({
    style: { fontFamily: "Manrope" },
    className: "className",
    variable: "--font-manrope",
  }),
  Space_Grotesk: () => ({
    style: { fontFamily: "Space Grotesk" },
    className: "className",
    variable: "--font-space-grotesk",
  }),
  Geist_Mono: () => ({
    style: { fontFamily: "Geist Mono" },
    className: "className",
    variable: "--font-geist-mono",
  }),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

window.HTMLElement.prototype.scrollIntoView = vi.fn();
