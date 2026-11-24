import { Window } from 'happy-dom';
import { vi } from 'vitest';
export function setupDom(width = 1200) {
  const browser = new Window({ width, height: 900, url: 'http://localhost' });
  const prototype = browser.HTMLElement.prototype as unknown as Record<string, unknown>;
  prototype.createEl = function(this: HTMLElement, tag: string, options: Record<string, unknown> = {}) {
    const element = this.ownerDocument.createElement(tag);
    if (options.cls) element.className = Array.isArray(options.cls) ? options.cls.join(' ') : String(options.cls);
    if (options.text !== undefined) element.textContent = String(options.text);
    for (const key of ['type', 'value', 'placeholder']) if (options[key] !== undefined) (element as unknown as Record<string, unknown>)[key] = options[key];
    for (const [key, value] of Object.entries((options.attr ?? {}) as Record<string, string>)) element.setAttribute(key, value);
    this.appendChild(element);
    return element;
  };
  prototype.createDiv = function(this: HTMLElement, options: unknown = {}) { return this.createEl('div', options as {}); };
  prototype.createSpan = function(this: HTMLElement, options: unknown = {}) { return this.createEl('span', options as {}); };
  prototype.empty = function(this: HTMLElement) { this.replaceChildren(); };
  prototype.setText = function(this: HTMLElement, text: string) { this.textContent = text; };
  prototype.addClass = function(this: HTMLElement, ...names: string[]) { this.classList.add(...names.flatMap((name) => name.split(' '))); };
  prototype.removeClass = function(this: HTMLElement, ...names: string[]) { this.classList.remove(...names); };
  prototype.appendText = function(this: HTMLElement, text: string) { this.append(this.ownerDocument.createTextNode(text)); };
  vi.stubGlobal('window', browser);
  vi.stubGlobal('document', browser.document);
  vi.stubGlobal('HTMLElement', browser.HTMLElement);
  vi.stubGlobal('HTMLInputElement', browser.HTMLInputElement);
  return { browser, document: browser.document as unknown as Document, root: browser.document.body as unknown as HTMLElement };
}
export const flushUi = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); };
