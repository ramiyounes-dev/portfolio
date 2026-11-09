/* French for the 3D games (Connect 4, Dama, Quoridor). The games produce English text; the shell passes every
   label, hint and title through tr(), and translates the static page text once per language switch.
   Keys are the exact English strings (HTML included); patterns handle the ones that contain a name. */

export function getLang() {
    try { const s = localStorage.getItem('lang'); if (s === 'en' || s === 'fr') return s; } catch (e) { /* blocked */ }
    return (navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}
export function setLang(l) { try { localStorage.setItem('lang', l); } catch (e) { /* blocked */ } }

const FR = {
    // names
    'Amber': 'Ambre', 'Ivory': 'Ivoire',
    // chrome
    'Explore': 'Explorer', 'Restart': 'Recommencer', 'Menu': 'Menu', 'Yes': 'Oui', 'No': 'Non', 'Play again': 'Rejouer',
    '← Back to Explore': '← Retour à Explorer', 'Back to Explore': 'Retour à Explorer', 'How to play': 'Règles du jeu', 'Back': 'Retour',
    'Restart this game?': 'Recommencer la partie ?', 'Your opponent wants to restart. Accept?': 'Ton adversaire veut recommencer. Accepter ?',
    'Rematch requested, waiting for your opponent...': 'Revanche demandée, en attente de ton adversaire...',
    'Your opponent declined the restart.': 'Ton adversaire a refusé de recommencer.',
    'Opponent disconnected...': 'Adversaire déconnecté...', 'Connection lost. Open the menu to reconnect.': 'Connexion perdue. Ouvre le menu pour te reconnecter.',
    'discs': 'jetons', 'pieces': 'pions', 'walls': 'murs', 'Toggle theme': 'Changer de thème', 'Next': 'Suivant', 'Previous': 'Précédent',
    'Wall': 'Mur', '↻ Rotate': '↻ Tourner',
    'Move <span class="kbd">M</span>': 'Avancer <span class="kbd">M</span>', 'Wall <span class="kbd">W</span>': 'Mur <span class="kbd">W</span>',
    '↻ Rotate <span class="kbd">R</span>': '↻ Tourner <span class="kbd">R</span>', 'Rotate wall': 'Tourner le mur', 'Place wall': 'Poser le mur',
    // turns and results
    'Your turn': 'À toi de jouer', 'AI\'s turn': 'Au tour de l\'IA', 'You': 'Toi', 'AI': 'IA', 'Draw': 'Égalité',
    'You win!': 'Tu gagnes !', 'The AI wins': 'L\'IA gagne',
    'Waiting for your opponent to join...': 'En attente de ton adversaire...', 'The AI is thinking...': 'L\'IA réfléchit...',
    'Waiting for your opponent\'s move...': 'En attente du coup de ton adversaire...',
    'Four in a row': 'Quatre alignés', 'The board is full': 'La grille est pleine',
    'Every piece captured': 'Tous les pions capturés', 'No legal moves left': 'Plus aucun coup possible', 'Reached the other side': 'A atteint l\'autre côté',
    'Walls cannot overlap or cross': 'Les murs ne peuvent ni se chevaucher ni se croiser',
    'That wall would close every path to the goal': 'Ce mur fermerait tous les chemins vers l\'arrivée',
    'Tap a column, or slide and release to drop': 'Touche une colonne, ou glisse puis relâche pour lâcher',
    'Click a column · ← → then Enter · keys 1 to 7': 'Clique une colonne · ← → puis Entrée · touches 1 à 7',
    'Tap Place wall to confirm, or drag to move it': 'Touche Poser le mur pour valider, ou fais-le glisser',
    'Drag the wall to a free spot': 'Fais glisser le mur vers une place libre', 'Drag on the board to aim your wall': 'Glisse sur le plateau pour viser',
    'Click to place the wall · R or scroll rotates · Esc cancels': 'Clique pour poser le mur · R ou la molette tourne · Échap annule',
};

const PATTERNS = [
    [/^(.+)'s turn$/, m => `Au tour de ${name(m[1])}`],
    [/^(.+) wins!?$/, m => `${name(m[1])} gagne !`],
    [/^(\d+) wins?$/, m => `${m[1]} victoire${m[1] === '1' ? '' : 's'}`],
    [/^Keep capturing: (tap|click) the next ring$/, () => 'Continue la prise : choisis l\'anneau suivant'],
    [/^Capture is mandatory: (tap|click) a glowing piece$/, () => 'Prise obligatoire : choisis un pion lumineux'],
    [/^(Tap|Click) a piece, then a dot to move it$/, () => 'Choisis un pion, puis un point pour le déplacer'],
    [/^(Tap|Click) a dot to move\. No walls left$/, () => 'Choisis un point pour avancer. Plus de murs'],
    [/^(Tap|Click) a dot to move, or place a wall$/, () => 'Choisis un point pour avancer, ou pose un mur'],
];
const name = n => FR[n] || n;

export function tr(s, lang = getLang()) {
    if (lang !== 'fr' || s == null) return s;
    const str = String(s).trim();
    if (FR[str] !== undefined) return FR[str];
    for (const [re, f] of PATTERNS) { const m = str.match(re); if (m) return f(m); }
    return s;
}

/** Translate static text in the page: elements whose (trimmed) HTML is a known English string. */
export function translatePage(root = document, lang = getLang()) {
    const sel = '.ctrl-btn, #reset-confirm-box p, .win-back, #btn-win-reset, .pc-count small, #back-link span:last-child, .how-to-play-link';
    root.querySelectorAll(sel).forEach(el => {
        if (el.dataset.en === undefined) el.dataset.en = el.innerHTML.trim().replace(/\s+/g, ' ');
        const en = el.dataset.en;
        const decoded = en.replace(/&times;/g, '×').replace(/&amp;/g, '&');
        el.innerHTML = lang === 'fr' ? (FR[decoded] ?? FR[en] ?? en) : en;
    });
    root.querySelectorAll('[aria-label]').forEach(el => {
        if (el.dataset.enLabel === undefined) el.dataset.enLabel = el.getAttribute('aria-label');
        el.setAttribute('aria-label', lang === 'fr' ? (FR[el.dataset.enLabel] ?? el.dataset.enLabel) : el.dataset.enLabel);
    });
}
