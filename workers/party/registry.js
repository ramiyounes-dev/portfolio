/* Every party game the PartyRoom can host. Keys are the ids used in URLs (?game=...). */
import tictactoe from '../../explore/party/logic/tictactoe.js';
import ultimate from '../../explore/party/logic/ultimate.js';
import rps from '../../explore/party/logic/rps.js';
import dilemma from '../../explore/party/logic/dilemma.js';
import nim from '../../explore/party/logic/nim.js';
import dots from '../../explore/party/logic/dots.js';
import reversi from '../../explore/party/logic/reversi.js';
import memory from '../../explore/party/logic/memory.js';
import hangman from '../../explore/party/logic/hangman.js';
import anagram from '../../explore/party/logic/anagram.js';
import mastermind from '../../explore/party/logic/mastermind.js';
import battleship from '../../explore/party/logic/battleship.js';
import blackjack from '../../explore/party/logic/blackjack.js';
import uno from '../../explore/party/logic/uno.js';
import cheat from '../../explore/party/logic/cheat.js';
import codenames from '../../explore/party/logic/codenames.js';
import pictionary from '../../explore/party/logic/pictionary.js';
import connect4 from '../../explore/party/logic/connect4.js';
import dama from '../../explore/party/logic/dama.js';
import quoridor from '../../explore/party/logic/quoridor.js';

export const GAMES = {
    connect4,
    dama,
    quoridor,
    tictactoe,
    ultimate,
    rps,
    dilemma,
    nim,
    dots,
    reversi,
    memory,
    hangman,
    anagram,
    mastermind,
    battleship,
    blackjack,
    uno,
    cheat,
    codenames,
    pictionary,
};
