export interface ColumnPreferences {
  leftWidth: number; rightWidth: number;
  leftCollapsed: boolean; rightCollapsed: boolean; focusMode: boolean;
  preferredSide?: 'left' | 'right';
}
type Side = 'left' | 'right';
const limits = { left: { min: 150, max: 360, initial: 220 }, right: { min: 190, max: 480, initial: 300 } };
export function normalizeColumnPreferences(value?: unknown): ColumnPreferences {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const width = (side: Side) => {
    const value = input[side + 'Width'];
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(limits[side].min, Math.min(limits[side].max, value)) : limits[side].initial;
  };
  return { leftWidth: width('left'), rightWidth: width('right'), leftCollapsed: input.leftCollapsed === true, rightCollapsed: input.rightCollapsed === true, focusMode: input.focusMode === true,
    ...(input.preferredSide === 'left' || input.preferredSide === 'right' ? { preferredSide: input.preferredSide } : {}) };
}
export function fitColumns(width: number, preferences: ColumnPreferences, hasRight: boolean): { left: number; right: number; narrow: boolean } {
  if (width < 840) return { left: 0, right: 0, narrow: true };
  let left = preferences.leftCollapsed || preferences.focusMode ? 0 : preferences.leftWidth;
  let right = !hasRight || preferences.rightCollapsed || preferences.focusMode ? 0 : preferences.rightWidth;
  const budget = width - 360 - (left ? 8 : 0) - (right ? 8 : 0);
  if (left + right > budget) {
    const leftMin = left ? limits.left.min : 0, rightMin = right ? limits.right.min : 0;
    if (preferences.preferredSide === 'left' && left) { left = Math.min(left, budget - rightMin); right = Math.min(right, budget - left); }
    else if (preferences.preferredSide === 'right' && right) { right = Math.min(right, budget - leftMin); left = Math.min(left, budget - right); }
    else {
      const scale = Math.max(0, (budget - leftMin - rightMin) / Math.max(1, left + right - leftMin - rightMin));
      left = leftMin + (left ? left - leftMin : 0) * scale;
      right = rightMin + (right ? right - rightMin : 0) * scale;
    }
  }
  return { left, right, narrow: false };
}

