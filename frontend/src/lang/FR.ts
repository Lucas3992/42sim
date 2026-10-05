const FR = {
  common: {
    hello: 'Bonjour',
    login: 'Connexion',
    pleaseWait: 'Patientez...',
    back: 'Retour',
    confirm: 'Confirmer',
    clickHere: 'Cliquez ici',
    actionFailed: 'Une erreur est survenue',
    close: 'Fermer',
  },

  auth: {
    welcome: 'Bienvenue',
    login: 'Se connecter',
    createAccount: 'Créer un compte',
    continueAsGuest: 'Continuer en invité',
    loginWith42: 'Se connecter avec 42',
    loginWithEmail: 'Se connecter avec une adresse e-mail',
    password: 'Mot de passe',
    loggingIn: 'Connexion en cours...',
    username: "Nom d'utilisateur",
    logout: 'Déconnexion',
    disconnecting: 'Déconnexion',
  },

  profile: {
    profilePage: 'Page de profil',
    toggleTheme: 'Changer de thème',
    changeAvatar: "Changer d'avatar",
  },

  nope: {
    niceTry: 'Coquin va',
  },

  game: {
    type: 'Tape',
    gameOver: "T'es mauvais Jack",
    replay: "Rejouer",
  },

  error: {
    usernameTaken: 'Un compte avec ce nom d\'utilisateur existe déjà',
    alreadyConnected: 'Ce compte est déjà connecté',
  },

  friends: {
    friends: 'Amis',
    addFriend: 'Ajouter un ami',
    requestSent: 'Demande envoyée',
    noResults: 'Aucun résultat',
    add: 'Ajouter',
    pending: 'En attente',
    requestAccepted: 'Demande acceptée',
    requestRejected: 'Demande refusée',
    friendRemoved: 'Ami supprimé',
    userBlocked: 'Utilisateur bloqué',
    remove: 'Supprimer',
    block: 'Bloquer',
    justconnected: 'vient de se connecter',
    sendMessage: 'Envoyer un message',
  },

  chess: {
    launch: 'Jouer aux échecs',
    title: 'Échecs',
    subtitle: "Jouez les Blancs contre l'ordinateur qui joue les Noirs.",
    white: 'Blancs',
    black: 'Noirs',
    player: 'Vous',
    computer: 'Ordinateur',
    newGame: 'Nouvelle partie',
    confirmNewGame: 'Abandonner la partie en cours et en commencer une nouvelle ?',
    moveHistory: 'Historique des coups',
    noMoves: 'Aucun coup pour le moment.',
    localSaveNote: 'Cette partie est enregistrée uniquement dans ce navigateur et peut être effacée ou modifiée localement.',
    promotionPrompt: 'Choisissez une pièce de promotion',
    backHome: "Retour à l'accueil",
    status: {
      turn: 'Aux {color} de jouer',
      check: 'Les {color} sont en échec',
      yourTurn: 'À vous de jouer',
      playerInCheck: 'Votre roi est en échec',
      computerTurn: "Au tour de l'ordinateur",
      computerThinking: "L'ordinateur réfléchit…",
      checkmate: 'Échec et mat — {winner} gagne',
      stalemate: 'Pat',
      draw: 'Partie nulle',
    },
    pieces: {
      pawn: 'pion',
      knight: 'cavalier',
      bishop: 'fou',
      rook: 'tour',
      queen: 'dame',
      king: 'roi',
    },
    a11y: {
      board: "Échiquier",
      pieceOnSquare: '{color} : {piece} en {square}.',
      emptySquare: 'Case {square} vide.',
      legalDestination: 'Destination autorisée.',
    },
  },

  phone: {
    settings: 'Paramètres',
    messages: {
      messages:'Messages',
      loadMore: 'Plus de messages',
    },
    language: 'Langue',
  }

};

export default FR;