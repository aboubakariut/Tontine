/**
 * ==============================================================================================
 * POINT D'ENTRÉE PRINCIPAL DE L'APPLICATION (js/app.js)
 * ==============================================================================================
 * Ce fichier est le chef d'orchestre de l'application Tontines Facile :
 * 1. Initialise le gestionnaire PWA (PWAInstall) et le Service Worker (SWManager).
 * 2. Configure les écouteurs d'événements globaux (navigation, boutons, popstate Android, notifications).
 * 3. Restaure l'état de session utilisateur (authentification et route mémorisée).
 * 4. Démarre les différents modules (Dashboard, Profil, Paramètres, Tontines, Chat, Contacts).
 * 5. Gère la transition fluide de l'écran de démarrage (Splash Screen).
 * ==============================================================================================
 */

// Dictionnaire associant les identifiants techniques des pages à leurs titres conviviaux affichés dans l'en-tête
const PAGE_TITLES = {
  invite: 'Inviter des membres',
  contacts: 'Mes contacts',
  chat: 'Messagerie',
  terms: "Conditions d'utilisation",
  privacy: 'Politique de confidentialité',
  transactions: 'Historique des transactions',
  'audit-log': 'Journal de sécurité'
};

/**
 * Navigue vers une page simple et charge ses données de manière dynamique.
 * Utilisée lors d'un clic sur un lien [data-page] ou lors de la restauration de session.
 * @param {string} page - L'identifiant de la page cible.
 */
function goToPage(page) {
  // Chargement spécifique selon la page de destination
  if (page === 'transactions' && window.Transactions) Transactions.load();
  if (page === 'audit-log' && window.AuditLog) AuditLog.load();
  if (page === 'profile' && window.Profile) Profile.load();
  if (page === 'invite' && window.Invite) Invite.loadTontines();
  if (page === 'contacts' && window.Contacts) Contacts.load();
  if (page === 'chat' && window.Chat) Chat.loadConversations();

  // Déclenchement de la navigation visuelle via le module Nav
  if (window.Nav) {
    Nav.go(page, PAGE_TITLES[page] || '');
  }
}

/**
 * Configure tous les écouteurs d'événements globaux de l'interface utilisateur.
 */
