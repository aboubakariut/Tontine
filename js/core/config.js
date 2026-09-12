/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — CONFIGURATION GLOBALE ET ÉTATS DE L'APPLICATION
 * Fichier : js/core/config.js
 * Rôle : Définit l'état réactif central de l'application, les données
 *        fictives de démonstration, et les utilitaires de session.
 * ═══════════════════════════════════════════════════════════════════
 */

// Déclaration de l'objet central "App" partagé par tous les composants
const App = {
  // Identifiant de la page actuellement affichée à l'écran (ex: 'dashboard', 'auth')
  currentPage: 'auth',

  // Utilisateur actuellement authentifié (null si non connecté)
  currentUser: null,

  // Jeton d'authentification API (Bearer token en base de données ou token démo)
  token: null,

  // Données de la tontine actuellement consultée dans l'écran de détail
  currentTontine: null,

  // Préférences utilisateur persistées localement
  settings: {
    theme: 'emerald',                                                    // Thème de couleur actif
    fontSize: 'medium',                                                  // Taille de typographie
    notifications: { payment: true, requests: true, confirmed: true },   // Alertes activées
    security: { pin: false, hideAmounts: false }                         // Paramètres de confidentialité
  },

  /**
   * Vérifie si l'application s'exécute actuellement en mode démonstration.
   * Le token démo "demo-token-123" est réservé aux visites d'évaluation sans compte.
   * @returns {boolean} Vrai si le mode démo est actif
   */
  isDemoMode() {
    return this.token === 'demo-token-123';
  },

  /**
   * Vérifie si une action est restreinte en mode démo.
   * Si l'utilisateur est en mode démo, affiche la fenêtre modale explicative
   * et empêche l'exécution de la fonctionnalité backend.
   * @param {string} actionLabel - Libellé convivial de l'action tentée
   * @returns {boolean} Vrai si l'action a été bloquée, Faux si l'action peut continuer
   */
  checkDemoRestriction(actionLabel) {
    if (this.isDemoMode()) {
      if (typeof Modal !== 'undefined' && Modal.showDemoRestriction) {
        Modal.showDemoRestriction(actionLabel);
      } else {
        alert('Cette fonctionnalité nécessite un compte connecté.');
      }
      return true; // Action bloquée
    }
    return false; // Action autorisée
  },

  // Données d'exemple statiques utilisées exclusivement lors de la visite démo
  demoData: {
    // Profil utilisateur fictif pour la démo
    user: {
      id: 1,
      firstname: 'Kouamé',
      lastname: 'Adjoumani',
      email: 'k.adjoumani@gmail.com',
      phone: '+225 07 04 23 45 10',
      inviteCode: 'TF-KA2025',
      avatar: 'KA',
      role: 'Admin & Membre'
    },

    // Tontines d'exemple avec cycles et cotisations configurés
    tontines: [
      {
        id: 1,
        name: 'Tontine Famille Adjoumani',
        description: 'Épargne collective mensuelle pour les projets familiaux. Chaque membre contribue 25 000 FCFA par mois.',
        amount: 25000,
        pot: 175000,
        frequency: 'Mensuel',
        currentTour: 3,
        totalTours: 7,
        currentMembers: 7,
        maxMembers: 10,
        userRole: 'admin',
        inviteCode: 'TF-FAM001',
        nextPaymentDate: '2025-05-01',
        status: 'active',
        badge: 'badge-active',
        badgeText: 'En cours',
        momoOperator: 'orange',
        momoNumber: '0704234510',
        members: [
          { id: 1, name: 'Kouamé Adjoumani', role: 'Administrateur', paid: true, isBeneficiary: false, debt: 0, order: 1 },
          { id: 2, name: 'Awa Traoré', role: 'Membre', paid: true, isBeneficiary: true, debt: 0, order: 3 },
          { id: 3, name: 'Mamadou Diallo', role: 'Membre', paid: false, isBeneficiary: false, debt: 25000, order: 2 },
          { id: 4, name: 'Fatou Koné', role: 'Membre', paid: true, isBeneficiary: false, debt: 0, order: 4 },
          { id: 5, name: 'Ibrahim Cissé', role: 'Membre', paid: false, isBeneficiary: false, debt: 0, order: 5 },
          { id: 6, name: 'Salimata Bamba', role: 'Membre', paid: true, isBeneficiary: false, debt: 0, order: 6 },
          { id: 7, name: 'Yao Kouassi', role: 'Membre', paid: true, isBeneficiary: false, debt: 0, order: 7 }
        ]
      },
      {
        id: 2,
        name: 'Épargne Commerce Treichville',
        description: 'Tontine hebdomadaire entre commerçants du grand marché pour fonds de roulement.',
        amount: 15000,
        pot: 105000,
        frequency: 'Hebdomadaire',
        currentTour: 5,
        totalTours: 8,
        currentMembers: 7,
        maxMembers: 8,
        userRole: 'member',
        inviteCode: 'TF-SGC002',
        nextPaymentDate: '2025-04-20',
        status: 'active',
        badge: 'badge-active',
        badgeText: 'En cours',
        momoOperator: 'mtn',
        momoNumber: '0505123456',
        members: [
          { id: 1, name: 'Kouamé Adjoumani', role: 'Membre', paid: true, isBeneficiary: false, debt: 0, order: 2 },
          { id: 8, name: 'Bakary Fofana', role: 'Administrateur', paid: true, isBeneficiary: false, debt: 0, order: 1 },
          { id: 9, name: 'Mariam Coulibaly', role: 'Membre', paid: true, isBeneficiary: true, debt: 0, order: 5 }
        ]
      }
    ],

    // Transactions financières fictives pour l'historique
    transactions: [
      { id: 1, name: 'Cotisation reçue - Awa Traoré', tontine: 'Famille Adjoumani', type: 'in', status: 'paid', amount: 25000, date: '15/04/2025' },
      { id: 2, name: 'Versement cagnotte - Awa Traoré', tontine: 'Famille Adjoumani', type: 'out', status: 'paid', amount: 175000, date: '15/04/2025' },
      { id: 3, name: 'Cotisation reçue - Fatou Koné', tontine: 'Famille Adjoumani', type: 'in', status: 'paid', amount: 25000, date: '14/04/2025' },
      { id: 4, name: 'Cotisation reçue - Salimata Bamba', tontine: 'Famille Adjoumani', type: 'in', status: 'paid', amount: 25000, date: '12/04/2025' },
      { id: 5, name: 'Votre cotisation envoyée', tontine: 'Commerce Treichville', type: 'in', status: 'paid', amount: 15000, date: '10/04/2025' }
    ],

    // Journal d'audit transparent d'exemple
    globalLog: [
      { id: 1, action: 'Versement cagnotte Tour 3', detail: '175 000 FCFA versés à Awa Traoré', user: 'Admin', time: '15/04/2025 14:32', type: 'payment' },
      { id: 2, action: 'Paiement confirmé', detail: '25 000 FCFA reçu de Kouamé Adjoumani', user: 'Admin', time: '15/04/2025 10:15', type: 'payment' },
      { id: 3, action: 'Cotisation déclarée', detail: 'Awa Traoré a déclaré son transfert Mobile Money', user: 'Awa T.', time: '14/04/2025 19:40', type: 'payment' },
      { id: 4, action: 'Nouveau membre approuvé', detail: 'Yao Kouassi a rejoint la tontine', user: 'Admin', time: '10/04/2025 09:12', type: 'admin' }
    ],

    // Demandes et invitations d'exemple
    invitations: []
  }
};

