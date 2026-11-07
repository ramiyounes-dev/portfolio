/* Tiny tween helper. Promises resolve when the animation ends; reduced motion = instant. */

export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const ease = {
    linear: t => t,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inQuad: t => t * t,
    outBack: t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outBounce: t => {
        const n1 = 7.5625, d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
};

let running = 0;

/** True while any tween is playing: input waits for the board to settle. */
export function isAnimating() { return running > 0; }

export function tween(duration, onUpdate, easing = ease.outCubic) {
    if (reduceMotion || duration <= 0) {
        onUpdate(1);
        return Promise.resolve();
    }
    running++;
    return new Promise(resolve => {
        const start = performance.now();
        function frame(now) {
            const t = Math.min(1, (now - start) / duration);
            onUpdate(easing(t));
            if (t < 1) requestAnimationFrame(frame);
            else { running--; resolve(); }
        }
        requestAnimationFrame(frame);
    });
}

export const wait = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));

/** Resolves once no tween is running. */
export function settled() {
    return new Promise(resolve => {
        (function check() { if (running === 0) resolve(); else requestAnimationFrame(check); })();
    });
}
