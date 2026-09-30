import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { createElement } from "react";

/**
 * Global test setup.
 *
 * Keeps every suite hermetic: no network, no browser APIs that jsdom lacks,
 * and a plain `<img>` in place of `next/image` (which otherwise expects the
 * Next.js runtime to resolve and optimise sources).
 */

// `next/image` renders through the Next runtime; stub it as a native <img>.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const {
      src,
      alt,
      // Next-only props that must not leak onto a DOM node.
      fill: _fill,
      priority: _priority,
      loader: _loader,
      placeholder: _placeholder,
      blurDataURL: _blurDataURL,
      sizes: _sizes,
      quality: _quality,
      unoptimized: _unoptimized,
      ...rest
    } = props;

    return createElement("img", {
      src: typeof src === "string" ? src : "",
      alt: typeof alt === "string" ? alt : "",
      ...rest,
    });
  },
}));

afterEach(() => {
  cleanup();
});

// ─── Browser API polyfills ───────────────────────────────────────────────────

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
}

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
}

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Radix primitives call these pointer-capture APIs during interaction.
if (typeof Element !== "undefined") {
  const proto = Element.prototype as Element & {
    scrollIntoView?: () => void;
    setPointerCapture?: (id: number) => void;
    releasePointerCapture?: (id: number) => void;
    hasPointerCapture?: (id: number) => boolean;
  };

  if (!proto.scrollIntoView) {
    proto.scrollIntoView = vi.fn();
  }
  if (!proto.setPointerCapture) {
    proto.setPointerCapture = vi.fn();
  }
  if (!proto.releasePointerCapture) {
    proto.releasePointerCapture = vi.fn();
  }
  if (!proto.hasPointerCapture) {
    proto.hasPointerCapture = () => false;
  }
}

// `crypto.randomUUID` backs toast ids; provide a deterministic fallback.
if (typeof globalThis.crypto === "undefined") {
  vi.stubGlobal("crypto", {} as Crypto);
}
if (typeof globalThis.crypto.randomUUID !== "function") {
  try {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: () => `test-${Math.random().toString(36).slice(2)}`,
    });
  } catch {
    // Read-only in some environments; toast ids are not asserted on directly.
  }
}