export interface ColumnLayoutController { update(value: ColumnPreferences): void; dispose(): void; }
export function attachColumnLayout(root: HTMLElement, initial: ColumnPreferences, commit: (value: ColumnPreferences) => void): ColumnLayoutController {
  const win = root.ownerDocument.defaultView!;
  const sidebar = root.querySelector<HTMLElement>('.rw-sidebar')!;
  const main = root.querySelector<HTMLElement>('.rw-main-column')!;
  const rail = root.querySelector<HTMLElement>('.rw-right-rail');
  const layout = root.querySelector<HTMLElement>('.rw-layout')!;
  const panels = { left: sidebar, right: rail };
  const toggles = { left: root.querySelector<HTMLButtonElement>('[data-column-toggle="left"]'), right: root.querySelector<HTMLButtonElement>('[data-column-toggle="right"]') };
  const focusButton = root.querySelector<HTMLButtonElement>('[data-column-toggle="focus"]');
  const backdrop = root.ownerDocument.createElement('div'); backdrop.className = 'rw-column-backdrop'; backdrop.hidden = true; layout.append(backdrop);
  let preferences = normalizeColumnPreferences(initial), disposed = false, drawer: Side | null = null;
  let frame: number | undefined;
  let drag: { side: Side; pointer: number; startX: number; lastX: number; startWidth: number; base: ColumnPreferences; target: HTMLElement; changed: boolean } | undefined;
  const off: Array<() => void> = [];
  const listen = (el: EventTarget, type: string, callback: (event: any) => void) => { el.addEventListener(type, callback); off.push(() => el.removeEventListener(type, callback)); };
  const measured = () => root.getBoundingClientRect().width;
  const fitted = () => fitColumns(measured(), preferences, !!rail);
  function closeDrawer(restore = true) {
    const previous = drawer; drawer = null; apply();
    if (restore && previous) toggles[previous]?.focus({ preventScroll: true });
  }
  function apply() {
    if (disposed) return;
    const geometry = fitted();
    if (!geometry.narrow) drawer = null;
    root.classList.toggle('rw-columns-narrow', geometry.narrow);
    root.classList.toggle('rw-has-right-column', !!rail);
    root.classList.toggle('rw-drawer-open', geometry.narrow && drawer !== null);
    root.style.setProperty('--rw-left-width', geometry.left + 'px');
    root.style.setProperty('--rw-right-width', geometry.right + 'px');
    root.style.setProperty('--rw-left-grip', geometry.left ? '8px' : '0px');
    root.style.setProperty('--rw-right-grip', geometry.right ? '8px' : '0px');
    root.style.setProperty('--rw-drawer-height', Math.max(120, win.innerHeight - Math.max(0, layout.getBoundingClientRect().top) - 12) + 'px');
    for (const side of ['left', 'right'] as const) {
      const panel = panels[side], visible = geometry.narrow ? drawer === side : geometry[side] > 0;
      if (panel) {
        panel.hidden = !visible;
        if (geometry.narrow && visible) { panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', side === 'left' ? '项目导航' : '项目概览'); }
        else { panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); }
      }
      const toggle = toggles[side];
      if (toggle) { toggle.hidden = !panel; toggle.textContent = (visible ? '收起' : '显示') + (side === 'left' ? '导航' : '概览'); toggle.setAttribute('aria-expanded', String(visible)); }
      const handle = root.querySelector<HTMLElement>('[data-column-resize="' + side + '"]');
      if (handle) {
        handle.hidden = geometry.narrow || !geometry[side];
        handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', 'vertical');
        handle.setAttribute('aria-label', side === 'left' ? '调整导航栏宽度' : '调整概览栏宽度');
        const other = side === 'left' ? 'right' : 'left';
        const maximum = Math.min(limits[side].max, measured() - 360 - (geometry.left ? 8 : 0) - (geometry.right ? 8 : 0) - (geometry[other] ? limits[other].min : 0));
        handle.setAttribute('aria-valuemin', String(limits[side].min)); handle.setAttribute('aria-valuemax', String(Math.max(limits[side].min, Math.floor(maximum))));
        handle.setAttribute('aria-valuenow', String(Math.round(geometry[side])));
      }
    }
    backdrop.hidden = !geometry.narrow || !drawer;
    main.inert = !backdrop.hidden;
    focusButton?.setAttribute('aria-pressed', String(preferences.focusMode));
  }
  const save = () => { if (!disposed) commit({ ...preferences }); };
  function toggle(side: Side) {
    if (!panels[side]) return;
    if (fitted().narrow) {
      if (drawer === side) closeDrawer();
      else { drawer = side; apply(); panels[side]?.querySelector<HTMLElement>('button,a,input,select,textarea')?.focus({ preventScroll: true }); }
    } else {
      if (preferences.focusMode) preferences = { ...preferences, focusMode: false, leftCollapsed: side !== 'left', rightCollapsed: side !== 'right' };
      else preferences = { ...preferences, [side + 'Collapsed']: !preferences[(side + 'Collapsed') as 'leftCollapsed' | 'rightCollapsed'] };
      apply(); save();
    }
  }
  function resizeBase(): ColumnPreferences {
    return { ...preferences };
  }
  function setWidth(side: Side, value: number, base: ColumnPreferences) {
    const geometry = fitColumns(measured(), base, !!rail), other = side === 'left' ? 'right' : 'left';
    const maximum = Math.min(limits[side].max, measured() - 360 - (geometry.left ? 8 : 0) - (geometry.right ? 8 : 0) - (geometry[other] ? limits[other].min : 0));
    preferences = { ...base, [side + 'Width']: Math.max(limits[side].min, Math.min(maximum, value)), preferredSide: side };
    apply();
  }
  function flushDrag() {
    if (frame !== undefined) { win.cancelAnimationFrame(frame); frame = undefined; }
    if (!drag || disposed) return;
    if (drag.lastX === drag.startX) { preferences = { ...drag.base }; apply(); drag.changed = false; return; }
    setWidth(drag.side, drag.startWidth + (drag.lastX - drag.startX) * (drag.side === 'left' ? 1 : -1), drag.base);
    drag.changed = JSON.stringify(preferences) !== JSON.stringify(drag.base);
  }
  function endDrag(persist: boolean) {
    if (!drag) return;
    if (persist) flushDrag();
    else if (frame !== undefined) { win.cancelAnimationFrame(frame); frame = undefined; }
    const ended = drag; drag = undefined;
    if (ended.target.hasPointerCapture?.(ended.pointer)) ended.target.releasePointerCapture(ended.pointer);
    root.classList.remove('rw-resizing-columns');
    if (persist && ended.changed) save();
  }
  toggles.left && listen(toggles.left, 'click', () => toggle('left'));
  toggles.right && listen(toggles.right, 'click', () => toggle('right'));
  focusButton && listen(focusButton, 'click', () => { preferences = { ...preferences, focusMode: !preferences.focusMode }; drawer = null; apply(); save(); });
  root.querySelectorAll<HTMLElement>('[data-column-close]').forEach(button => listen(button, 'click', () => toggle(button.dataset.columnClose as Side)));
  for (const side of ['left', 'right'] as const) {
    const handle = root.querySelector<HTMLElement>('[data-column-resize="' + side + '"]');
    if (!handle) continue;
    listen(handle, 'pointerdown', (event: PointerEvent) => {
      if (event.button !== 0 || fitted().narrow || disposed) return;
      endDrag(false); drag = { side, pointer: event.pointerId, startX: event.clientX, lastX: event.clientX, startWidth: fitted()[side], base: resizeBase(), target: handle, changed: false };
      handle.setPointerCapture?.(event.pointerId); root.classList.add('rw-resizing-columns'); event.preventDefault();
    });
    listen(handle, 'pointermove', (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointer) return;
      drag.lastX = event.clientX;
      if (frame === undefined) frame = win.requestAnimationFrame(() => { frame = undefined; flushDrag(); });
    });
    listen(handle, 'pointerup', () => endDrag(true));
    listen(handle, 'pointercancel', () => endDrag(true));
    listen(handle, 'lostpointercapture', () => endDrag(true));
    listen(handle, 'dblclick', () => { setWidth(side, limits[side].initial, resizeBase()); save(); });
    listen(handle, 'keydown', (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
      event.preventDefault(); const base = resizeBase();
      setWidth(side, event.key === 'Home' ? limits[side].initial : fitted()[side] + (event.key === 'ArrowRight' ? 16 : -16) * (side === 'left' ? 1 : -1), base); save();
    });
  }
  listen(root, 'pointerdown', (event: PointerEvent) => {
    if (drawer && event.target instanceof win.Node && !panels[drawer]?.contains(event.target) && !toggles[drawer]?.contains(event.target)) closeDrawer();
  });
  listen(root, 'keydown', (event: KeyboardEvent) => {
    if (!drawer) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeDrawer(); }
    else if (event.key === 'Tab') {
      const controls = Array.from(panels[drawer]!.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select,textarea'));
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1], active = root.ownerDocument.activeElement;
      if (event.shiftKey && (active === first || !panels[drawer]!.contains(active))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || !panels[drawer]!.contains(active))) { event.preventDefault(); first.focus(); }
    }
  });
  let previousWidth = measured();
  const observer = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(() => {
    const width = measured();
    if (width !== previousWidth) { previousWidth = width; endDrag(false); }
    apply();
  }) : undefined;
  listen(win, 'resize', () => { endDrag(false); apply(); });
  observer?.observe(root); apply();
  return {
    update(value) { endDrag(false); preferences = normalizeColumnPreferences(value); apply(); },
    dispose() { endDrag(false); disposed = true; off.splice(0).forEach(dispose => dispose()); observer?.disconnect(); main.inert = false; backdrop.remove(); },
  };
}
