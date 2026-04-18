import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({
    style: { fontFamily: "Inter" },
    className: "className",
    variable: "--font-sans",
  }),
  Geist_Mono: () => ({
    style: { fontFamily: "Geist Mono" },
    className: "className",
    variable: "--font-geist-mono",
  }),
}));
