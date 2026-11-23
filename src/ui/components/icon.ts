const ICON_PATHS: Record<string, string> = {
  search: 'M11 11l4 4m-2-8a6 6 0 11-12 0 6 6 0 0112 0',
  network: 'M5 4h4v4H5zM15 16h4v4h-4zM3 16h4v4H3zM7 8v3h10v5M5 8v3h10',
  flag: 'M5 21V4m0 0c5-3 7 3 14 0v9c-7 3-9-3-14 0',
  'clock-3': 'M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z',
  inbox: 'M4 4h16v12H4zM4 14h4l2 3h4l2-3h4',
  'file-text': 'M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6',
  'layout-dashboard': 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  target: 'M12 3v3m0 12v3M3 12h3m12 0h3M12 7a5 5 0 100 10 5 5 0 000-10z',
  'git-branch': 'M6 3a2 2 0 100 4 2 2 0 000-4zm12 14a2 2 0 100 4 2 2 0 000-4zM6 7v5a5 5 0 005 5h5',
  'notebook-pen': 'M4 4h12v16H4zM8 8h5M8 12h5M15 17l3-3 2 2-3 3-2 .5z',
  plus: 'M12 5v14M5 12h14',
};

export function renderIcon(parent: HTMLElement, name: string): HTMLElement {
  const wrapper = parent.ownerDocument.createElement('span'); wrapper.className = 'rw-icon'; wrapper.setAttribute('aria-hidden', 'true');
  const svg = parent.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('stroke-width', '1.8');
  const path = parent.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', ICON_PATHS[name] ?? ICON_PATHS.search); svg.appendChild(path); wrapper.appendChild(svg); parent.appendChild(wrapper); return wrapper;
}
