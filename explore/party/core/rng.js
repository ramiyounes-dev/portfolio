/* Seedable RNG + helpers. Pure: used by the server, the client and the tests. */

/** mulberry32: small, fast, good enough for games. */
export function makeRng(seed = Math.floor(Math.random() * 2 ** 32)) {
    let a = seed >>> 0;
    const next = () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.int = n => Math.floor(next() * n);                 // 0 .. n-1
    next.pick = arr => arr[Math.floor(next() * arr.length)];
    next.shuffle = arr => {                                  // in place, returns arr
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(next() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };
    return next;
}