/**
 * Gestionnaire sécurisé de persistance localStorage (avec fallback en mémoire)
 */
const Storage = {
  // Préfixe pour isoler les clés de l'application dans le stockage navigateur
  prefix: 'tf_',

  /**
   * Enregistre une valeur au format JSON
   * @param {string} key - Nom de la clé
   * @param {any} val - Donnée à sauvegarder
   */
  save(key, val) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(val));
    } catch (e) {
      console.warn('[Storage] Impossible d\'enregistrer dans localStorage:', e);
    }
  },

  /**
   * Récupère et désérialise une valeur JSON
   * @param {string} key - Nom de la clé
   * @returns {any} Donnée lue ou null si inexistante
   */
  load(key) {
    try {
      const v = localStorage.getItem(this.prefix + key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },

  /**
   * Supprime une clé spécifique
   * @param {string} key - Clé à supprimer
   */
  remove(key) {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (e) {}
  }
};

/**
 * Mémorisation de la dernière page visitée pour restaurer l'état
 * après un rechargement sans renvoyer l'utilisateur au début.
 */
const RouteMemory = {
  KEY: 'tf_last_route',

  /**
   * Enregistre l'écran actuel et ses paramètres optionnels
   * @param {string} page - Identifiant de la page
   * @param {string} title - Titre affiché
   * @param {object} params - Paramètres d'état (ex: tontineId)
   */
  save(page, title = '', params = {}) {
    if (!page || page === 'auth') {
      this.clear();
      return;
    }
    try {
      localStorage.setItem(this.KEY, JSON.stringify({ page, title, params, savedAt: Date.now() }));
    } catch {}
  },

  /**
   * Charge la dernière route enregistrée
   * @returns {object|null}
   */
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // La mémorisation reste valide 24 heures
      if (Date.now() - (data.savedAt || 0) > 24 * 3600 * 1000) {
        this.clear();
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },

  /**
   * Efface la route mémorisée
   */
  clear() {
    try {
      localStorage.removeItem(this.KEY);
    } catch {}
  }
};

// Exposer sur l'objet global window pour compatibilité transversale
window.App = App;
window.Storage = Storage;
window.RouteMemory = RouteMemory;
