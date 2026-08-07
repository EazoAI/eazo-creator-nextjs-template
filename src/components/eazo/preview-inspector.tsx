"use client";

import { useEffect } from "react";

/**
 * Eazo Creator point-select bridge (native, built into the template).
 *
 * The Creator UI and the running preview live on different origins, so the
 * parent cannot inspect the iframe DOM directly. This component installs a
 * tiny, inert-until-armed runtime that exposes element selections through
 * `postMessage`. It is protocol-compatible with the platform's runtime-injected
 * bridge (`eazo-preview-inspect-*` messages, `data-eazo-preview-*` markers), so
 * the Creator frontend consumer needs no changes and the platform can skip its
 * runtime injection when this native bridge is present.
 *
 * Only mounted when NEXT_PUBLIC_EAZO_INSPECTOR === "1" (preview environments).
 * Self-disables when not running inside an iframe (`window.parent === window`).
 */
export function PreviewInspector() {
  useEffect(() => {
    const win = window as Window & { __EAZO_PREVIEW_INSPECTOR__?: boolean };
    if (win.__EAZO_PREVIEW_INSPECTOR__) return;
    win.__EAZO_PREVIEW_INSPECTOR__ = true;
    if (window.parent === window) return;

    let armed = false;
    let hovered: HTMLElement | null = null;
    let selected: HTMLElement | null = null;
    let previousHover: string | null = null;
    let previousSelected: string | null = null;

    const style = document.createElement("style");
    style.setAttribute("data-eazo-preview-inspector", "true");
    style.textContent = [
      '[data-eazo-preview-canvas-hovered="true"] { outline: 2px solid #f59e0b !important; outline-offset: 2px !important; cursor: crosshair !important; }',
      '[data-eazo-preview-canvas-selected="true"] { outline: 3px solid #7C3AED !important; outline-offset: 2px !important; }',
    ].join("\n");
    document.head.appendChild(style);

    const escapeAttribute = (value: string) =>
      String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const pagePath = () =>
      `${window.location.pathname || "/"}${window.location.search}${window.location.hash}` ||
      "/";
    const postReady = () => {
      const path = pagePath();
      window.parent.postMessage(
        {
          type: "eazo-preview-inspect-ready",
          version: 1,
          pagePath: path,
          pathname: path,
        },
        "*",
      );
    };
    const labelFor = (element: HTMLElement) => {
      const explicit = [
        element.getAttribute("aria-label"),
        element.getAttribute("data-label"),
        element.getAttribute("alt"),
        element.getAttribute("title"),
        element.getAttribute("placeholder"),
      ].find((value) => value && value.trim());
      if (explicit) return explicit.trim().slice(0, 160);
      const text = (element.textContent || "").replace(/\s+/g, " ").trim();
      if (text) return text.slice(0, 160);
      return (
        element.getAttribute("data-eazo-component") ||
        element.tagName.toLowerCase()
      );
    };
    const pathFor = (element: HTMLElement): string => {
      const dataEl = (element.getAttribute("data-el") || "").trim();
      if (dataEl) return `[data-el="${escapeAttribute(dataEl)}"]`;
      const component = (
        element.getAttribute("data-eazo-component") || ""
      ).trim();
      if (component)
        return `[data-eazo-component="${escapeAttribute(component)}"]`;
      const testId = (element.getAttribute("data-testid") || "").trim();
      if (testId) return `[data-testid="${escapeAttribute(testId)}"]`;
      if (element.id) return `[id="${escapeAttribute(element.id)}"]`;

      const segments: string[] = [];
      let cursor: HTMLElement | null = element;
      while (
        cursor &&
        cursor.tagName.toLowerCase() !== "html" &&
        segments.length < 6
      ) {
        const current: HTMLElement = cursor;
        const tag = current.tagName.toLowerCase();
        const parent = current.parentElement;
        if (!parent) {
          segments.unshift(tag);
          break;
        }
        const siblings = Array.from(parent.children).filter(
          (child) => child.tagName === current.tagName,
        );
        const suffix =
          siblings.length > 1
            ? `:nth-of-type(${siblings.indexOf(current) + 1})`
            : "";
        segments.unshift(`${tag}${suffix}`);
        if (tag === "body") break;
        cursor = parent;
      }
      return segments.join(" > ") || element.tagName.toLowerCase();
    };
    const inspectableTarget = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof HTMLElement)) return null;
      if (target === document.documentElement || target === document.body)
        return null;
      return (
        (target.closest(
          "[data-el], [data-eazo-component], [data-component]",
        ) as HTMLElement | null) || target
      );
    };
    const clearHover = () => {
      if (!hovered) return;
      if (previousHover == null)
        hovered.removeAttribute("data-eazo-preview-canvas-hovered");
      else hovered.setAttribute("data-eazo-preview-canvas-hovered", previousHover);
      hovered = null;
      previousHover = null;
    };
    const highlight = (element: HTMLElement) => {
      if (hovered === element) return;
      clearHover();
      hovered = element;
      previousHover = element.getAttribute("data-eazo-preview-canvas-hovered");
      element.setAttribute("data-eazo-preview-canvas-hovered", "true");
    };
    const clearSelected = () => {
      if (!selected) return;
      if (previousSelected == null)
        selected.removeAttribute("data-eazo-preview-canvas-selected");
      else
        selected.setAttribute(
          "data-eazo-preview-canvas-selected",
          previousSelected,
        );
      selected = null;
      previousSelected = null;
    };
    const select = (element: HTMLElement) => {
      if (selected === element) return;
      clearSelected();
      selected = element;
      previousSelected = element.getAttribute(
        "data-eazo-preview-canvas-selected",
      );
      element.setAttribute("data-eazo-preview-canvas-selected", "true");
    };
    const syncArmed = () => {
      if (armed)
        document.documentElement.setAttribute(
          "data-eazo-preview-inspect",
          "true",
        );
      else document.documentElement.removeAttribute("data-eazo-preview-inspect");
      if (!armed) clearHover();
    };

    const onMessage = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        !event.data ||
        typeof event.data !== "object"
      )
        return;
      const type = String(event.data.type || "");
      if (type === "eazo-preview-inspect-probe") {
        postReady();
        return;
      }
      if (type === "eazo-preview-inspect-clear") {
        clearSelected();
        return;
      }
      if (
        type !== "eazo-preview-inspect-arm" &&
        type !== "eazo-design-inspect-arm"
      )
        return;
      armed = event.data.armed === true;
      syncArmed();
    };
    const onPointerOver = (event: PointerEvent) => {
      if (!armed) return;
      const target = inspectableTarget(event.target);
      if (target) highlight(target);
    };
    const onPointerOut = (event: PointerEvent) => {
      if (armed && event.target === hovered) clearHover();
    };
    const onClick = (event: MouseEvent) => {
      if (!armed) return;
      const target = inspectableTarget(event.target);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      highlight(target);
      select(target);
      const componentName = (
        target.getAttribute("data-eazo-component") ||
        target.getAttribute("data-component") ||
        ""
      ).trim();
      const label = componentName || labelFor(target);
      const path = pagePath();
      const tag = target.tagName.toLowerCase();
      const rect = target.getBoundingClientRect();
      window.parent.postMessage(
        {
          type: "eazo-preview-inspect-element",
          version: 1,
          pagePath: path,
          pathname: path,
          elementPath: pathFor(target),
          label,
          context: `Running app element · <${tag}> · "${label}" · page=${path}`,
          objectType: componentName ? "component" : "element",
          shared:
            target.getAttribute("data-eazo-shared") === "true" ||
            target.getAttribute("data-shared") === "true",
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
        },
        "*",
      );
    };

    window.addEventListener("message", onMessage);
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", postReady);
    window.addEventListener("hashchange", postReady);
    postReady();

    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", postReady);
      window.removeEventListener("hashchange", postReady);
      clearHover();
      clearSelected();
      style.remove();
      win.__EAZO_PREVIEW_INSPECTOR__ = false;
    };
  }, []);

  return null;
}
