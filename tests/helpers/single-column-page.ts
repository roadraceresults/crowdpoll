import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const publicDir = path.resolve("src/public");
const PHONE_QUERY = "(max-width: 639.98px)";
const TABLET_QUERY = "(max-width: 900px)";
const isPhoneQuery = (query: string) => query === PHONE_QUERY || query === TABLET_QUERY;

export interface StubbedUser {
  userName: string;
  profileAvatar?: string;
  isAdmin?: boolean;
  permissions?: string[];
}

export interface TabBarLayout {
  tabWidth: number;
  barWidth: number;
}

export interface StubbedHomeOptions {
  scripts: string[];
  user?: StubbedUser | null;
  signinMethod?: string;
  phone?: boolean;
  reducedMotion?: boolean;
  tabBarLayout?: TabBarLayout;
  /** Makes every animation frame carry a time stamp older than the moment it was asked for, as a browser can. */
  staleFrameStamps?: boolean;
  beforeScripts?: (window: JSDOM["window"]) => void;
}

export interface StubbedHome {
  window: JSDOM["window"];
  document: Document;
  setPhone(isPhone: boolean): void;
  setUser(user: StubbedUser | null): void;
  tabBarScroll(): number;
  setTabBarScroll(value: number): void;
  settle(ms?: number): Promise<void>;
  close(): void;
}

function stubTabBarLayout(window: JSDOM["window"], layout: TabBarLayout, state: { scroll: number }) {
  const bar = window.document.getElementById("tabBar") as HTMLElement;
  const tabs = Array.from(bar.querySelectorAll<HTMLElement>(".tab"));
  const scrollWidth = tabs.length * layout.tabWidth;
  const maxScroll = () => Math.max(0, scrollWidth - layout.barWidth);
  Object.defineProperty(bar, "scrollLeft", {
    configurable: true,
    get: () => state.scroll,
    set: (value: number) => {
      state.scroll = Math.max(0, Math.min(value, maxScroll()));
      bar.dispatchEvent(new window.Event("scroll"));
    }
  });
  Object.defineProperty(bar, "clientWidth", { configurable: true, get: () => layout.barWidth });
  Object.defineProperty(bar, "scrollWidth", { configurable: true, get: () => scrollWidth });
  bar.getBoundingClientRect = () => ({ left: 0, right: layout.barWidth, top: 0, bottom: 56, width: layout.barWidth, height: 56 }) as DOMRect;
  tabs.forEach((tab, index) => {
    tab.getBoundingClientRect = () =>
      ({
        left: index * layout.tabWidth - state.scroll,
        right: (index + 1) * layout.tabWidth - state.scroll,
        top: 0,
        bottom: 56,
        width: layout.tabWidth,
        height: 56
      }) as DOMRect;
  });
}

/**
 * The home page's own markup in jsdom with no server: /api/me and /api/config are answered
 * from the options, the phone breakpoint and the tab bar's measurements are stubbed, and only
 * the named scripts run.
 */
