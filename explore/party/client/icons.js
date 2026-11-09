/* Small line icons in the site's style (24×24, currentColor stroke). Used instead of emojis and symbols. */

const svg = (body, extra = '') => `<svg class="ic" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${body}</svg>`;

export const ICONS = {
    // markers
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    bot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4.5"/><circle cx="12" cy="3.5" r="1"/><circle cx="9.5" cy="13" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r="1.1" fill="currentColor" stroke="none"/><path d="M3 12v3M21 12v3"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.6-.4 4.6 1.2 5 4.3"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.2"/><path d="M11 17.5h2"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.5 3.5 5.3 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.3-3.5-8.5s1.1-6 3.5-8.5z"/>',
    refresh: '<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19 4.5V8h-3.5"/>',
    skull: '<path d="M12 3.5c-4.4 0-7 2.9-7 6.6 0 2.2 1 3.7 2.5 4.6V18h9v-3.3c1.5-.9 2.5-2.4 2.5-4.6 0-3.7-2.6-6.6-7-6.6z"/><circle cx="9.3" cy="10.5" r="1.4"/><circle cx="14.7" cy="10.5" r="1.4"/><path d="M10.5 18v2.5M13.5 18v2.5"/>',
    bucket: '<path d="M5.5 11.5L12 5l6.5 6.5-6 6a2 2 0 0 1-2.8 0L5.5 13.3a1.3 1.3 0 0 1 0-1.8z"/><path d="M5.2 12h13"/><path d="M9 3.5l3 1.5"/><path d="M20 15.5c0 1.2.7 2 .7 2.8a1.1 1.1 0 0 1-2.2 0c0-.8.8-1.6 1.5-2.8z" fill="currentColor"/>',
    eraser: '<path d="M8.5 19.5h11"/><path d="M4.6 14.6l8.8-8.8a2 2 0 0 1 2.8 0l2 2a2 2 0 0 1 0 2.8l-7.2 7.2H8.2z"/><path d="M9 10.2l4.8 4.8"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    chevL: '<path d="M14.5 6l-6 6 6 6"/>',
    chevR: '<path d="M9.5 6l6 6-6 6"/>',
    versus: '<path d="M4.5 4.5L14 14M19.5 4.5L10 14"/><path d="M11.8 16.8l5-5M7.2 11.8l5 5"/><path d="M15.4 15.4l3.6 3.6M8.6 15.4L5 19"/>',
    // choices
    handshake: '<path d="M2.5 11l3.5-3.5 3 1.5 2.5-1.5 2 0"/><path d="M21.5 11L18 7.5l-4.5.5-4 3.5a1.4 1.4 0 0 0 2 2l2-1.6"/><path d="M6 7.5l-1 8.5 4.5 3.2c.6.4 1.4.3 1.8-.3l4.7-5.4"/><path d="M18 7.5l1 8.5-2.5 1.5"/>',
    dagger: '<path d="M14.5 3.5L20.5 9.5 11 19l-6-6z"/><path d="M8 16l-3.5 3.5"/><path d="M6 13.5l4.5 4.5"/><path d="M15 7l2 2"/>',
    rock: '<path d="M6 17.5L4 12.5l3-5.5 6-2 5.5 3 2 6-3 4.5-7 .5z"/><path d="M9 9.5l3 2.5M14 13.5l2.5-1.5"/>',
    paper: '<path d="M6.5 3h8l4 4v14h-12z"/><path d="M14.5 3v4h4"/><path d="M9.5 11h6M9.5 14h6M9.5 17h4"/>',
    scissors: '<circle cx="6.5" cy="7" r="2.6"/><circle cx="6.5" cy="17" r="2.6"/><path d="M8.6 8.6L20 18M8.6 15.4L20 6"/>',
    lizard: '<ellipse cx="12" cy="4.6" rx="1.8" ry="2.2"/><path d="M12 6.8c-.9 2-.9 4 0 6s.9 3.7-.6 5.2-3.4 1.8-5.4 1.5"/><path d="M11.8 8.8L8.2 7l-.8-1.8M12.1 8.8L15.8 7l.8-1.8M11.6 13.2l-3.4 1.6-.6 2M12.4 13l3.4 1.8.6 2"/>',
    spock: '<path d="M8 21v-5L5.5 12.5c-.6-.9.1-2 1.1-1.8L8 11V5a1.2 1.2 0 0 1 2.4 0v5.5M10.4 10.5V3.8a1.2 1.2 0 0 1 2.4 0v6.7M14.3 10.5V4.3a1.2 1.2 0 0 1 2.4 0v6.2M16.7 10.5V6.3a1.2 1.2 0 0 1 2.4 0V15a6 6 0 0 1-3 5.2V21"/>',
    // UNO card faces
    skip: '<circle cx="12" cy="12" r="7.5"/><path d="M6.7 17.3L17.3 6.7"/>',
    reverse: '<path d="M4.5 9h13l-3.5-3.5"/><path d="M19.5 15h-13l3.5 3.5"/>',
    wild: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>',
    cw: '<path d="M18.5 12a6.5 6.5 0 1 1-1.9-4.6"/><path d="M17 3.5v4h-4"/>',
    ccw: '<path d="M5.5 12a6.5 6.5 0 1 0 1.9-4.6"/><path d="M7 3.5v4h4"/>',
    // game icons
    tictactoe: '<path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17"/><path d="M4.8 4.8l2.4 2.4M7.2 4.8L4.8 7.2"/><circle cx="18" cy="18" r="1.4"/>',
    ultimate: '<rect x="3.5" y="3.5" width="17" height="17" rx="1"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/><path d="M10.5 10.5l3 3M13.5 10.5l-3 3"/>',
    rps: '<path d="M6 17.5L4 12.5l3-5.5 6-2 5.5 3 2 6-3 4.5-7 .5z"/>',
    dilemma: '<path d="M12 4v16M7 20h10"/><path d="M4.5 7.5h15"/><path d="M6.5 7.5L4 13a2.6 2.6 0 0 0 5 0z"/><path d="M17.5 7.5L15 13a2.6 2.6 0 0 0 5 0z"/>',
    nim: '<path d="M6 20V7M10 20V5M14 20V9M18 20V6"/><circle cx="6" cy="5.8" r="1.2" fill="currentColor"/><circle cx="10" cy="3.8" r="1.2" fill="currentColor"/><circle cx="14" cy="7.8" r="1.2" fill="currentColor"/><circle cx="18" cy="4.8" r="1.2" fill="currentColor"/>',
    dots: '<circle cx="5" cy="5" r="1.2" fill="currentColor"/><circle cx="12" cy="5" r="1.2" fill="currentColor"/><circle cx="19" cy="5" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="19" r="1.2" fill="currentColor"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/><circle cx="19" cy="19" r="1.2" fill="currentColor"/><path d="M5 5h7v7H5z"/>',
    reversi: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
    memory: '<rect x="3.5" y="5" width="9" height="12" rx="1.6" transform="rotate(-8 8 11)"/><rect x="11.5" y="6" width="9" height="12" rx="1.6" transform="rotate(8 16 12)"/><path d="M14.6 10.6l1.7 2.6M17.4 10.8l-2.2 2.2"/>',
    hangman: '<path d="M4 20.5h9M7 20.5V3.5h8v3"/><circle cx="15" cy="8.8" r="2.2"/><path d="M15 11v4.5M15 12.5l-2 2M15 12.5l2 2M15 15.5l-1.8 3M15 15.5l1.8 3"/>',
    anagram: '<rect x="3" y="7" width="7.5" height="7.5" rx="1.4"/><rect x="13.5" y="9.5" width="7.5" height="7.5" rx="1.4"/><path d="M8 18.5c1.5 1.5 4 1.8 6 .5M16 5.5c-1.5-1.5-4-1.8-6-.5"/><path d="M12.5 18.8l1.6.3-.3-1.6M11.5 5.2l-1.6-.3.3 1.6"/>',
    mastermind: '<circle cx="7" cy="7" r="2.6"/><circle cx="17" cy="7" r="2.6" fill="currentColor"/><circle cx="7" cy="17" r="2.6" fill="currentColor"/><circle cx="17" cy="17" r="2.6"/>',
    battleship: '<path d="M3 15.5h18l-2.5 4h-13z"/><path d="M6 15.5V12h12v3.5"/><path d="M9.5 12V8.5h4V12M11.5 8.5V4.5"/>',
    blackjack: '<rect x="4" y="3.5" width="11" height="15" rx="1.8"/><path d="M9 3.5"/><rect x="9" y="5.5" width="11" height="15" rx="1.8"/><path d="M14.5 10c-1.6 1.4-2.7 2.3-2.7 3.5a1.4 1.4 0 0 0 2.7.5 1.4 1.4 0 0 0 2.7-.5c0-1.2-1.1-2.1-2.7-3.5zM14.5 14.5v2"/>',
    uno: '<rect x="5" y="3.5" width="14" height="17" rx="2.2"/><ellipse cx="12" cy="12" rx="4.3" ry="6.5" transform="rotate(30 12 12)"/>',
    cheat: '<rect x="3.5" y="5" width="10" height="14" rx="1.6" transform="rotate(-10 8.5 12)"/><rect x="10.5" y="5" width="10" height="14" rx="1.6" transform="rotate(10 15.5 12)"/><path d="M13.3 10.5a2.2 2.2 0 1 1 3 2.1c-.6.3-.9.7-.9 1.4M15.2 16.4v.1"/>',
    codenames: '<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.2"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.2" fill="currentColor"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.2" fill="currentColor"/><rect x="13" y="13" width="7.5" height="7.5" rx="1.2"/>',
    pictionary: '<path d="M4 20l1.2-4.2L15.8 5.2a2 2 0 0 1 2.9 0l.1.1a2 2 0 0 1 0 2.9L8.2 18.8z"/><path d="M14 7l3 3"/>',
    quoridor: '<rect x="3.5" y="3.5" width="17" height="17" rx="1"/><path d="M8 3.5v7M3.5 14h9"/><circle cx="16" cy="16" r="1.8" fill="currentColor"/>',
    dama: '<ellipse cx="12" cy="15.5" rx="7" ry="3"/><path d="M5 15.5v-3M19 15.5v-3"/><ellipse cx="12" cy="12.5" rx="7" ry="3"/><path d="M9 9l1.2-4 1.8 2.5L13.8 5 15 9"/>',
    connect4: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.6"/><circle cx="8" cy="9" r="1.6"/><circle cx="12" cy="9" r="1.6"/><circle cx="16" cy="9" r="1.6" fill="currentColor"/><circle cx="8" cy="14.5" r="1.6" fill="currentColor"/><circle cx="12" cy="14.5" r="1.6" fill="currentColor"/><circle cx="16" cy="14.5" r="1.6"/>',
};

export const icon = (name, cls = '') => (ICONS[name] ? svg(ICONS[name], cls ? ` data-ic="${cls}"` : '') : '');