function setupEventListeners() {

  // Écouteur global par délégation sur le document pour intercepter tous les clics sur les éléments avec 'data-page'
  document.addEventListener('click', (e) => {
    const pageTarget = e.target.closest('[data-page]');
    if (pageTarget) {
      const page = pageTarget.dataset.page;
      if (page) {
        e.preventDefault();
        if (window.Nav) Nav.closeMenu();
        goToPage(page);
      }
    }
  });

  // Gestion du bouton de retour arrière de l'en-tête
  const backBtn = document.getElementById('btn-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (window.Nav) Nav.back();
    });
  }

  // Filtrage en temps réel des membres dans le détail d'une tontine
  const memberSearchInput = document.getElementById('search-members');
  if (memberSearchInput) {
    memberSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('#detail-members-list .member-item').forEach(row => {
        row.style.display = !q || (row.dataset.searchName || '').includes(q) ? '' : 'none';
      });
    });
  }

  // Bouton pour faire avancer le tour de la tontine (attribution de la cagnotte)
  const nextTourBtn = document.getElementById('btn-next-tour');
  if (nextTourBtn) {
    nextTourBtn.addEventListener('click', () => {
      if (window.TontineDetail) TontineDetail.advanceTour();
    });
  }

  // Boutons de la bannière du mode démo
  const bannerRegister = document.getElementById('btn-banner-register');
  if (bannerRegister) {
    bannerRegister.addEventListener('click', () => {
      if (window.Auth) Auth.exitDemoToAuth('register');
    });
  }

  const bannerLogin = document.getElementById('btn-banner-login');
  if (bannerLogin) {
    bannerLogin.addEventListener('click', () => {
      if (window.Auth) Auth.exitDemoToAuth('login');
    });
  }

  // Export CSV des transactions
  const exportTxBtn = document.getElementById('btn-export-transactions');
  if (exportTxBtn) {
    exportTxBtn.addEventListener('click', () => {
      if (window.UI && window.Transactions) {
        UI.exportCSV('transactions.csv', Transactions.data || [], [
          { key: 'name', label: 'Nom' },
          { key: 'tontine', label: 'Tontine' },
          { key: 'type', label: 'Type' },
          { key: 'status', label: 'Statut' },
          { key: 'amount', label: 'Montant (FCFA)' },
          { key: 'date', label: 'Date' }
        ]);
      }
    });
  }

  // Export CSV du journal d'audit
  const exportAuditBtn = document.getElementById('btn-export-audit-log');
  if (exportAuditBtn) {
    exportAuditBtn.addEventListener('click', () => {
      if (window.UI && window.AuditLog) {
        UI.exportCSV('journal.csv', AuditLog.data || [], [
          { key: 'time', label: 'Date' },
          { key: 'user', label: 'Utilisateur' },
          { key: 'action', label: 'Action' },
          { key: 'detail', label: 'Détail' },
          { key: 'type', label: 'Type' }
        ]);
      }
    });
  }

  // Bouton d'ouverture du menu déroulant
  const menuBtn = document.getElementById('btn-menu');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const menu = document.getElementById('dropdown-menu');
      const overlay = document.getElementById('dropdown-overlay');
      if (menu) menu.classList.toggle('hidden');
      if (overlay) overlay.classList.toggle('hidden');
    });
  }

  // Clic sur l'arrière-plan semi-transparent pour fermer le menu
  const menuOverlay = document.getElementById('dropdown-overlay');
  if (menuOverlay) {
    menuOverlay.addEventListener('click', () => {
      if (window.Nav) Nav.closeMenu();
    });
  }

  // Cloche de notifications
  const notifBtn = document.getElementById('btn-notif');
  if (notifBtn) {
    notifBtn.addEventListener('click', async () => {
      if (!window.Modal || !window.API) return;
      Modal.open('Notifications', window.UI ? UI.skeletonRows(4) : 'Chargement...');

      const res = await API.request('getNotifications');
      const notifs = res.success ? (res.data?.notifications ?? []) : [];

      if (!notifs.length) {
        Modal.open('Notifications', '<div class="empty-state"><div class="empty-icon">🔔</div><h3>Aucune notification</h3><p>Vous êtes à jour !</p></div>');
        return;
      }

      const icons = {
        payment_reminder: '💰', member: '👤', payment_confirmed: '✅', admin: '📢', system: '🔄',
        join_request: '🙋', approved: '🎉', rejected: '🚫', disbursement: '🎁',
        contact_request: '🤝', contact_accepted: '🤝',
        payment_declared: '🕒', payment_rejected: '⚠️', role_changed: '👑'
      };

      const html = notifs.map((n, i) => `
        <div class="activity-item activity-clickable" data-notif-index="${i}" style="cursor:pointer">
          <div class="activity-icon">${icons[n.type] || '🔔'}</div>
          <div class="activity-text"><strong>${n.title}</strong><br><span>${n.body || ''}</span></div>
        </div>`).join('');
      Modal.open('Notifications', html);

      // Marque les notifications comme lues côté backend
      API.request('markNotificationsRead').then(() => {
        const badge = document.getElementById('notif-badge');
        if (badge) badge.style.display = 'none';
      });

      // Navigation contextuelle lors d'un clic sur une notification
      document.querySelectorAll('[data-notif-index]').forEach(el => {
        el.addEventListener('click', () => {
          const n = notifs[parseInt(el.dataset.notifIndex, 10)];
          Modal.close();
          if (!n) return;
          if (n.type === 'join_request' && n.tontine_id && window.TontineDetail) {
            TontineDetail.openById(n.tontine_id, true, n.ref_id);
          } else if (n.tontine_id && window.TontineDetail) {
            TontineDetail.openById(n.tontine_id);
          } else if ((n.type === 'contact_request' || n.type === 'contact_accepted') && window.Contacts) {
            if (window.Nav) Nav.go('contacts');
            Contacts.load();
          }
        });
      });
    });
  }

  // Fermeture des modales via la croix
  const modalCloseBtn = document.getElementById('modal-close');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      if (window.Modal) Modal.close();
    });
  }

  // Gestion du bouton retour matériel (Android) et de l'historique de navigation
  window.addEventListener('popstate', () => {
    if (window.Modal && Modal._ignoreNextPopstate) {
      Modal._ignoreNextPopstate = false;
      return;
    }
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay && !modalOverlay.classList.contains('hidden')) {
      if (window.Modal) {
        Modal._closingFromPopstate = true;
        Modal.close();
      }
      return;
    }
    if (window.Nav) Nav.back(true);
  });

  // Renvoi automatique des messages de chat mis en file d'attente hors-ligne lors du retour de connexion
  window.addEventListener('online', () => {
    if (window.Chat && typeof Chat.flushOfflineQueue === 'function') {
      Chat.flushOfflineQueue();
    }
  });
}

