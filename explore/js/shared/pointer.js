/* One input path for mouse, touch and pen (Pointer Events).
   Fixes touchscreen laptops, where the old code dropped mouse clicks entirely. */

export const coarse = window.matchMedia('(pointer: coarse)').matches;
export const verb = coarse ? 'Tap' : 'Click';

const TAP_SLOP = 10;

export function bindPointer(el, h) {
    let down = null;

    el.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (down) return; // ignore extra fingers
        down = { id: e.pointerId, x: e.clientX, y: e.clientY, type: e.pointerType, moved: false };
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        h.down && h.down(e, down);
    });

    el.addEventListener('pointermove', e => {
        if (down && e.pointerId === down.id) {
            if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_SLOP) down.moved = true;
            h.drag && h.drag(e, down);
        } else if (!down && e.pointerType === 'mouse') {
            h.hover && h.hover(e);
        }
    });

    el.addEventListener('pointerup', e => {
        if (!down || e.pointerId !== down.id) return;
        const d = down;
        down = null;
        h.up && h.up(e, d);
        if (!d.moved) h.tap && h.tap(e, d);
        if (e.pointerType === 'mouse') h.hover && h.hover(e);
    });

    el.addEventListener('pointercancel', e => {
        if (!down || e.pointerId !== down.id) return;
        down = null;
        h.cancel && h.cancel(e);
    });

    el.addEventListener('pointerleave', e => {
        if (!down && e.pointerType === 'mouse') h.leave && h.leave(e);
    });

    el.addEventListener('contextmenu', e => e.preventDefault());
}
