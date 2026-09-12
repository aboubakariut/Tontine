/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — CLIENT API ET COUCHE RÉSEAU
 * Fichier : js/core/api.js
 * Rôle : Gère les requêtes HTTP asynchrones vers le backend PHP,
 *        l'isolation stricte du mode démo et la file d'attente hors-ligne.
 * ═══════════════════════════════════════════════════════════════════
 */

const API = {
  // Point de terminaison principal de l'API REST
  base: '/api/api.php',

  // Compteur interne de requêtes actives pour la barre de chargement supérieure
  _inFlight: 0,
  _loadingTimer: null,

  /**
   * Déclenche l'animation de la barre de chargement globale
   */
  _showLoadingBar() {
    this._inFlight++;
    const bar = document.getElementById('global-loading-bar');
    if (!bar) return;
    bar.classList.remove('loading-done');
    bar.classList.add('loading-active');
    clearTimeout(this._loadingTimer);
  },

  /**
   * Termine l'animation de la barre de chargement
   */
  _hideLoadingBar() {
    this._inFlight = Math.max(0, this._inFlight - 1);
    if (this._inFlight > 0) return;
    const bar = document.getElementById('global-loading-bar');
    if (!bar) return;
    bar.classList.add('loading-done');
    this._loadingTimer = setTimeout(() => {
      bar.classList.remove('loading-active', 'loading-done');
    }, 200);
  },

  /**
   * Effectue un appel API vers le backend
   * @param {string} action - Nom de l'action backend (ex: 'login', 'createTontine')
   * @param {object} data - Paramètres envoyés dans le corps JSON
   * @returns {Promise<object>} Réponse du serveur ou données simulées en démo
   */
  async request(action, data = {}) {
    // 1. Action démo directe : connexion instantanée sans requête réseau
    if (action === 'demo') {
      return { success: true, user: App.demoData.user, token: 'demo-token-123' };
    }

    // 2. Filtrage strict du mode démonstration (sécurité & conformité)
    if (App.isDemoMode()) {
      // Liste blanche des requêtes consultatives autorisées avec données fictives
      const demoQueries = {
        getTontines: () => ({ success: true, data: App.demoData.tontines }),
        getTontine: () => {
          const tid = Number(data.tontineId || 1);
          const t = App.demoData.tontines.find(item => item.id === tid) || App.demoData.tontines[0];
          return { success: true, data: t };
        },
        getTransactions: () => ({ success: true, data: App.demoData.transactions }),
        getGlobalLog: () => ({ success: true, data: { items: App.demoData.globalLog, total: App.demoData.globalLog.length, offset: 0, limit: 50 } }),
        getInvitations: () => ({ success: true, data: App.demoData.invitations }),
        getNotifications: () => ({ success: true, data: { notifications: [], unread: 0 } }),
        getStats: () => ({ success: true, data: { activeTontines: 2, totalSavings: 260000, totalMembers: 14 } }),
        getPendingMembers: () => ({ success: true, data: [] }),
        getConversations: () => ({ success: true, data: [] }),
        getMessages: () => ({ success: true, data: [] }),
        getMomoInfo: () => ({
          success: true,
          data: {
            operator: 'MTN Mobile Money',
            number: '+225 07 04 23 45 10',
            amountFormatted: '25 000 FCFA',
            ussdCode: '*126#'
          }
        }),
        searchTontine: () => {
          const code = (data.code || '').toUpperCase().trim();
          const t = App.demoData.tontines.find(item => (item.inviteCode || '').toUpperCase() === code);
          if (t) {
            return {
              success: true,
              data: {
                id: t.id,
                name: t.name,
                amount: t.amount,
                members: `${t.currentMembers}/${t.maxMembers}`,
                admin: t.members.find(m => m.role === 'Administrateur')?.name || 'Admin',
                start: t.startDate,
                desc: t.description
              }
            };
          }
          return { success: false, message: 'Tontine introuvable avec ce code en démo (essayez TF-FAM001).' };
        }
      };

      // Si l'action est en lecture seule, retourner directement les données d'exemple
      if (demoQueries[action]) {
        return demoQueries[action]();
      }

      // TOUTES LES AUTRES ACTIONS sont des modifications réelles du backend :
      // On bloque immédiatement la requête et on affiche la fenêtre modale incitative.
      const demoActionLabels = {
        createTontine:     'créer une nouvelle tontine',
        joinTontine:       'rejoindre cette tontine',
        recordPayment:     'confirmer ou valider un paiement',
        declarePayment:    'déclarer un paiement de cotisation',
        rejectPayment:     'rejeter une déclaration de paiement',
        nextTour:          'passer au tour suivant',
        settleDebt:        'marquer une dette comme réglée',
        approveMember:     'approuver ou refuser une demande d\'adhésion',
        updateMemberRole:  'modifier les privilèges d\'administration',
        removeMember:      'retirer un membre de la tontine',
        updateTontine:     'modifier les informations de la tontine',
        updateTontineIcon: 'changer la photo ou l\'icône de la tontine',
        updateTontineMomo: 'enregistrer vos coordonnées Mobile Money',
        closeTontine:      'fermer définitivement la tontine',
        deleteTontine:     'supprimer définitivement la tontine',
        sendInvite:        'envoyer des invitations par email',
        sendReminder:      'envoyer des rappels par email ou SMS',
        updateProfile:     'mettre à jour vos informations personnelles',
        changePassword:    'changer votre mot de passe',
        updateAvatar:      'modifier votre photo de profil',
        sendMessage:       'envoyer des messages dans le chat',
        exportData:        'télécharger l\'export CSV des données réelles'
      };

      const label = demoActionLabels[action] || 'effectuer cette opération';
      if (typeof Modal !== 'undefined' && Modal.showDemoRestriction) {
        Modal.showDemoRestriction(label);
      }
      return { success: false, demoRestricted: true, message: `Fonctionnalité réservée aux membres connectés pour ${label}.` };
    }

    // 3. Utilisateur réel avec compte actif : appel réseau vers le serveur PHP
    this._showLoadingBar();
    try {
      const res = await fetch(this.base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data, token: App.token })
      });
      return await res.json();
    } catch {
      // Erreur réseau ou appareil hors-ligne
      return { success: false, networkError: true, message: 'Serveur inaccessible. Vérifiez votre connexion Internet.' };
    } finally {
      this._hideLoadingBar();
    }
  }
};

// Exposer globalement
window.API = API;