/**
 * Restaure la dernière page visitée avant un rafraîchissement (F5).
 * @param {Object} route - Informations sur la route mémorisée.
 */
async function restoreRoute(route) {
  if (!route || !route.page || route.page === 'auth') {
    if (window.Nav) Nav.go('dashboard');
    return;
  }
  try {
    if (route.page === 'tontine-detail' && route.context?.tontineId && window.TontineDetail) {
      await TontineDetail.openById(route.context.tontineId);
      if (!document.getElementById('page-tontine-detail')?.classList.contains('active')) {
        if (window.Nav) Nav.go('dashboard');
      }
      return;
    }
    if (route.page === 'chat-thread' && route.context?.conversationId && window.Chat) {
      await Chat.openThread(route.context.conversationId, route.title, route.context.avatar, route.context.avatarPhoto, !!route.context.isGroup);
      if (!document.getElementById('page-chat-thread')?.classList.contains('active')) {
        if (window.Nav) Nav.go('dashboard');
      }
      return;
    }
    const pageEl = document.getElementById(`page-${route.page}`);
    if (!pageEl) {
      if (window.Nav) Nav.go('dashboard');
      return;
    }
    goToPage(route.page);
  } catch (err) {
    console.error('[App] Restauration de la page échouée :', err);
    if (window.Nav) Nav.go('dashboard');
  }
}

/**
 * Fonction d'initialisation principale appelée au chargement complet du DOM.
 */