export async function openStubbedHome(options: StubbedHomeOptions): Promise<StubbedHome> {
  const html = readFileSync(path.join(publicDir, "index.html"), "utf8").replace(/<script[^>]*><\/script>/g, "");
  const dom = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const { window } = dom;
  const state = { phone: options.phone ?? true, user: options.user ?? null, scroll: 0 };
  const phoneListeners: Array<() => void> = [];

  window.matchMedia = ((query: string) => ({
    get matches() {
      return isPhoneQuery(query) ? state.phone : options.reducedMotion === true && query.includes("prefers-reduced-motion");
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => {
      if (isPhoneQuery(query)) phoneListeners.push(listener);
    },
    removeEventListener: () => {}
  })) as unknown as typeof window.matchMedia;

  window.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === "/api/me") {
      return state.user
        ? { ok: true, status: 200, json: async () => state.user }
        : { ok: false, status: 401, json: async () => ({}) };
    }
    if (url === "/api/config") return { ok: true, status: 200, json: async () => ({ signinMethod: options.signinMethod ?? "native" }) };
    return { ok: false, status: 404, json: async () => ({}) };
  }) as unknown as typeof fetch;

  if (options.staleFrameStamps) {
    const frame = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = ((callback: FrameRequestCallback) =>
      frame(() => callback(window.performance.now() - 60))) as typeof window.requestAnimationFrame;
  }
  if (options.tabBarLayout) stubTabBarLayout(window, options.tabBarLayout, state);
  options.beforeScripts?.(window);

  for (const name of options.scripts) window.eval(readFileSync(path.join(publicDir, name), "utf8"));
  window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));

  const settle = async (ms = 0) => {
    await new Promise((resolve) => setTimeout(resolve, 30 + ms));
    await new Promise((resolve) => setImmediate(resolve));
  };
  await settle();

  return {
    window,
    document: window.document,
    setPhone(isPhone) {
      state.phone = isPhone;
      phoneListeners.forEach((listener) => listener());
    },
    setUser(user) {
      state.user = user;
    },
    tabBarScroll: () => state.scroll,
    setTabBarScroll(value) {
      (window.document.getElementById("tabBar") as HTMLElement).scrollLeft = value;
    },
    settle,
    close: () => window.close()
  };
}

export function pointerEvent(window: JSDOM["window"], type: string, init: { clientX?: number; clientY?: number; pointerType?: string } = {}): MouseEvent {
  const event = new window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: init.clientX ?? 0, clientY: init.clientY ?? 0 });
  Object.defineProperty(event, "pointerType", { value: init.pointerType ?? "mouse" });
  return event;
}

export interface HeaderWidths {
  logo: number;
  wordmark: number;
  searchMin: number;
  link: number;
  name: number;
  avatar: number;
  button: number;
  gap: number;
}

export const HEADER_WIDTHS: HeaderWidths = { logo: 40, wordmark: 247, searchMin: 200, link: 150, name: 100, avatar: 32, button: 150, gap: 16 };

export interface HeaderModel {
  setClientWidth(width: number): void;
  naturalWidth(): number;
}

export function modelHeaderWidth(window: JSDOM["window"], clientWidth: number, widths: Partial<HeaderWidths> = {}): HeaderModel {
  const size = { ...HEADER_WIDTHS, ...widths };
  const state = { clientWidth };
  const header = window.document.getElementById("site-header") as HTMLElement;
  const tokens = () => (window.document.documentElement.getAttribute("data-header-fit") ?? "").split(" ").filter(Boolean);

  function naturalWidth(): number {
    const hidden = tokens();
    const inHeader = (selector: string) => header.querySelector(selector) !== null;
    const parts: number[] = [];
    if (inHeader(".brand-logo")) parts.push(size.logo);
    if (inHeader(".brand-wordmark")) parts.push(size.wordmark);
    if (inHeader(".header-search") && !hidden.includes("no-search")) parts.push(size.searchMin);
    const link = header.querySelector(".header-nav-link");
    if (link) parts.push(size.link);
    if (inHeader("#header-username") && !hidden.includes("no-name")) parts.push(size.name);
    if (inHeader(".avatar-btn")) parts.push(size.avatar);
    header.querySelectorAll("#header-actions .btn-header-ghost, #header-actions .btn-header-primary").forEach(() => parts.push(size.button));
    return parts.reduce((sum, part) => sum + part, 0) + Math.max(0, parts.length - 1) * size.gap;
  }

  Object.defineProperty(header, "clientWidth", { configurable: true, get: () => state.clientWidth });
  Object.defineProperty(header, "scrollWidth", { configurable: true, get: () => Math.max(state.clientWidth, naturalWidth()) });
  return {
    setClientWidth(width) {
      state.clientWidth = width;
    },
    naturalWidth
  };
}
