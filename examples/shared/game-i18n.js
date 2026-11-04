/* Shared, independently authored translations for MuPiBox-NG board games (MIT).
 * All strings are bundled offline. Never load translation code from the network.
 */
(function (root) {
  'use strict';
  const strings = {
    de: {
      community:'Community-App', exit:'Schließen', mode:'Spielmodus', two:'2 Spieler',
      easy:'Leicht', normal:'Normal', hard:'Schwer', restart:'Neue Runde',
      loading:'Wird geladen …', paused:'Pausiert', error:'Das Spiel konnte nicht gestartet werden.',
      previewExit:'Browser-Vorschau: Tab schließen', playerTurn:'Spieler {name} ist dran',
      youTurn:'Du bist dran', botTurn:'MuPi überlegt …', youWin:'Du gewinnst!',
      botWin:'MuPi gewinnt!', playerWin:'Spieler {name} gewinnt!', draw:'Unentschieden!',
      tttTitle:'MuPi Kreuz & Kreis', tttHint:'Touch: Feld antippen. Controller: Pfeile + A, X: Modus.',
      fourTitle:'MuPi 4er-Reihe', fourHint:'Touch: Spalte antippen. Controller: Links/Rechts + A, X: Modus.',
      wormTitle:"MuPi Krümelwurm",
      wormHint:"Steuere den Wurm zu den Krümeln. Pfeile, WASD oder Wischen. A/Pause-Taste: Pause.",
      wormStart:"Los geht's!",
      wormPause:"Pause",
      wormResume:"Weiter",
      wormScore:"Punkte",
      wormBest:"Rekord",
      wormOver:"Autsch! Der Wurm hat sich gestoßen.",
      wormReady:"Bereit? Drücke Start!",
      directionUp:"Oben",
      directionDown:"Unten",
      directionLeft:"Links",
      directionRight:"Rechts",
      gardenBoard:"Garten-Spielfeld",
      wormSpeed:"Geschwindigkeit",
      cell:'Feld {number}', column:'Spalte {number}', free:'frei', occupied:'belegt'
    },
    en: {
      community:'Community App', exit:'Close', mode:'Game mode', two:'2 players',
      easy:'Easy', normal:'Normal', hard:'Hard', restart:'New round',
      loading:'Loading …', paused:'Paused', error:'Could not start the game.',
      previewExit:'Browser preview: close this tab', playerTurn:'Player {name} to move',
      youTurn:'Your turn', botTurn:'MuPi is thinking …', youWin:'You win!',
      botWin:'MuPi wins!', playerWin:'Player {name} wins!', draw:'Draw!',
      tttTitle:'MuPi Cross & Circle', tttHint:'Touch: tap a square. Controller: arrows + A, X: mode.',
      fourTitle:'MuPi Four in a Row', fourHint:'Touch: tap a column. Controller: left/right + A, X: mode.',
      wormTitle:"MuPi Crumbworm",
      wormHint:"Guide the worm to the crumbs. Arrows, WASD or swipe. A/pause button: pause.",
      wormStart:"Let's go!",
      wormPause:"Pause",
      wormResume:"Resume",
      wormScore:"Score",
      wormBest:"Best",
      wormOver:"Ouch! The worm bumped into something.",
      wormReady:"Ready? Press Start!",
      directionUp:"Up",
      directionDown:"Down",
      directionLeft:"Left",
      directionRight:"Right",
      gardenBoard:"Garden playfield",
      wormSpeed:"Speed",
      cell:'Square {number}', column:'Column {number}', free:'empty', occupied:'occupied'
    },
    fr: {
      community:'Appli communautaire', exit:'Fermer', mode:'Mode de jeu', two:'2 joueurs',
      easy:'Facile', normal:'Normal', hard:'Difficile', restart:'Nouvelle partie',
      loading:'Chargement …', paused:'En pause', error:'Impossible de démarrer le jeu.',
      previewExit:'Aperçu navigateur : fermez cet onglet', playerTurn:'Au tour du joueur {name}',
      youTurn:'À toi de jouer', botTurn:'MuPi réfléchit …', youWin:'Tu as gagné !',
      botWin:'MuPi a gagné !', playerWin:'Le joueur {name} a gagné !', draw:'Match nul !',
      tttTitle:'MuPi Croix & Rond', tttHint:'Tactile : touche une case. Manette : flèches + A, X : mode.',
      fourTitle:'MuPi Quatre en ligne', fourHint:'Tactile : touche une colonne. Manette : gauche/droite + A, X : mode.',
      wormTitle:"MuPi Ver Gourmand",
      wormHint:"Guide le ver vers les miettes. Flèches, WASD ou glisser. A/pause : pause.",
      wormStart:"C'est parti !",
      wormPause:"Pause",
      wormResume:"Reprendre",
      wormScore:"Points",
      wormBest:"Record",
      wormOver:"Aïe ! Le ver s'est cogné.",
      wormReady:"Prêt ? Appuie sur Démarrer !",
      directionUp:"Haut",
      directionDown:"Bas",
      directionLeft:"Gauche",
      directionRight:"Droite",
      gardenBoard:"Terrain de jeu du jardin",
      wormSpeed:"Vitesse",
      cell:'Case {number}', column:'Colonne {number}', free:'libre', occupied:'occupée'
    },
    es: {
      community:'App comunitaria', exit:'Cerrar', mode:'Modo de juego', two:'2 jugadores',
      easy:'Fácil', normal:'Normal', hard:'Difícil', restart:'Nueva partida',
      loading:'Cargando …', paused:'En pausa', error:'No se pudo iniciar el juego.',
      previewExit:'Vista previa: cierra esta pestaña', playerTurn:'Turno del jugador {name}',
      youTurn:'Tu turno', botTurn:'MuPi está pensando …', youWin:'¡Has ganado!',
      botWin:'¡MuPi ha ganado!', playerWin:'¡Gana el jugador {name}!', draw:'¡Empate!',
      tttTitle:'MuPi Cruz y Círculo', tttHint:'Toca una casilla. Mando: flechas + A, X: modo.',
      fourTitle:'MuPi Cuatro en línea', fourHint:'Toca una columna. Mando: izquierda/derecha + A, X: modo.',
      wormTitle:"MuPi Gusano Comilón",
      wormHint:"Guía al gusano hacia las migas. Flechas, WASD o desliza. A/pausa: pausa.",
      wormStart:"¡Vamos!",
      wormPause:"Pausa",
      wormResume:"Continuar",
      wormScore:"Puntos",
      wormBest:"Récord",
      wormOver:"¡Ay! El gusano ha chocado.",
      wormReady:"¿Listo? ¡Pulsa Iniciar!",
      directionUp:"Arriba",
      directionDown:"Abajo",
      directionLeft:"Izquierda",
      directionRight:"Derecha",
      gardenBoard:"Tablero del jardín",
      wormSpeed:"Velocidad",
      cell:'Casilla {number}', column:'Columna {number}', free:'libre', occupied:'ocupada'
    },
    it: {
      community:'App della community', exit:'Chiudi', mode:'Modalità', two:'2 giocatori',
      easy:'Facile', normal:'Normale', hard:'Difficile', restart:'Nuova partita',
      loading:'Caricamento …', paused:'In pausa', error:'Impossibile avviare il gioco.',
      previewExit:'Anteprima browser: chiudi la scheda', playerTurn:'Turno del giocatore {name}',
      youTurn:'Tocca a te', botTurn:'MuPi sta pensando …', youWin:'Hai vinto!',
      botWin:'MuPi ha vinto!', playerWin:'Vince il giocatore {name}!', draw:'Pareggio!',
      tttTitle:'MuPi Croce e Cerchio', tttHint:'Tocca una casella. Controller: frecce + A, X: modalità.',
      fourTitle:'MuPi Quattro in fila', fourHint:'Tocca una colonna. Controller: sinistra/destra + A, X: modalità.',
      wormTitle:"MuPi Verme Goloso",
      wormHint:"Guida il verme alle briciole. Frecce, WASD o scorri. A/pausa: pausa.",
      wormStart:"Si parte!",
      wormPause:"Pausa",
      wormResume:"Riprendi",
      wormScore:"Punti",
      wormBest:"Record",
      wormOver:"Ops! Il verme ha urtato qualcosa.",
      wormReady:"Pronto? Premi Avvia!",
      directionUp:"Su",
      directionDown:"Giù",
      directionLeft:"Sinistra",
      directionRight:"Destra",
      gardenBoard:"Campo di gioco del giardino",
      wormSpeed:"Velocità",
      cell:'Casella {number}', column:'Colonna {number}', free:'libera', occupied:'occupata'
    },
    nl: {
      community:'Community-app', exit:'Sluiten', mode:'Spelmodus', two:'2 spelers',
      easy:'Makkelijk', normal:'Normaal', hard:'Moeilijk', restart:'Nieuwe ronde',
      loading:'Laden …', paused:'Gepauzeerd', error:'Het spel kon niet starten.',
      previewExit:'Browservoorbeeld: sluit dit tabblad', playerTurn:'Speler {name} is aan de beurt',
      youTurn:'Jij bent aan de beurt', botTurn:'MuPi denkt na …', youWin:'Je wint!',
      botWin:'MuPi wint!', playerWin:'Speler {name} wint!', draw:'Gelijkspel!',
      tttTitle:'MuPi Kruis & Rondje', tttHint:'Tik een vak. Controller: pijlen + A, X: modus.',
      fourTitle:'MuPi Vier op een rij', fourHint:'Tik een kolom. Controller: links/rechts + A, X: modus.',
      wormTitle:"MuPi Kruimelworm",
      wormHint:"Leid de worm naar de kruimels. Pijlen, WASD of vegen. A/pauze: pauze.",
      wormStart:"Daar gaan we!",
      wormPause:"Pauze",
      wormResume:"Verder",
      wormScore:"Score",
      wormBest:"Record",
      wormOver:"Au! De worm is ergens tegenaan gebotst.",
      wormReady:"Klaar? Druk op Start!",
      directionUp:"Omhoog",
      directionDown:"Omlaag",
      directionLeft:"Links",
      directionRight:"Rechts",
      gardenBoard:"Speelveld in de tuin",
      wormSpeed:"Snelheid",
      cell:'Vak {number}', column:'Kolom {number}', free:'leeg', occupied:'bezet'
    },
    sv: {
      community:'Community-app', exit:'Stäng', mode:'Spelläge', two:'2 spelare',
      easy:'Lätt', normal:'Normal', hard:'Svår', restart:'Ny omgång',
      loading:'Laddar …', paused:'Pausad', error:'Spelet kunde inte startas.',
      previewExit:'Webbläsarförhandsvisning: stäng fliken', playerTurn:'Spelare {name}s tur',
      youTurn:'Din tur', botTurn:'MuPi tänker …', youWin:'Du vinner!',
      botWin:'MuPi vinner!', playerWin:'Spelare {name} vinner!', draw:'Oavgjort!',
      tttTitle:'MuPi Kryss & Cirkel', tttHint:'Tryck på en ruta. Handkontroll: pilar + A, X: läge.',
      fourTitle:'MuPi Fyra i rad', fourHint:'Tryck på en kolumn. Handkontroll: vänster/höger + A, X: läge.',
      wormTitle:"MuPi Smulmask",
      wormHint:"Styr masken till smulorna. Pilar, WASD eller svep. A/pausknapp: pausa.",
      wormStart:"Nu kör vi!",
      wormPause:"Pausa",
      wormResume:"Fortsätt",
      wormScore:"Poäng",
      wormBest:"Rekord",
      wormOver:"Aj! Masken krockade.",
      wormReady:"Redo? Tryck på Start!",
      directionUp:"Upp",
      directionDown:"Ner",
      directionLeft:"Vänster",
      directionRight:"Höger",
      gardenBoard:"Trädgårdens spelplan",
      wormSpeed:"Hastighet",
      cell:'Ruta {number}', column:'Kolumn {number}', free:'ledig', occupied:'upptagen'
    }
  };

  function normalize(value) {
    const language = String(value || '').toLowerCase().replace(/_/g, '-').split('-')[0];
    return Object.prototype.hasOwnProperty.call(strings, language) ? language : 'en';
  }

  async function create(sdk) {
    let context = null;
    try { context = await sdk.getContext(); }
    catch (_) { /* A stand-alone preview may not expose a host. */ }
    const language = normalize(context?.language || context?.boxLanguage ||
      (sdk.isHosted ? 'de' : (root.navigator?.language || 'de')));
    root.document.documentElement.lang = language;
    const words = strings[language];
    const t = (key, variables = {}) => {
      const template = words[key] || strings.en[key] || key;
      return template.replace(/\{([a-zA-Z]+)\}/g, (_, name) =>
        Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : '');
    };
    root.document.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = t(node.dataset.i18n);
    });
    root.document.querySelectorAll('[data-i18n-aria]').forEach(node => {
      node.setAttribute('aria-label', t(node.dataset.i18nAria));
    });
    return Object.freeze({ language, t });
  }
  const api = Object.freeze({ create, normalize, strings });
  root.MuPiGamesI18n = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
