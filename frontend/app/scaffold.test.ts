/**
 * Scaffold Validation Tests
 *
 * Maps to BDD user stories US-01 through US-06 in .artifacts/task.md.
 * Validates that the Next.js project structure, TypeScript config,
 * and dependency installations are governance-compliant.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("US-01: Next.js App Router Initialization", () => {
  it("should have a package.json with next as a dependency", () => {
    // Arrange
    const pkgPath = path.join(ROOT, "package.json");

    // Act
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    // Assert
    expect(pkg.dependencies).toHaveProperty("next");
  });

  it("should use App Router with an app/ directory", () => {
    // Arrange
    const appDir = path.join(ROOT, "app");

    // Act & Assert
    expect(fs.existsSync(appDir)).toBe(true);
    expect(fs.statSync(appDir).isDirectory()).toBe(true);
  });

  it("should have a root layout.tsx in app/", () => {
    // Arrange
    const layoutPath = path.join(ROOT, "app", "layout.tsx");

    // Act & Assert
    expect(fs.existsSync(layoutPath)).toBe(true);
  });

  it("should have a root page.tsx in app/", () => {
    // Arrange
    const pagePath = path.join(ROOT, "app", "page.tsx");

    // Act & Assert
    expect(fs.existsSync(pagePath)).toBe(true);
  });
});

describe("US-02: Tailwind CSS v4 Integration", () => {
  it("should use CSS-first @import 'tailwindcss' syntax", () => {
    // Arrange
    const cssPath = path.join(ROOT, "app", "globals.css");

    // Act
    const css = fs.readFileSync(cssPath, "utf-8");

    // Assert
    expect(css).toContain('@import "tailwindcss"');
  });

  it("should NOT have a legacy tailwind.config.js file", () => {
    // Arrange
    const legacyConfigJs = path.join(ROOT, "tailwind.config.js");
    const legacyConfigTs = path.join(ROOT, "tailwind.config.ts");

    // Act & Assert
    expect(fs.existsSync(legacyConfigJs)).toBe(false);
    expect(fs.existsSync(legacyConfigTs)).toBe(false);
  });

  it("should have tailwindcss as a devDependency", () => {
    // Arrange
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
    );

    // Act & Assert
    expect(pkg.devDependencies).toHaveProperty("tailwindcss");
  });
});

describe("US-03: Shadcn UI Installation", () => {
  it("should have a components.json configuration file", () => {
    // Arrange
    const componentsJsonPath = path.join(ROOT, "components.json");

    // Act & Assert
    expect(fs.existsSync(componentsJsonPath)).toBe(true);
  });

  it("should have cssVariables enabled in components.json", () => {
    // Arrange
    const config = JSON.parse(
      fs.readFileSync(path.join(ROOT, "components.json"), "utf-8")
    );

    // Act & Assert
    expect(config.tailwind.cssVariables).toBe(true);
  });

  it("should have a Button component installed", () => {
    // Arrange
    const buttonPath = path.join(ROOT, "components", "ui", "button.tsx");

    // Act & Assert
    expect(fs.existsSync(buttonPath)).toBe(true);
  });

  it("should have the lib/utils.ts utility file", () => {
    // Arrange
    const utilsPath = path.join(ROOT, "lib", "utils.ts");

    // Act & Assert
    expect(fs.existsSync(utilsPath)).toBe(true);
  });
});

describe("US-04: LiveKit Components React SDK Installation", () => {
  it("should have @livekit/components-react as an exact pinned dependency", () => {
    // Arrange
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
    );

    // Act
    const version = pkg.dependencies["@livekit/components-react"];

    // Assert
    expect(version).toBeDefined();
    expect(version).not.toMatch(/^\^/);
    expect(version).not.toMatch(/^~/);
  });

  it("should have livekit-client as an exact pinned dependency", () => {
    // Arrange
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
    );

    // Act
    const version = pkg.dependencies["livekit-client"];

    // Assert
    expect(version).toBeDefined();
    expect(version).not.toMatch(/^\^/);
    expect(version).not.toMatch(/^~/);
  });
});

describe("US-05: TypeScript Strict Mode Enforcement", () => {
  it('should have "strict": true in tsconfig.json', () => {
    // Arrange
    const tsconfig = JSON.parse(
      fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf-8")
    );

    // Act & Assert
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });
});

describe("US-06: Project Structure Compliance", () => {
  it("should have an app/ directory for route segments", () => {
    // Arrange & Act & Assert
    expect(fs.existsSync(path.join(ROOT, "app"))).toBe(true);
  });

  it("should have a components/ directory", () => {
    // Arrange & Act & Assert
    expect(fs.existsSync(path.join(ROOT, "components"))).toBe(true);
  });

  it("should have a hooks/ directory", () => {
    // Arrange & Act & Assert
    expect(fs.existsSync(path.join(ROOT, "hooks"))).toBe(true);
  });

  it("should have a lib/ directory", () => {
    // Arrange & Act & Assert
    expect(fs.existsSync(path.join(ROOT, "lib"))).toBe(true);
  });

  it("should have a types/ directory", () => {
    // Arrange & Act & Assert
    expect(fs.existsSync(path.join(ROOT, "types"))).toBe(true);
  });

  it("should NOT have barrel files (index.ts) in components/", () => {
    // Arrange
    const barrelPath = path.join(ROOT, "components", "index.ts");

    // Act & Assert
    expect(fs.existsSync(barrelPath)).toBe(false);
  });

  it("should NOT have barrel files (index.ts) in hooks/", () => {
    // Arrange
    const barrelPath = path.join(ROOT, "hooks", "index.ts");

    // Act & Assert
    expect(fs.existsSync(barrelPath)).toBe(false);
  });
});
