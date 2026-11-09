/* Shared FR/EN strings for the party-game chrome. Each game adds its own strings.
   The UI language uses the same localStorage key as the main site ("lang"). */

export const SHARED = {
    en: {
        back: 'Explore', howto: 'How to play', close: 'Close', theme: 'Toggle theme',
        nickname: 'Your nickname', nicknamePh: 'e.g. Sam', create: 'Create a room', join: 'Join',
        codePh: 'Room code', or: 'or join a friend', players: 'players',
        entryLead: 'Play against the computer, pass one phone around, or play online with friends.',
        roomCode: 'Room code', copy: 'Copy', copied: 'Copied!', share: 'Share link', shareText: 'Join my {game} room: {code}',
        lobby: 'Lobby', host: 'Host', you: 'You', offline: 'offline', away: 'away', spectator: 'Watching', late: 'joined late',
        waitingMore: 'Waiting for {n} more player(s)', ready: 'Ready to start', start: 'Start', startN: 'Start · {n} players',
        waitingHost: 'Waiting for {name} to start', leave: 'Leave room', watchOnly: 'Watch only (spectator)',
        settings: 'Settings', expected: 'Expected players', expectedOff: 'Off', autostart: 'Start automatically at that number',
        wordLang: 'Word language', langEn: 'English', langFr: 'French', on: 'On', off: 'Off', seconds: '{n} s', none: 'None',
        timer: 'Turn timer', rounds: 'Rounds', queueMode: 'Queue', queueWinner: 'Winner stays on', queueRotate: 'Rotate both',
        spectating: 'You are watching', nextRound: 'You\'ll join next round', queuePos: 'You are #{n} in line. {mode}',
        queueWinnerShort: 'Winner stays on.', queueRotateShort: 'Both players rotate.',
        joinQueue: 'Play next', leaveQueue: 'Just watch', inLine: 'In line #{n}', duelNext: 'Next in line: {names}', duelWatch: 'Watching: {names}',
        results: 'Results', winner: '{name} wins!', winners: '{names} win!', draw: 'Draw', rematch: 'Rematch', toLobby: 'Back to lobby',
        waitingRematch: 'Waiting for {name}: rematch or lobby', roomWins: 'room wins', roomWin: 'room win', points: 'pts', score: 'Score',
        nextMatch: 'Next match', turnOf: '{name}\'s turn', yourTurn: 'Your turn', waitingFor: 'Waiting for {name}',
        connecting: 'Connecting...', reconnecting: 'Connection lost, reconnecting...',
        'err.not_found': 'No room with this code. Check it, or create a new room.',
        'err.wrong_game': 'This code is for another game.', 'err.goThere': 'Open it',
        'err.full': 'This room is full (12 people).', 'err.name_taken': 'Someone in the room already has this nickname.',
        'err.name_required': 'Pick a nickname first.', 'err.taken': 'Could not create a room, try again.',
        'err.bad_game': 'Unknown game.', 'err.not_enough': 'Not enough players yet.', 'err.code': 'Enter the 4-letter room code.',
        'err.not_your_turn': 'Not your turn.', 'err.illegal': 'That move is not allowed.', 'err.offline': 'You are offline.',
        'su.back': 'Back', 'su.step': 'Step {n}', 'su.howMany': 'How many players?', 'su.fixed': 'A duel. Online, anyone else who joins watches.', 'su.next': 'Next',
        'su.who': 'Who is playing?', 'su.vsAi': 'Against the computer', 'su.vsAiSub': 'You + {n} AI player(s), right now', 'su.humans': 'With people', 'su.humansSub': '{n} humans, here or online',
        'su.aiLine': 'You play against {n} AI player(s). They think for a moment, never see your hidden cards and never cheat.',
        'su.difficulty': 'Difficulty', 'su.easy': 'Easy', 'su.medium': 'Medium', 'su.hard': 'Hard', 'su.yourRole': 'Your role', 'su.play': 'Play',
        'su.where': 'Where are you?', 'su.device': 'Same device', 'su.deviceSub': 'Pass the phone around', 'su.online': 'Online', 'su.onlineSub': 'Everyone on their own phone',
        'su.namesLine': 'Enter everyone\'s name, in playing order.', 'su.playerN': 'Player {n}',
        'su.create': 'Create a room', 'su.public': 'Public', 'su.private': 'Private', 'su.publicSub': 'Listed below for anyone', 'su.privateSub': 'Only with the code', 'su.target': 'starts at {n} players',
        'su.join': 'Join a room', 'su.openRooms': 'Open rooms', 'su.refresh': 'Refresh', 'su.noRooms': 'No public room right now. Create one.', 'su.inLobby': 'waiting', 'su.inGame': 'in progress',
        'su.passLabel': 'Hand over', 'su.passTo': 'Pass the phone to {name}', 'su.passHint': 'Everyone else, look away.', 'su.imName': 'I am {name}, show me',
        'su.add': 'Add', 'su.addPh': 'New player', 'su.remove': 'Remove', 'su.thinking': 'thinking…', 'su.newGame': 'New setup',
        'su.localTable': 'Same device', 'su.vsAiTable': 'Against the computer',
    },
    fr: {
        back: 'Explorer', howto: 'Règles du jeu', close: 'Fermer', theme: 'Changer de thème',
        nickname: 'Ton pseudo', nicknamePh: 'ex. Léa', create: 'Créer une partie', join: 'Rejoindre',
        codePh: 'Code de la partie', or: 'ou rejoindre un ami', players: 'joueurs',
        entryLead: 'Joue contre l\'ordinateur, passe-toi le téléphone ou joue en ligne avec tes amis.',
        roomCode: 'Code de la partie', copy: 'Copier', copied: 'Copié !', share: 'Partager le lien', shareText: 'Rejoins ma partie de {game} : {code}',
        lobby: 'Salon', host: 'Hôte', you: 'Toi', offline: 'hors ligne', away: 'absent', spectator: 'Spectateur', late: 'arrivé en cours',
        waitingMore: 'Encore {n} joueur(s) attendu(s)', ready: 'Prêt à commencer', start: 'Commencer', startN: 'Commencer · {n} joueurs',
        waitingHost: 'En attente de {name} pour commencer', leave: 'Quitter la partie', watchOnly: 'Regarder seulement (spectateur)',
        settings: 'Réglages', expected: 'Joueurs attendus', expectedOff: 'Non', autostart: 'Démarrer automatiquement à ce nombre',
        wordLang: 'Langue des mots', langEn: 'Anglais', langFr: 'Français', on: 'Oui', off: 'Non', seconds: '{n} s', none: 'Aucun',
        timer: 'Temps par tour', rounds: 'Manches', queueMode: 'File d\'attente', queueWinner: 'Le gagnant reste', queueRotate: 'Les deux changent',
        spectating: 'Tu regardes la partie', nextRound: 'Tu rejoins à la prochaine manche', queuePos: 'Tu es n°{n} dans la file. {mode}',
        queueWinnerShort: 'Le gagnant reste.', queueRotateShort: 'Les deux joueurs changent.',
        joinQueue: 'Jouer ensuite', leaveQueue: 'Juste regarder', inLine: 'En attente n°{n}', duelNext: 'À suivre : {names}', duelWatch: 'Spectateurs : {names}',
        results: 'Résultats', winner: '{name} gagne !', winners: '{names} gagnent !', draw: 'Égalité', rematch: 'Revanche', toLobby: 'Retour au salon',
        waitingRematch: 'En attente de {name} : revanche ou salon', roomWins: 'victoires', roomWin: 'victoire', points: 'pts', score: 'Score',
        nextMatch: 'Match suivant', turnOf: 'Au tour de {name}', yourTurn: 'À toi de jouer', waitingFor: 'En attente de {name}',
        connecting: 'Connexion...', reconnecting: 'Connexion perdue, reconnexion...',
        'err.not_found': 'Aucune partie avec ce code. Vérifie-le ou crée une nouvelle partie.',
        'err.wrong_game': 'Ce code correspond à un autre jeu.', 'err.goThere': 'L\'ouvrir',
        'err.full': 'Cette partie est complète (12 personnes).', 'err.name_taken': 'Quelqu\'un a déjà ce pseudo dans la partie.',
        'err.name_required': 'Choisis d\'abord un pseudo.', 'err.taken': 'Impossible de créer la partie, réessaie.',
        'err.bad_game': 'Jeu inconnu.', 'err.not_enough': 'Pas encore assez de joueurs.', 'err.code': 'Entre le code de 4 caractères.',
        'err.not_your_turn': 'Ce n\'est pas ton tour.', 'err.illegal': 'Ce coup n\'est pas autorisé.', 'err.offline': 'Tu es hors ligne.',
        'su.back': 'Retour', 'su.step': 'Étape {n}', 'su.howMany': 'Combien de joueurs ?', 'su.fixed': 'Un duel. En ligne, les autres personnes regardent.', 'su.next': 'Suivant',
        'su.who': 'Qui joue ?', 'su.vsAi': 'Contre l\'ordinateur', 'su.vsAiSub': 'Toi + {n} joueur(s) IA, tout de suite', 'su.humans': 'Entre humains', 'su.humansSub': '{n} personnes, ici ou en ligne',
        'su.aiLine': 'Tu joues contre {n} joueur(s) IA. Ils réfléchissent un instant, ne voient jamais tes cartes cachées et ne trichent pas.',
        'su.difficulty': 'Difficulté', 'su.easy': 'Facile', 'su.medium': 'Moyen', 'su.hard': 'Difficile', 'su.yourRole': 'Ton rôle', 'su.play': 'Jouer',
        'su.where': 'Où êtes-vous ?', 'su.device': 'Même appareil', 'su.deviceSub': 'On se passe le téléphone', 'su.online': 'En ligne', 'su.onlineSub': 'Chacun sur son téléphone',
        'su.namesLine': 'Entre le nom de chacun, dans l\'ordre de jeu.', 'su.playerN': 'Joueur {n}',
        'su.create': 'Créer une partie', 'su.public': 'Publique', 'su.private': 'Privée', 'su.publicSub': 'Visible par tous ci-dessous', 'su.privateSub': 'Seulement avec le code', 'su.target': 'démarre à {n} joueurs',
        'su.join': 'Rejoindre une partie', 'su.openRooms': 'Parties ouvertes', 'su.refresh': 'Actualiser', 'su.noRooms': 'Aucune partie publique pour l\'instant. Crées-en une.', 'su.inLobby': 'en attente', 'su.inGame': 'en cours',
        'su.passLabel': 'Passage de main', 'su.passTo': 'Passe le téléphone à {name}', 'su.passHint': 'Les autres, regardez ailleurs.', 'su.imName': 'Je suis {name}, montrer',
        'su.add': 'Ajouter', 'su.addPh': 'Nouveau joueur', 'su.remove': 'Retirer', 'su.thinking': 'réfléchit…', 'su.newGame': 'Nouvelle configuration',
        'su.localTable': 'Même appareil', 'su.vsAiTable': 'Contre l\'ordinateur',
    },
};

export function initialLang() {
    try {
        const saved = localStorage.getItem('lang');
        if (saved === 'en' || saved === 'fr') return saved;
    } catch (e) { /* storage blocked */ }
    return (navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export function saveLang(lang) {
    try { localStorage.setItem('lang', lang); } catch (e) { /* storage blocked */ }
}

/** t(key, vars) with game strings first, then shared ones; {name} placeholders. */
export function makeT(gameStrings, getLang) {
    return (key, vars = {}) => {
        const lang = getLang();
        const s = (gameStrings && gameStrings[lang] && gameStrings[lang][key])
            ?? SHARED[lang][key] ?? (gameStrings && gameStrings.en && gameStrings.en[key]) ?? SHARED.en[key] ?? key;
        return String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
    };
}