async function init() {

  // Étape 0 : Détection d'un éventuel lien d'invitation direct dans l'URL (ex: /join/TF-ABC123)
  const joinMatch = window.location.pathname.match(/\/join\/([A-Za-z0-9-]+)/);
  const pendingJoinCode = joinMatch ? decodeURIComponent(joinMatch[1]).toUpperCase() : null;

  // Étape 1 : Lecture immédiate de l'état de session utilisateur depuis le stockage local
  const savedUser = window.Storage ? Storage.load('user') : null;
  const savedToken = window.Storage ? Storage.load('token') : null;

  // Étape 2 : Initialisation du système PWA et du Service Worker
  if (window.PWAInstall) PWAInstall.init();
  if (window.SWManager) SWManager.register();

  // Étape 3 : Initialisation des écouteurs globaux et des modules de pages
  setupEventListeners();
  if (window.Settings) Settings.applyStored();
  if (window.Auth) Auth.init();
  if (window.Profile) Profile.init();
  if (window.Settings) Settings.init();
  if (window.CreateTontine) CreateTontine.init();
  if (window.JoinTontine) JoinTontine.init();
  if (window.Invite) Invite.init();
  if (window.Contacts) Contacts.init();
  if (window.Chat) Chat.init();

  // Étape 4 : Détermination et activation de la bonne page AVANT d'afficher l'application
  const isLoggedIn = !!(savedUser && savedToken);
  const savedRoute = (isLoggedIn && window.RouteMemory) ? RouteMemory.load() : null;

  if (isLoggedIn) {
    if (window.App) {
      App.currentUser = savedUser;
      App.token = savedToken;
      // Affichage de la bannière démo si l'utilisateur est en mode démo
      if (App.isDemoMode()) {
        const demoBanner = document.getElementById('demo-banner');
        if (demoBanner) demoBanner.classList.remove('hidden');
      }
    }
    if (window.UI) UI.updateUserInfo();
    await restoreRoute(savedRoute);
  } else {
    if (window.Nav) Nav.go('auth');
  }

  // Étape 5 : Animation de sortie de l'écran de chargement (Splash Screen)
  await new Promise(resolve => setTimeout(resolve, 2200));
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(() => splash.classList.add('hidden'), 500);
  }
  const appContainer = document.getElementById('app');
  if (appContainer) appContainer.classList.remove('hidden');

  // Étape 6 : Chargement des données du tableau de bord et synchronisation en arrière-plan
  if (isLoggedIn) {
    if (window.Dashboard) {
      Dashboard.load().catch(err => console.error('[App] Erreur lors du chargement du Dashboard :', err));
    }
    if (window.Chat && typeof Chat.startBackgroundRefresh === 'function') {
      Chat.startBackgroundRefresh();
    }
  }

  // Étape 7 : Si l'utilisateur est arrivé via un lien d'invitation, ouverture automatique du formulaire
  if (pendingJoinCode && window.Nav && window.API) {
    Nav.go('join-tontine');
    const input = document.getElementById('join-code');
    if (input) input.value = pendingJoinCode;
    const res = await API.request('searchTontine', { code: pendingJoinCode });
    if (res.success) {
      const t = res.data;
      const setName = document.getElementById('preview-name');
      const setAmount = document.getElementById('preview-amount');
      const setMembers = document.getElementById('preview-members');
      const setAdmin = document.getElementById('preview-admin');
      const setStart = document.getElementById('preview-start');
      const setDesc = document.getElementById('preview-desc');
      const preview = document.getElementById('join-preview');

      if (setName) setName.textContent = t.name;
      if (setAmount && window.UI) setAmount.textContent = UI.formatAmount(t.amount);
      if (setMembers) setMembers.textContent = t.members;
      if (setAdmin) setAdmin.textContent = t.admin;
      if (setStart) setStart.textContent = t.start;
      if (setDesc) setDesc.textContent = t.desc || '';
      if (preview) preview.classList.remove('hidden');
    } else {
      if (window.Toast) Toast.show(res.message || 'Tontine introuvable. Vérifiez le code.', 'error');
    }
  }
}

// Fonction utilitaire pour basculer la visibilité d'un champ mot de passe
if (window.UI) {
  UI.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  };
}

// Démarrage de l'application dès que le DOM est complètement chargé
document.addEventListener('DOMContentLoaded', () => {
  try {
    init().catch(err => {
      console.error('[App] Erreur critique lors de l\'initialisation :', err);
      const splash = document.getElementById('splash-screen');
      if (splash) splash.style.display = 'none';
      const app = document.getElementById('app');
      if (app) app.classList.remove('hidden');
      if (window.Nav) Nav.go('auth');
    });
  } catch (e) {
    console.error('[App] Crash non intercepté :', e);
    const splash = document.getElementById('splash-screen');
    if (splash) splash.style.display = 'none';
    const app = document.getElementById('app');
    if (app) app.classList.remove('hidden');
    if (window.Nav) Nav.go('auth');
  }
});
