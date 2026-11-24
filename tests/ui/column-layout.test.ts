import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupDom } from '../helpers/dom';
import { attachColumnLayout, fitColumns, normalizeColumnPreferences } from '../../src/ui/column-layout';
afterEach(() => vi.unstubAllGlobals());

function surface() {
  const { root, browser } = setupDom();
  root.innerHTML = '<header><button data-column-toggle="left">Left</button><button data-column-toggle="focus">Focus</button><button data-column-toggle="right">Right</button></header><div class="rw-layout"><aside class="rw-sidebar"><button data-column-close="left">Close left</button></aside><button data-column-resize="left"></button><main class="rw-main-column"><input value="draft"></main><button data-column-resize="right"></button><aside class="rw-right-rail"><button data-column-close="right">Close right</button></aside></div>';
  let width = 1200;
  vi.spyOn(root, 'getBoundingClientRect').mockImplementation(() => ({ width, height: 800, left: 0, top: 0, right: width, bottom: 800, x: 0, y: 0, toJSON() {} }));
  return { root, browser, resize: (value: number) => { width = value; }, button: (key: string) => root.querySelector<HTMLButtonElement>('[data-column-toggle="'+key+'"]')! };
}
describe('adjustable workbench columns', () => {
  it('normalizes corrupt settings and constrains effective widths without changing requested widths', () => {
    expect(normalizeColumnPreferences({ leftWidth: Infinity, rightWidth: -5, leftCollapsed: 'true' })).toEqual({ leftWidth: 220, rightWidth: 190, leftCollapsed: false, rightCollapsed: false, focusMode: false });
    const prefs=normalizeColumnPreferences({ leftWidth: 360, rightWidth: 480 });
    const fitted=fitColumns(840,prefs,true);
    expect(fitted.left+fitted.right).toBeCloseTo(464);
    expect(fitted.left).toBeGreaterThanOrEqual(150);expect(fitted.right).toBeGreaterThanOrEqual(190);
    expect(prefs.leftWidth).toBe(360);expect(prefs.rightWidth).toBe(480);
    expect(fitColumns(839,prefs,true)).toEqual({ left:0,right:0,narrow:true });
    expect(fitColumns(1200,normalizeColumnPreferences(),false)).toEqual({ left:220,right:0,narrow:false });
  });
  it('collapses columns independently and restores their visibility after focus mode', () => {
    const {root,button}=surface();const save=vi.fn();
    const controller=attachColumnLayout(root,normalizeColumnPreferences(),save);
    const input=root.querySelector('input');button('left').click();
    expect(root.querySelector<HTMLElement>('.rw-sidebar')!.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('.rw-right-rail')!.hidden).toBe(false);
    button('focus').click();expect(root.querySelector<HTMLElement>('.rw-right-rail')!.hidden).toBe(true);
    button('focus').click();expect(root.querySelector<HTMLElement>('.rw-sidebar')!.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('.rw-right-rail')!.hidden).toBe(false);
    expect(root.querySelector('input')).toBe(input);expect(save).toHaveBeenCalledTimes(3);controller.dispose();
  });
  it('supports keyboard resizing and resets a separator without changing its sibling', () => {
    const {root,browser}=surface();const save=vi.fn();
    const controller=attachColumnLayout(root,normalizeColumnPreferences(),save);
    const handle=root.querySelector<HTMLElement>('[data-column-resize="left"]')!;
    handle.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}) as unknown as Event);
    expect(save.mock.lastCall?.[0]).toMatchObject({leftWidth:236,rightWidth:300});
    handle.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'Home',bubbles:true}) as unknown as Event);
    expect(save.mock.lastCall?.[0].leftWidth).toBe(220);controller.dispose();
  });
  it('persists one completed drag and cancels pending events when disposed', () => {
    const {root,browser}=surface();const save=vi.fn();const controller=attachColumnLayout(root,normalizeColumnPreferences(),save);
    const handle=root.querySelector<HTMLElement>('[data-column-resize="left"]')!;
    const pointer=(type:string,x:number)=>handle.dispatchEvent(new browser.PointerEvent(type,{clientX:x,button:0,pointerId:1,bubbles:true}) as unknown as Event);
    pointer('pointerdown',100);pointer('pointermove',180);expect(save).not.toHaveBeenCalled();pointer('pointerup',180);
    expect(save).toHaveBeenCalledTimes(1);expect(save.mock.lastCall?.[0].leftWidth).toBe(300);
    pointer('pointerdown',100);pointer('pointermove',120);controller.dispose();pointer('pointerup',120);
    expect(save).toHaveBeenCalledTimes(1);
  });
  it('uses one narrow drawer, closes with Escape or an outside tap, and restores focus', () => {
    const {root,browser,resize,button}=surface();resize(390);const save=vi.fn();
    const controller=attachColumnLayout(root,normalizeColumnPreferences(),save);
    expect(root.querySelector<HTMLElement>('.rw-sidebar')!.hidden).toBe(true);
    button('left').click();expect(root.querySelector<HTMLElement>('.rw-sidebar')!.hidden).toBe(false);
    button('right').click();expect(root.querySelector<HTMLElement>('.rw-sidebar')!.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('.rw-right-rail')!.hidden).toBe(false);
    root.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'Escape',bubbles:true}) as unknown as Event);
    expect(root.querySelector<HTMLElement>('.rw-right-rail')!.hidden).toBe(true);expect(document.activeElement).toBe(button('right'));
    button('left').click();root.querySelector('.rw-main-column')!.dispatchEvent(new browser.PointerEvent('pointerdown',{bubbles:true}) as unknown as Event);
    expect(root.querySelector<HTMLElement>('.rw-sidebar')!.hidden).toBe(true);expect(save).not.toHaveBeenCalled();
    resize(1200);controller.update(normalizeColumnPreferences());
    expect(root.style.getPropertyValue('--rw-left-width')).toBe('220px');controller.dispose();
  });
});
