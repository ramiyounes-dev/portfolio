import logic from '../logic/dots.js';
import howto from '../howto/dots.js';
import ai from '../ai/dots.js';
import { hue } from '../client/app.js';

const U = 100, P = 26;   // cell size and padding in SVG units

export default {
    logic,
    ai,
    title: { en: 'Dots and Boxes', fr: 'La pipopipette' },
    icon: 'dots',
    strings: {
        en: {
            'set.size': 'Grid', 'set.lateBonus': 'Late joiner bonus', 'set.timer': 'Turn timer',
            'opt.size.auto': 'Auto', 'opt.size.3': '3×3', 'opt.size.4': '4×4', 'opt.size.5': '5×5', 'opt.size.6': '6×6', 'opt.size.7': '7×7',
            hint: 'Tap between two dots to draw a line. Close a box to play again.', again: 'Box closed, play again',
        },
        fr: {
            'set.size': 'Grille', 'set.lateBonus': 'Bonus d\'arrivée en cours', 'set.timer': 'Temps par tour',
            'opt.size.auto': 'Auto', 'opt.size.3': '3×3', 'opt.size.4': '4×4', 'opt.size.5': '5×5', 'opt.size.6': '6×6', 'opt.size.7': '7×7',
            hint: 'Touche entre deux points pour tracer un trait. Ferme une case pour rejouer.', again: 'Case fermée, rejoue',
        },
    },
    howto,

    render(root, v, api) {
        const { t, me, nameOf, esc, send } = api;
        const mine = v.turn === me;
        const W = v.C * U + P * 2, H = v.R * U + P * 2;
        const col = id => `hsl(${hue(id)} 62% 55%)`;
        let boxes = '', lines = '', hits = '', dotsSvg = '';
        // The board is redrawn on every update: only boxes closed since the last one pop in
        const prev = root._dbBoxes;
        root._dbBoxes = [...v.boxes];
        for (let r = 0; r < v.R; r++) for (let c = 0; c < v.C; c++) {
            const o = v.boxes[r * v.C + c];
            const fresh = prev && prev.length === v.boxes.length && !prev[r * v.C + c];
            if (o) boxes += `<g class="db-box${fresh ? ' new' : ''}"><rect x="${P + c * U + 6}" y="${P + r * U + 6}" width="${U - 12}" height="${U - 12}" rx="10" fill="${col(o)}" opacity="0.28"/>
                <text x="${P + c * U + U / 2}" y="${P + r * U + U / 2 + 14}" text-anchor="middle" class="db-init" fill="${col(o)}">${esc(nameOf(o).slice(0, 1).toUpperCase())}</text></g>`;
        }
        const edge = (kind, r, c, owner) => {
            const x1 = P + c * U, y1 = P + r * U;
            const [x2, y2] = kind === 'h' ? [x1 + U, y1] : [x1, y1 + U];
            const isLast = v.last && v.last.kind === kind && v.last.r === r && v.last.c === c;
            if (owner) lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col(owner)}" stroke-width="${isLast ? 13 : 10}" stroke-linecap="round" class="${isLast ? 'db-last' : ''}"/>`;
            else {
                lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="db-free"/>`;
                if (mine) {
                    const hx = kind === 'h' ? x1 + 14 : x1 - 22, hy = kind === 'h' ? y1 - 22 : y1 + 14;
                    const hw = kind === 'h' ? U - 28 : 44, hh = kind === 'h' ? 44 : U - 28;
                    // A wide invisible touch zone, but the hover preview is a thin line
                    hits += `<g class="db-hit" data-k="${kind}" data-r="${r}" data-c="${c}"><rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" rx="12" class="db-zone"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="db-prev"/></g>`;
                }
            }
        };
        for (let r = 0; r <= v.R; r++) for (let c = 0; c < v.C; c++) edge('h', r, c, v.h[r * v.C + c]);
        for (let r = 0; r < v.R; r++) for (let c = 0; c <= v.C; c++) edge('v', r, c, v.v[r * (v.C + 1) + c]);
        for (let r = 0; r <= v.R; r++) for (let c = 0; c <= v.C; c++) dotsSvg += `<circle cx="${P + c * U}" cy="${P + r * U}" r="7" class="db-dot"/>`;
        root.innerHTML = `<svg class="db-board ${mine ? 'mine' : ''}" viewBox="0 0 ${W} ${H}" role="img">${boxes}${lines}${dotsSvg}${hits}</svg>
            ${mine ? `<p class="g-note">${esc(t('hint'))}</p>` : ''}`;
        root.querySelector('svg').onclick = e => {
            const h = e.target.closest('.db-hit');
            if (h) send({ kind: h.dataset.k, r: Number(h.dataset.r), c: Number(h.dataset.c) });
        };
    },
};
