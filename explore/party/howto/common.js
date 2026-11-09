/* Pieces shared by the How to play step lists. */
import { modesArt } from '../client/howto-art.js';

export const touch = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

const BASE = {
    en: '<b>vs AI</b>: bots on Easy, Medium or Hard. <b>Same device</b>: take turns on one screen. <b>Online</b>: create a public or private room and share the code.',
    fr: '<b>Contre l\'IA</b> : des bots en Facile, Moyen ou Difficile. <b>Même appareil</b> : chacun son tour sur un écran. <b>En ligne</b> : crée une partie publique ou privée et partage le code.',
};
export const DUEL_NOTE = {
    en: 'Online, anyone else who joins watches and waits in line for the next game.',
    fr: 'En ligne, les autres personnes regardent et attendent leur tour pour la partie suivante.',
};
/** 3D duels: rematches keep the same two players, so visitors only watch. */
export const WATCH_NOTE = {
    en: 'Online, anyone else who joins the room watches the game.',
    fr: 'En ligne, les autres personnes qui rejoignent la partie la regardent.',
};
export const SECRET_NOTE = {
    en: 'On one device, a "Pass the phone" screen hides what others must not see.',
    fr: 'Sur un seul appareil, un écran « Passe le téléphone » cache ce que les autres ne doivent pas voir.',
};

/** Last step of every game: the three modes, plus a note for this game. */
export function modesStep(note) {
    return {
        title: { en: 'Ways to play', fr: 'Modes de jeu' },
        art: modesArt,
        text: lang => `${BASE[lang] || BASE.en}${note ? ' ' + (note[lang] || note.en) : ''}`,
    };
}
