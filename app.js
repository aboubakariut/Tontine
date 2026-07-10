/* ══════════════════════════════════════════════════════════════════
   TONTINES FACILE — app.js
   Navigation, State Management, UI Logic, API Calls
   ══════════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════ APP STATE ═══════════════════════════════ */
const App = {
  /* Current state */
  currentPage: 'auth',
  currentUser: null,
  currentTontine: null,
  settings: {
    theme: 'emerald',
    fontSize: 'medium',
    notifications: { payment: true, requests: true, confirmed: true, audit: false },
    security: { pin: false, hideAmounts: false }
  },

  /* Demo data for offline/demo mode */
  demoData: {
    user: {
      id: 1, firstname: 'Kouamé', lastname: 'Adjoumani', email: 'k.adjoumani@gmail.com',
      phone: '+225 07 04 23 45 10', inviteCode: 'TF-KA2025',
      avatar: 'KA', role: 'Admin & Membre'
    },
    tontines: [
      {
        id: 1, name: 'Tontine Famille Adjoumani', description: 'Épargne collective mensuelle pour les projets familiaux. Chaque membre contribue 25 000 FCFA par mois.',
        amount: 25000, frequency: 'monthly', maxMembers: 12, currentMembers: 8,
        status: 'active', startDate: '2025-01-15', currentTour: 3, totalTours: 12,
        pot: 200000, userRole: 'admin', badge: 'badge-active', badgeText: 'Actif',
        nextPaymentDate: '2025-05-01', nextBeneficiary: 'Marie K.',
        inviteCode: 'TF-FAM001', publicLog: true, requireApproval: true,
        members: [
          { id: 1, name: 'Kouamé Adjoumani', initials: 'KA', role: 'Administrateur', paid: true, order: 5 },
          { id: 2, name: 'Marie Koffi', initials: 'MK', role: 'Membre', paid: true, order: 1 },
          { id: 3, name: 'Jean-Paul Brou', initials: 'JB', role: 'Membre', paid: false, order: 2 },
          { id: 4, name: 'Aminata Diallo', initials: 'AD', role: 'Membre', paid: true, order: 3 },
          { id: 5, name: 'Konan Yao', initials: 'KY', role: 'Membre', paid: false, order: 4 },
          { id: 6, name: 'Fatou Traoré', initials: 'FT', role: 'Membre', paid: true, order: 6 },
          { id: 7, name: 'Awa Coulibaly', initials: 'AC', role: 'Membre', paid: true, order: 7 },
          { id: 8, name: 'Didier Akpo', initials: 'DA', role: 'Membre', paid: false, order: 8 }
        ],
        log: [
          { type: 'payment', action: 'Paiement confirmé', detail: 'Marie Koffi a effectué sa mise de 25 000 FCFA', user: 'Marie K.', time: 'Il y a 2h', icon: '💰' },
          { type: 'payment', action: 'Paiement confirmé', detail: 'Aminata Diallo a effectué sa mise de 25 000 FCFA', user: 'A. Diallo', time: 'Il y a 5h', icon: '💰' },
          { type: 'admin', action: 'Rappel envoyé', detail: "L'admin a envoyé un rappel à Jean-Paul Brou et Konan Yao", user: 'Kouamé A.', time: 'Hier', icon: '📢' },
          { type: 'system', action: 'Tour 3 démarré', detail: 'Le tour 3 a démarré. Bénéficiaire : Marie Koffi', user: 'Système', time: 'Il y a 3 jours', icon: '🔄' },
          { type: 'member', action: 'Nouveau membre', detail: 'Awa Coulibaly a rejoint la tontine', user: 'Kouamé A.', time: 'Il y a 1 sem.', icon: '👤' }
        ]
      },
      {
        id: 2, name: 'Tontine Collègues SGBCI', description: 'Tontine des employés de la direction commerciale.',
        amount: 10000, frequency: 'biweekly', maxMembers: 6, currentMembers: 6,
        status: 'active', startDate: '2025-02-01', currentTour: 5, totalTours: 6,
        pot: 60000, userRole: 'member', badge: 'badge-active', badgeText: 'Actif',
        nextPaymentDate: '2025-04-28', nextBeneficiary: 'Kouamé A.',
        inviteCode: 'TF-SGC002', publicLog: true, requireApproval: false,
        members: [
          { id: 1, name: 'Kouamé Adjoumani', initials: 'KA', role: 'Membre', paid: true, order: 5 },
          { id: 2, name: 'Solange Boua', initials: 'SB', role: 'Administrateur', paid: true, order: 1 },
          { id: 3, name: 'Romuald Bah', initials: 'RB', role: 'Membre', paid: true, order: 2 },
          { id: 4, name: 'Mariam Touré', initials: 'MT', role: 'Membre', paid: true, order: 3 },
          { id: 5, name: 'Yves Gnagnon', initials: 'YG', role: 'Membre', paid: false, order: 4 },
          { id: 6, name: 'Estelle Kouame', initials: 'EK', role: 'Membre', paid: true, order: 6 }
        ],
        log: [
          { type: 'payment', action: 'Paiement reçu', detail: 'Kouamé Adjoumani — 10 000 FCFA', user: 'Kouamé A.', time: 'Aujourd\'hui', icon: '✅' },
          { type: 'admin', action: 'Ordre des tours modifié', detail: 'L\'administrateur a réorganisé l\'ordre des bénéficiaires', user: 'Solange B.', time: 'Il y a 2 jours', icon: '🔀' }
        ]
      }
    ],
    transactions: [
      { id: 1, type: 'out', name: 'Mise mensuelle', tontine: 'Tontine Famille Adjoumani', amount: 25000, date: '2025-04-15', status: 'paid' },
      { id: 2, type: 'in', name: 'Cagnotte reçue', tontine: 'Tontine Collègues SGBCI', amount: 60000, date: '2025-03-20', status: 'received' },
      { id: 3, type: 'out', name: 'Mise bi-mensuelle', tontine: 'Tontine Collègues SGBCI', amount: 10000, date: '2025-04-14', status: 'paid' },
      { id: 4, type: 'out', name: 'Mise mensuelle', tontine: 'Tontine Famille Adjoumani', amount: 25000, date: '2025-03-15', status: 'paid' },
      { id: 5, type: 'out', name: 'Mise bi-mensuelle', tontine: 'Tontine Collègues SGBCI', amount: 10000, date: '2025-03-28', status: 'pending' }
    ],
    globalLog: [
      { type: 'payment', action: 'Paiement confirmé', detail: 'Tontine Famille — Marie Koffi, 25 000 FCFA', user: 'Marie K.', time: 'Il y a 2h' },
      { type: 'admin', action: 'Rappel de paiement', detail: 'Tontine Famille — Rappel envoyé à 2 membres', user: 'Kouamé A.', time: 'Il y a 5h' },
      { type: 'member', action: 'Demande acceptée', detail: 'Awa Coulibaly a rejoint Tontine Famille', user: 'Kouamé A.', time: 'Hier' },
      { type: 'payment', action: 'Cagnotte versée', detail: 'Tour 2 — 200 000 FCFA versés à Jean-Paul Brou', user: 'Système', time: 'Il y a 3 jours' },
      { type: 'system', action: 'Tour lancé', detail: 'Tontine Famille — Tour 3 démarré', user: 'Système', time: 'Il y a 3 jours' },
      { type: 'admin', action: 'Pénalité appliquée', detail: 'Konan Yao — Retard de 3 jours, pénalité 500 FCFA', user: 'Kouamé A.', time: 'Il y a 5 jours' }
    ],
    invitations: [
      { id: 1, tontine: 'Tontine Amis Université', from: 'Dr. Akou Mensah', amount: 15000, freq: 'Mensuel', code: 'TF-UNIV3' }
    ]
  }
};

/* ═══════════════════════════════ API HANDLER ═══════════════════════════════ */
const API = {
  base: '/api/api.php',
  _pending: 0,
  _hideTimer: null,

  _showLoadingBar() {
    this._pending++;
    if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }
    const bar = document.getElementById('global-loading-bar');
    if (bar) bar.classList.add('active');
  },
  _hideLoadingBar() {
    this._pending = Math.max(0, this._pending - 1);
    if (this._pending > 0) return;
    /* Petit délai pour éviter un clignotement si une autre requête démarre juste après */
    this._hideTimer = setTimeout(() => {
      if (this._pending === 0) document.getElementById('global-loading-bar')?.classList.remove('active');
    }, 150);
  },

  async request(action, data = {}) {
    this._showLoadingBar();
    try {
      const res = await fetch(this.base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data, token: App.token })
      });
      return await res.json();
    } catch {
      /* Fallback to demo data when PHP not available */
      return this.demoFallback(action, data);
    } finally {
      this._hideLoadingBar();
    }
  },

  demoFallback(action, data) {
    /* Mode démo uniquement si token démo explicite */
    const isDemo = App.token === 'demo-token-123';

    switch (action) {
      case 'demo':
        return { success: true, user: App.demoData.user, token: 'demo-token-123' };
      case 'login':
        return { success: false, message: 'Serveur inaccessible. Vérifiez votre connexion.' };
      case 'register':
        return { success: false, message: 'Serveur inaccessible. Vérifiez votre connexion.' };
      case 'getTontines':
        return isDemo
          ? { success: true, data: App.demoData.tontines }
          : { success: true, data: [] };
      case 'getTransactions':
        return isDemo
          ? { success: true, data: App.demoData.transactions }
          : { success: true, data: [] };
      case 'getGlobalLog':
        return isDemo
          ? { success: true, data: App.demoData.globalLog }
          : { success: true, data: [] };
      case 'getInvitations':
        return isDemo
          ? { success: true, data: App.demoData.invitations }
          : { success: true, data: [] };
      case 'searchTontine':
        return { success: false, message: 'Serveur inaccessible.' };
      case 'createTontine':
        return { success: false, message: 'Serveur inaccessible.' };
      case 'joinTontine':
        return { success: false, message: 'Serveur inaccessible.' };
      case 'recordPayment':
        return { success: false, message: 'Serveur inaccessible.' };
      case 'sendInvite':
        return { success: false, message: 'Serveur inaccessible.' };
      case 'updateProfile':
        return { success: false, message: 'Serveur inaccessible.' };
      default:
        return { success: false, message: 'Serveur inaccessible.' };
    }
  }
};

/* ═══════════════════════════════ NAVIGATION ═══════════════════════════════ */
/* ═══════════════════════════════ NAVIGATION ═══════════════════════════════ */
const Nav = {
  history: [],

  go(page, title = '') {
    /* Stoppe le rafraîchissement automatique des messages si on quitte le fil de discussion */
    if (page !== 'chat-thread' && typeof Chat !== 'undefined') Chat.stopPolling();

    /* Hide all pages */
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById(`page-${page}`);
    if (!pageEl) return;
    pageEl.classList.add('active');

    /* Update active nav item */
    const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navBtn) navBtn.classList.add('active');

    /* Topbar mode */
    const isRoot = ['dashboard', 'my-tontines', 'create-tontine', 'join-tontine', 'profile', 'settings', 'auth'].includes(page);
    const topbarLogo = document.getElementById('topbar-logo');
    const topbarTitle = document.getElementById('topbar-title');
    const btnBack = document.getElementById('btn-back');
    const topbar = document.getElementById('topbar');
    const bottomNav = document.getElementById('bottom-nav');

    if (page === 'auth') {
      topbar.style.display = 'none';
      bottomNav.style.display = 'none';
    } else if (page === 'chat-thread') {
      /* Mode plein écran : on masque la navbar du bas pour laisser toute
         la place au fil de discussion + la zone de saisie fixe */
      topbar.style.display = 'flex';
      bottomNav.style.display = 'none';
      document.getElementById('app').classList.add('chat-open');
    } else {
      topbar.style.display = 'flex';
      bottomNav.style.display = 'flex';
      document.getElementById('app').classList.remove('chat-open');
    }

    if (isRoot && page !== 'auth') {
      topbarLogo.classList.remove('hidden');
      topbarTitle.classList.add('hidden');
      btnBack.style.display = 'none';
    } else if (page !== 'auth') {
      topbarLogo.classList.add('hidden');
      topbarTitle.classList.remove('hidden');
      topbarTitle.textContent = title;
      btnBack.style.display = 'flex';
      if (App.currentPage !== page) this.history.push(App.currentPage);
    }

    App.currentPage = page;
    window.scrollTo(0, 0);
    this.closeMenu();

    /* Mémorise la page courante pour la restaurer après un F5 (voir RouteMemory) */
    if (page !== 'auth') RouteMemory.save(page, title);
  },

  back() {
    const prev = this.history.pop();
    if (prev) this.go(prev);
    else this.go('dashboard');
  },

  closeMenu() {
    document.getElementById('dropdown-menu').classList.add('hidden');
    document.getElementById('dropdown-overlay').classList.add('hidden');
  }
};

/* ═══════════════════════════════ AUTH ═══════════════════════════════ */
const Auth = {
  init() {
    /* Tab switching */
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`form-${tab.dataset.tab}`).classList.add('active');
      });
    });

    /* Login */
    document.getElementById('btn-login').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const pass  = document.getElementById('login-password').value;
      if (!email || !pass) { Toast.show('Veuillez remplir tous les champs', 'error'); return; }
      UI.setLoading('btn-login', true, 'Connexion...');
      const res = await API.request('login', { email, password: pass });
      UI.setLoading('btn-login', false, 'Se connecter');
      if (res.success) { Auth.onLogin(res); } else { Toast.show(res.message || 'Identifiants incorrects', 'error'); }
    });

    /* Register */
    document.getElementById('btn-register').addEventListener('click', async () => {
      const firstname = document.getElementById('reg-firstname').value.trim();
      const lastname  = document.getElementById('reg-lastname').value.trim();
      const email     = document.getElementById('reg-email').value.trim();
      const phone     = document.getElementById('reg-phone').value.trim();
      const password  = document.getElementById('reg-password').value;
      if (!firstname || !lastname || !email || !password) { Toast.show('Veuillez remplir les champs obligatoires', 'error'); return; }
      if (password.length < 8) { Toast.show('Le mot de passe doit contenir au moins 8 caractères', 'error'); return; }
      UI.setLoading('btn-register', true, 'Création...');
      const res = await API.request('register', { firstname, lastname, email, phone, password });
      UI.setLoading('btn-register', false, 'Créer mon compte');
      if (res.success) { Auth.onLogin(res); } else { Toast.show(res.message || 'Erreur lors de l\'inscription', 'error'); }
    });

    /* Demo */
    document.getElementById('btn-demo').addEventListener('click', async () => {
      UI.setLoading('btn-demo', true, 'Chargement...');
      const res = await API.request('demo');
      UI.setLoading('btn-demo', false, 'Essayer en démo');
      if (res.success) { Auth.onLogin(res); }
    });

    /* Password strength meter */
    document.getElementById('reg-password').addEventListener('input', (e) => {
      const v = e.target.value;
      let level = 0;
      if (v.length >= 8) level++;
      if (/[A-Z]/.test(v)) level++;
      if (/[0-9]/.test(v)) level++;
      if (/[^A-Za-z0-9]/.test(v)) level++;
      const bar = document.getElementById('password-strength');
      bar.dataset.level = level;
    });

    /* Eye toggle */
    document.querySelectorAll('.btn-eye').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    });
  },

  onLogin(res) {
    /* Effacer toute ancienne session avant d'en démarrer une nouvelle */
    Storage.remove('user');
    Storage.remove('token');
    RouteMemory.clear();
    App.currentUser = null;

    /* Le serveur renvoie { success, data: { user, token }, message } */
    const user  = res.data?.user  ?? res.user;
    const token = res.data?.token ?? res.token;

    App.currentUser = user;
    App.token = token;
    Storage.save('user', user);
    Storage.save('token', token);

    /* Petit délai pour s'assurer que le DOM est prêt */
    setTimeout(() => {
      UI.updateUserInfo();
    }, 100);

    Dashboard.load();
    Chat.startBackgroundRefresh();
    Nav.go('dashboard');
    Toast.show(`Bienvenue, ${user?.firstname || user?.email || ''} ! 👋`, 'success');
  },
  logout() {
    if (!window.confirm('Se déconnecter de Tontines Facile ?')) return;
    App.currentUser = null;
    App.token = null;
    Storage.remove('user');
    Storage.remove('token');
    RouteMemory.clear();
    Nav.history = [];
    /* Forcer le rechargement complet pour nettoyer l'état */
    window.location.href = '/';
  }
};

/* ═══════════════════════════════ DASHBOARD ═══════════════════════════════ */
const Dashboard = {
  async load() {
    /* Skeleton pendant le chargement — évite l'écran vide/figé le temps du fetch */
    const listEl = document.getElementById('dashboard-tontines-list');
    const actElInit = document.getElementById('dashboard-activity-list');
    const myTontinesListEl = document.getElementById('my-tontines-list');
    const statIds = ['stat-active', 'stat-savings', 'stat-next', 'stat-members'];
    statIds.forEach(id => document.getElementById(id)?.classList.add('text-skeleton'));
    if (listEl) listEl.innerHTML = UI.skeletonCards(2);
    if (actElInit) actElInit.innerHTML = UI.skeletonRows(3);
    if (myTontinesListEl && !MyTontines.data.length) myTontinesListEl.innerHTML = UI.skeletonCards(3);

    const res = await API.request('getTontines');
    if (!res.success) { statIds.forEach(id => document.getElementById(id)?.classList.remove('text-skeleton')); return; }
    const tontines = res.data;

    /* Stats */
    const active = tontines.filter(t => t.status === 'active').length;
    const savings = tontines.reduce((sum, t) => sum + (t.amount || 0), 0);
    const members = tontines.reduce((sum, t) => sum + (t.currentMembers || 0), 0);
    const nextDate = tontines[0]?.nextPaymentDate || '—';

    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-savings').textContent = UI.formatAmount(savings);
    document.getElementById('stat-next').textContent = nextDate;
    document.getElementById('stat-members').textContent = members;
    statIds.forEach(id => document.getElementById(id)?.classList.remove('text-skeleton'));

    /* Tontines list (max 3) */
    const list = document.getElementById('dashboard-tontines-list');
    list.innerHTML = '';
    if (!tontines.length) {
      list.innerHTML = UI.emptyState('Aucune tontine', 'create-tontine', 'Créer une tontine');
      return;
    }
    tontines.slice(0, 3).forEach(t => list.appendChild(UI.tontineCard(t)));

    /* Recent activity */
    const logRes = await API.request('getGlobalLog');
    const actEl = document.getElementById('dashboard-activity-list');
    actEl.innerHTML = '';
    if (logRes.success && logRes.data.length) {
      logRes.data.slice(0, 4).forEach(entry => actEl.appendChild(UI.activityItem(entry)));
    } else {
      actEl.innerHTML = '<div class="empty-state small"><p>Aucune activité récente</p></div>';
    }

    /* My Tontines list */
    MyTontines.render(tontines);
  }
};

/* ═══════════════════════════════ MY TONTINES ═══════════════════════════════ */
const MyTontines = {
  data: [],

  render(tontines) {
    this.data = tontines;
    const list = document.getElementById('my-tontines-list');
    list.innerHTML = '';
    if (!tontines.length) {
      list.innerHTML = UI.emptyState('Vous n\'avez pas encore de tontines', 'create-tontine', 'Créer ma première tontine');
      return;
    }
    tontines.forEach(t => list.appendChild(UI.tontineCard(t)));

    /* Filter chips */
    document.querySelectorAll('#page-my-tontines .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#page-my-tontines .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;
        const filtered = filter === 'all' ? tontines :
          filter === 'admin' ? tontines.filter(t => t.userRole === 'admin') :
          filter === 'member' ? tontines.filter(t => t.userRole === 'member') :
          tontines.filter(t => t.status === 'pending');
        list.innerHTML = '';
        filtered.forEach(t => list.appendChild(UI.tontineCard(t)));
      });
    });

    /* Search */
    document.getElementById('search-tontines').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = tontines.filter(t => t.name.toLowerCase().includes(q));
      list.innerHTML = '';
      filtered.forEach(t => list.appendChild(UI.tontineCard(t)));
    });
  }
};

/* ═══════════════════════════════ TONTINE DETAIL ═══════════════════════════════ */
const TontineDetail = {
  open(tontine) {
    App.currentTontine = tontine;
    Nav.go('tontine-detail', tontine.name);
    RouteMemory.save('tontine-detail', tontine.name, { tontineId: tontine.id });
    this.render(tontine);
  },

  /* Ouvre une tontine à partir de son seul ID (ex: depuis une notification) */
  async openById(tontineId, focusPendingRequests = false) {
    const res = await API.request('getTontine', { tontineId });
    if (!res.success) { Toast.show(res.message || 'Tontine introuvable', 'error'); return; }
    this.open(res.data);
    if (focusPendingRequests && res.data.userRole === 'admin') {
      this.loadPendingRequests(tontineId);
    }
  },

  /* Recharge les données et ré-affiche la page SANS empiler l'historique
     de navigation — à utiliser après une action effectuée depuis la page
     de détail elle-même (paiement, rôle, membre...), jamais pour y entrer. */
  async refresh(tontineId) {
    const res = await API.request('getTontine', { tontineId });
    if (!res.success) { Toast.show(res.message || 'Tontine introuvable', 'error'); return; }
    App.currentTontine = res.data;
    this.render(res.data);
  },

  async loadPendingRequests(tontineId) {
    const card = document.getElementById('detail-pending-requests-card');
    const list = document.getElementById('detail-pending-requests-list');
    if (!card || !list) return;
    list.innerHTML = UI.skeletonRows(2);
    card.style.display = 'block';
    const res = await API.request('getPendingMembers', { tontineId });
    if (!res.success || !res.data.length) { card.style.display = 'none'; return; }
    list.innerHTML = '';
    res.data.forEach(m => {
      const div = document.createElement('div');
      div.className = 'member-item';
      div.innerHTML = `
        <div class="avatar-sm">${m.initials || m.name.slice(0,2).toUpperCase()}</div>
        <div class="member-info">
          <p class="member-name">${m.name}</p>
          <p class="member-role">Demande du ${m.requested_at}</p>
        </div>
        <div class="contact-item-actions">
          <button class="btn-icon" title="Accepter" style="color:var(--color-primary)" onclick="TontineDetail.respondPending(${tontineId},${m.id},'approve')">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </button>
          <button class="btn-icon" title="Refuser" style="color:var(--color-red)" onclick="TontineDetail.respondPending(${tontineId},${m.id},'reject')">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      `;
      list.appendChild(div);
    });
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  async respondPending(tontineId, memberId, action) {
    const res = await API.request('approveMember', { tontineId, memberId, action });
    if (res.success) {
      Toast.show(action === 'approve' ? 'Membre accepté !' : 'Demande refusée', 'success');
      this.loadPendingRequests(tontineId);
      this.refresh(tontineId); /* rafraîchit le nombre de membres affiché */
    } else {
      Toast.show(res.message || 'Erreur', 'error');
    }
  },

  render(t) {
    /* Header */
    document.getElementById('detail-name').textContent = t.name;
    document.getElementById('detail-desc').textContent = t.description || '';
    document.getElementById('detail-amount').textContent = UI.formatAmount(t.amount);
    document.getElementById('detail-freq').textContent = UI.freqLabel(t.frequency);
    document.getElementById('detail-members-count').textContent = `${t.currentMembers}/${t.maxMembers}`;
    document.getElementById('detail-pot').textContent = UI.formatAmount(t.pot || 0);

    const badge = document.getElementById('detail-badge');
    badge.className = `badge ${t.badge}`;
    badge.textContent = t.badgeText;

    /* Admin actions */
    const adminActions = document.getElementById('detail-admin-actions');
    if (t.userRole === 'admin') {
      adminActions.innerHTML = `
        <button class="btn-icon" title="Paramètres de la tontine" onclick="TontineDetail.openSettings()">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
        </button>`;
    } else { adminActions.innerHTML = ''; }

    /* Overview tab */
    const progress = t.totalTours ? (t.currentTour / t.totalTours) * 100 : 0;
    document.getElementById('detail-tour').textContent = `Tour ${t.currentTour}/${t.totalTours}`;
    document.getElementById('detail-progress').style.width = `${progress}%`;
    document.getElementById('detail-next-date').textContent = t.nextPaymentDate || '—';
    document.getElementById('detail-next-amount').textContent = UI.formatAmount(t.amount);
    document.getElementById('bc-name').textContent = t.nextBeneficiary || '—';
    const bcA = document.getElementById('bc-avatar');
    bcA.textContent = (t.nextBeneficiary || '').split(' ').map(w => w[0]).join('').slice(0,2);

    /* Members tab */
    const membersList = document.getElementById('detail-members-list');
    membersList.innerHTML = '';
    (t.members || []).forEach(m => {
      const div = document.createElement('div');
      div.className = 'member-item';
      const photo = m.avatar_photo || m.avatarPhoto;
      const avatarClass = photo ? 'avatar-sm has-photo' : 'avatar-sm';
      const avatarStyle = photo ? ` style="background-image:url('${photo}')"` : '';
      const isSelf = String(m.id) === String(App.currentUser?.id);
      const isAdminViewer = t.userRole === 'admin';

      /* Statut de paiement */
      let statusHtml;
      if (m.paid) statusHtml = `<span class="member-status member-paid">✓ Payé</span>`;
      else if (m.paymentPending) statusHtml = `<span class="member-status member-review">🕒 À valider</span>`;
      else statusHtml = `<span class="member-status member-pending">⏳ En attente</span>`;

      /* Bouton de paiement (le membre lui-même, uniquement si rien n'est en cours) */
      const payBtn = (isSelf && !m.paid && !m.paymentPending)
        ? `<button class="btn-icon" style="color:var(--color-primary)" title="Payer via Mobile Money" onclick="TontineDetail.payMobileMoney(${t.id})"><svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="11" y1="18" x2="13" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`
        : '';

      /* Actions admin sur le paiement : valider directement, ou approuver/refuser une déclaration */
      let paymentAdminBtns = '';
      if (isAdminViewer && !m.paid) {
        if (m.paymentPending) {
          paymentAdminBtns = `
            <button class="btn-icon" title="Confirmer la réception" style="color:var(--color-primary)" onclick="TontineDetail.recordPayment(${m.id},'${m.name}')"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></button>
            <button class="btn-icon" title="Refuser (introuvable)" style="color:var(--color-red)" onclick="TontineDetail.rejectPayment(${m.id},'${m.name}')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`;
        } else {
          paymentAdminBtns = `<button class="btn-icon" title="Confirmer le paiement" style="color:var(--color-primary)" onclick="TontineDetail.recordPayment(${m.id},'${m.name}')"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></button>`;
        }
      }

      /* Gestion du membre : nommer/retirer admin, retirer de la tontine (jamais sur soi-même) */
      let manageBtns = '';
      if (isAdminViewer && !isSelf) {
        manageBtns = m.role === 'admin'
          ? `<button class="btn-icon" title="Retirer les droits admin" onclick="TontineDetail.updateMemberRole(${m.id},'member','${m.name}')"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/></svg></button>`
          : `<button class="btn-icon" title="Nommer administrateur" onclick="TontineDetail.updateMemberRole(${m.id},'admin','${m.name}')"><svg viewBox="0 0 24 24"><path d="M12 2l2.4 6.9H22l-6 4.6 2.4 7-6.4-4.6L5.6 20.5l2.4-7-6-4.6h7.6z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/></svg></button>`;
        manageBtns += `<button class="btn-icon" title="Retirer de la tontine" style="color:var(--color-red)" onclick="TontineDetail.removeMember(${m.id},'${m.name}')"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button>`;
      }

      div.innerHTML = `
        <div class="${avatarClass}"${avatarStyle}>${photo ? '' : (m.initials || m.name.slice(0,2).toUpperCase())}</div>
        <div class="member-info">
          <p class="member-name">${m.name}${m.role === 'admin' ? ' <span class="admin-tag">Admin</span>' : ''}</p>
          <p class="member-role">Tour #${m.tour_order ?? m.order ?? '—'}</p>
        </div>
        ${statusHtml}
        ${payBtn}
        ${paymentAdminBtns}
        ${manageBtns}
      `;
      membersList.appendChild(div);
    });

    /* Payment matrix */
    this.renderMatrix(t);

    /* Log tab */
    const logList = document.getElementById('detail-log-list');
    logList.innerHTML = '';
    (t.log || []).forEach(entry => {
      const div = document.createElement('div');
      div.className = `log-item ${entry.type}`;
      div.innerHTML = `
        <p class="log-action">${entry.action}</p>
        <p class="log-detail">${entry.detail}</p>
        <div class="log-meta"><span class="log-user">@${entry.user}</span><span class="log-time">${entry.time}</span></div>
      `;
      logList.appendChild(div);
    });

    if (!t.log?.length) logList.innerHTML = '<div class="empty-state small"><p>Aucune entrée dans le journal</p></div>';

    /* Tab switching */
    document.querySelectorAll('#page-tontine-detail .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#page-tontine-detail .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#page-tontine-detail .tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      });
    });

    /* Invite button — navigue directement vers la page invite avec le code
       de CETTE tontine déjà récupéré et affiché, sans que l'utilisateur
       ait besoin de la sélectionner à nouveau dans la liste */
    document.getElementById('btn-invite-member').onclick = () => {
      Nav.go('invite', 'Inviter');
      Invite.preselect(t);
    };

    /* Reset to first tab */
    document.querySelector('#page-tontine-detail .tab')?.click();
  },

  renderMatrix(t) {
    const matrix = document.getElementById('detail-payment-matrix');
    if (!t.members?.length) { matrix.innerHTML = ''; return; }
    const tours = Math.min(t.currentTour + 1, 6); // show current + next
    let html = '<table><thead><tr><th>Membre</th>';
    for (let i = 1; i <= tours; i++) html += `<th>T${i}</th>`;
    html += '</tr></thead><tbody>';
    t.members.forEach(m => {
      html += `<tr><td class="pm-name" title="${m.name}">${m.name.split(' ')[0]}</td>`;
      for (let i = 1; i <= tours; i++) {
        const paid = i < t.currentTour ? '✅' : (i === t.currentTour && m.paid ? '✅' : (i === t.currentTour ? '⏳' : '—'));
        html += `<td class="pm-cell">${paid}</td>`;
      }
      html += '</tr>';
    });
    html += '</tbody></table>';
    matrix.innerHTML = html;
  },

  async recordPayment(memberId, memberName) {
    const confirmed = await Modal.confirm(`Confirmer le paiement de ${memberName} ?`, `Cette action sera enregistrée dans le journal de la tontine et visible par tous les membres.`, 'Confirmer le paiement');
    if (!confirmed) return;
    const res = await API.request('recordPayment', { tontineId: App.currentTontine.id, memberId });
    if (res.success) {
      Toast.show(`Paiement de ${memberName} enregistré`, 'success');
      /* Update local state */
      const member = App.currentTontine.members.find(m => m.id === memberId);
      if (member) member.paid = true;
      this.render(App.currentTontine);
    }
  },

  /* Affiche comment payer directement l'admin (numéro Mobile Money personnel),
     puis laisse le membre déclarer son paiement — l'app ne touche jamais l'argent. */
  payMobileMoney(tontineId) {
    const t = App.currentTontine;
    if (!t.momoNumber || !t.momoOperator) {
      Toast.show("L'administrateur n'a pas encore renseigné de numéro Mobile Money pour cette tontine.", 'warning');
      return;
    }
    const opLabel = t.momoOperator === 'orange' ? 'Orange Money' : 'MTN Mobile Money';
    const ussdCode = t.momoOperator === 'orange' ? '#150#' : '*126#';
    const dialHref = `tel:${encodeURIComponent(ussdCode)}`;
    const formattedNumber = t.momoNumber.replace(/(\d{3})(?=\d)/g, '$1 ').trim();

    Modal.open(`Payer via ${opLabel}`, `
      <div class="form-group">
        <p style="font-size:var(--fs-sm);color:var(--color-text-2);margin-bottom:12px">
          Cette tontine ne passe par aucun intermédiaire : votre cotisation part directement de votre téléphone vers celui de l'administrateur.
        </p>
        <label class="form-label">1. Numéro à créditer</label>
        <div class="invite-code-box">
          <span>${formattedNumber}</span>
          <button class="btn-icon" onclick="UI.copyText('${t.momoNumber}')">
            <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" fill="none"/></svg>
          </button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">2. Montant à envoyer</label>
        <p style="font-size:var(--fs-lg);font-weight:700;color:var(--color-primary)">${UI.formatAmount(t.amount)}</p>
      </div>
      <div class="form-group">
        <label class="form-label">3. Composez le code ${opLabel}</label>
        <a href="${dialHref}" class="btn-primary btn-full" style="text-decoration:none;display:block;text-align:center;margin-top:6px">📞 Composer ${ussdCode}</a>
        <p style="font-size:var(--fs-xs);color:var(--color-text-3);margin-top:6px">
          Choisissez "Transfert d'argent", entrez le numéro et le montant ci-dessus, puis validez avec votre code secret.
        </p>
      </div>
      <div class="form-group">
        <button class="btn-secondary btn-full" id="btn-confirm-momo-paid">✓ J'ai envoyé le paiement</button>
        <p style="font-size:var(--fs-xs);color:var(--color-text-3);margin-top:6px;text-align:center">
          L'administrateur devra confirmer la réception avant que votre cotisation soit validée.
        </p>
      </div>
    `);

    document.getElementById('btn-confirm-momo-paid').addEventListener('click', async () => {
      Modal.close();
      const res = await API.request('declarePayment', { tontineId: t.id });
      if (res.success) {
        Toast.show(res.message || 'Déclaration envoyée !', 'success');
        this.refresh(t.id);
      } else {
        Toast.show(res.message || 'Erreur', 'error');
      }
    });
  },

  async rejectPayment(memberId, memberName) {
    const confirmed = await Modal.confirm(
      `Refuser la déclaration de ${memberName} ?`,
      "À utiliser si vous n'avez pas retrouvé ce paiement sur votre compte Mobile Money. Le membre pourra redéclarer.",
      'Refuser'
    );
    if (!confirmed) return;
    const res = await API.request('rejectPayment', { tontineId: App.currentTontine.id, memberId });
    if (res.success) {
      Toast.show('Déclaration refusée.', 'success');
      this.refresh(App.currentTontine.id);
    } else {
      Toast.show(res.message || 'Erreur', 'error');
    }
  },

  async updateMemberRole(memberId, role, memberName) {
    const label = role === 'admin' ? 'nommer administrateur' : 'retirer les droits admin de';
    const confirmed = await Modal.confirm(`Confirmer : ${label} ${memberName} ?`, '', 'Confirmer');
    if (!confirmed) return;
    const res = await API.request('updateMemberRole', { tontineId: App.currentTontine.id, memberId, role });
    if (res.success) {
      Toast.show(res.message || 'Rôle mis à jour.', 'success');
      this.refresh(App.currentTontine.id);
    } else {
      Toast.show(res.message || 'Erreur', 'error');
    }
  },

  async removeMember(memberId, memberName) {
    const confirmed = await Modal.confirm(
      `Retirer ${memberName} de la tontine ?`,
      'Cette personne perdra immédiatement l\'accès à cette tontine. Cette action est irréversible.',
      'Retirer'
    );
    if (!confirmed) return;
    const res = await API.request('removeMember', { tontineId: App.currentTontine.id, memberId });
    if (res.success) {
      Toast.show(res.message || 'Membre retiré.', 'success');
      this.refresh(App.currentTontine.id);
    } else {
      Toast.show(res.message || 'Erreur', 'error');
    }
  },

  async openSettings() {
    const t = App.currentTontine;
    Modal.open('Paramètres de la tontine', `
      <div class="form-group">
        <label class="form-label">Nom de la tontine</label>
        <input type="text" class="form-input" id="edit-tontine-name" value="${(t.name || '').replace(/"/g, '&quot;')}" maxlength="60" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-input" id="edit-tontine-desc" rows="2" maxlength="200">${t.description || ''}</textarea>
        <button class="btn-secondary btn-full mt" id="btn-save-tontine-info">Enregistrer les modifications</button>
      </div>
      <div class="form-group">
        <label class="form-label">Code d'invitation</label>
        <div class="invite-code-box">
          <span>${t.inviteCode || t.invite_code || '—'}</span>
          <button class="btn-icon" onclick="UI.copyText('${t.inviteCode || t.invite_code}')">
            <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" fill="none"/></svg>
          </button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Statut de la tontine</label>
        <p style="font-size:var(--fs-xs);color:var(--color-text-3);margin-bottom:8px">
          Statut actuel : <strong>${t.status || t.badgeText || 'Actif'}</strong>
        </p>
      </div>
      <div class="form-group">
        <label class="form-label">Numéro Mobile Money (pour recevoir les cotisations)</label>
        <p style="font-size:var(--fs-xs);color:var(--color-text-3);margin-bottom:8px">
          Ce numéro sera affiché aux membres pour qu'ils vous envoient directement leur cotisation. Tontines Facile ne détient jamais cet argent.
        </p>
        <select class="form-input" id="momo-operator" style="margin-bottom:8px">
          <option value="mtn" ${t.momoOperator === 'mtn' || !t.momoOperator ? 'selected' : ''}>MTN Mobile Money</option>
          <option value="orange" ${t.momoOperator === 'orange' ? 'selected' : ''}>Orange Money</option>
        </select>
        <input type="tel" class="form-input" id="momo-number" placeholder="6XXXXXXXX" value="${t.momoNumber || ''}" maxlength="9" />
        <button class="btn-secondary btn-full mt" id="btn-save-momo">Enregistrer le numéro</button>
      </div>
      <div class="form-group">
        <label class="form-label" style="color:var(--color-red)">Zone de danger</label>
        <p style="font-size:var(--fs-xs);color:var(--color-text-3);margin-bottom:8px">
          ⚠️ Fermer une tontine est irréversible. Tous les membres seront notifiés.
        </p>
        <button class="btn-danger btn-full" id="btn-close-tontine">🔒 Fermer définitivement la tontine</button>
      </div>
    `);

    document.getElementById('btn-save-tontine-info')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const name = document.getElementById('edit-tontine-name').value.trim();
      const description = document.getElementById('edit-tontine-desc').value.trim();
      if (!name) { Toast.show('Le nom ne peut pas être vide.', 'error'); return; }
      if (btn.disabled) return;
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Enregistrement...';
      try {
        const res = await API.request('updateTontine', { tontineId: t.id, name, description });
        if (res.success) {
          Toast.show('Tontine mise à jour !', 'success');
          Modal.close();
          this.refresh(t.id);
        } else {
          Toast.show(res.message || 'Erreur', 'error');
        }
      } catch (err) {
        Toast.show('Erreur réseau, réessayez.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });

    document.getElementById('btn-save-momo')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      if (btn.disabled) return;
      const momoOperator = document.getElementById('momo-operator').value;
      const momoNumber = document.getElementById('momo-number').value.trim();
      if (!/^6\d{8}$/.test(momoNumber)) {
        Toast.show('Numéro invalide (9 chiffres, commence par 6).', 'error');
        return;
      }
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Enregistrement...';
      try {
        const res = await API.request('updateTontineMomo', { tontineId: t.id, momoOperator, momoNumber });
        if (res.success) {
          Toast.show('Numéro Mobile Money enregistré !', 'success');
          t.momoOperator = res.data.momoOperator;
          t.momoNumber = res.data.momoNumber;
          Modal.close();
        } else {
          Toast.show(res.message || 'Erreur', 'error');
        }
      } catch (err) {
        Toast.show('Erreur réseau, réessayez.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });

    document.getElementById('btn-close-tontine')?.addEventListener('click', async () => {
      if (!confirm('Êtes-vous sûr de vouloir fermer cette tontine ? Cette action est irréversible.')) return;
      const res = await API.request('closeTontine', { tontineId: t.id });
      if (res.success) {
        Toast.show('Tontine fermée avec succès.', 'success');
        Modal.close();
        await Dashboard.load();
        Nav.go('my-tontines');
      } else {
        Toast.show(res.message || 'Erreur', 'error');
      }
    });
  }
};

/* ═══════════════════════════════ CREATE TONTINE ═══════════════════════════════ */
const CreateTontine = {
  init() {
    /* Set default date to today */
    const dateInput = document.getElementById('create-start-date');
    dateInput.valueAsDate = new Date();

    document.getElementById('btn-create-tontine').addEventListener('click', async () => {
      const name = document.getElementById('create-name').value.trim();
      const desc = document.getElementById('create-desc').value.trim();
      const amount = parseInt(document.getElementById('create-amount').value);
      const frequency = document.getElementById('create-frequency').value;
      const maxMembers = parseInt(document.getElementById('create-max-members').value) || 10;
      const startDate = document.getElementById('create-start-date').value;

      if (!name) { Toast.show('Le nom de la tontine est obligatoire', 'error'); return; }
      if (!amount || amount < 1000) { Toast.show('Le montant minimum est de 1 000 FCFA', 'error'); return; }

      UI.setLoading('btn-create-tontine', true, 'Création en cours...');
      const res = await API.request('createTontine', {
        name, description: desc, amount, frequency, maxMembers, startDate,
        requireApproval: document.getElementById('create-approval').checked,
        publicLog: document.getElementById('create-public-log').checked,
        randomOrder: document.getElementById('create-random-order').checked,
        penalties: document.getElementById('create-penalties').checked
      });
      UI.setLoading('btn-create-tontine', false, 'Créer la tontine');

      if (res.success) {
        Toast.show(`✨ Tontine "${name}" créée avec succès !`, 'success');
        /* Reset form */
        document.getElementById('create-name').value = '';
        document.getElementById('create-desc').value = '';
        document.getElementById('create-amount').value = '';
        /* Reload dashboard & open detail */
        Dashboard.load();
        setTimeout(() => TontineDetail.open(res.data), 500);
      } else {
        Toast.show(res.message || 'Erreur lors de la création', 'error');
      }
    });
  }
};

/* ═══════════════════════════════ JOIN TONTINE ═══════════════════════════════ */
const JoinTontine = {
  init() {
    document.getElementById('btn-join-search').addEventListener('click', async () => {
      const code = document.getElementById('join-code').value.trim().toUpperCase();
      if (!code || code.length < 4) { Toast.show('Entrez un code valide', 'error'); return; }
      UI.setLoading('btn-join-search', true, 'Recherche...');
      const res = await API.request('searchTontine', { code });
      UI.setLoading('btn-join-search', false, 'Rechercher');
      if (res.success) {
        const t = res.data;
        document.getElementById('preview-name').textContent = t.name;
        document.getElementById('preview-amount').textContent = UI.formatAmount(t.amount) + ' FCFA';
        document.getElementById('preview-members').textContent = t.members;
        document.getElementById('preview-admin').textContent = t.admin;
        document.getElementById('preview-start').textContent = t.start;
        document.getElementById('preview-desc').textContent = t.desc || '';
        document.getElementById('join-preview').classList.remove('hidden');
      } else {
        Toast.show('Tontine non trouvée. Vérifiez le code.', 'error');
      }
    });

    document.getElementById('btn-confirm-join').addEventListener('click', async () => {
      const code = document.getElementById('join-code').value.trim().toUpperCase();
      UI.setLoading('btn-confirm-join', true, 'Envoi...');
      const res = await API.request('joinTontine', { code });
      UI.setLoading('btn-confirm-join', false, 'Envoyer ma demande d\'adhésion');
      if (res.success) {
        Toast.show('Demande envoyée ! L\'administrateur va vous contacter.', 'success');
        document.getElementById('join-preview').classList.add('hidden');
        document.getElementById('join-code').value = '';
      }
    });

    /* Code input auto-uppercase */
    document.getElementById('join-code').addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    });

    /* Load invitations */
    this.loadInvitations();
  },

  async loadInvitations() {
    const res = await API.request('getInvitations');
    const list = document.getElementById('invitations-list');
    if (res.success && res.data.length) {
      list.innerHTML = '';
      res.data.forEach(inv => {
        const div = document.createElement('div');
        div.className = 'tontine-card';
        div.innerHTML = `
          <div class="tontine-card-header">
            <span class="tontine-card-name">${inv.tontine}</span>
            <span class="badge badge-pending">Invitation</span>
          </div>
          <div class="tontine-card-body">
            <div class="tontine-card-stat"><span>De</span><span>${inv.from}</span></div>
            <div class="tontine-card-stat"><span>Mise</span><span>${UI.formatAmount(inv.amount)}</span></div>
            <div class="tontine-card-stat"><span>Freq.</span><span>${inv.freq}</span></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn-primary btn-sm" style="flex:1" onclick="JoinTontine.acceptInvitation('${inv.code}',this)">Accepter</button>
            <button class="btn-outline btn-sm" style="flex:1">Refuser</button>
          </div>
        `;
        list.appendChild(div);
      });
    }
  },

  async acceptInvitation(code, btn) {
    btn.textContent = 'Envoi...';
    const res = await API.request('joinTontine', { code, invitation: true });
    if (res.success) {
      Toast.show('Vous avez rejoint la tontine !', 'success');
      Dashboard.load();
    }
  }
};

/* ═══════════════════════════════ PROFILE ═══════════════════════════════ */
const Profile = {
  load() {
    const u = App.currentUser;
    if (!u) return;
    const firstname = u.firstname || '';
    const lastname  = u.lastname  || '';
    const email     = u.email     || '';
    const phone     = u.phone     || '';
    const avatar    = u.avatar    || (firstname[0] + (lastname[0] || '')).toUpperCase() || '?';
    const inviteCode = u.invite_code || u.inviteCode || 'TF-????';

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

    UI.setAvatarEl('profile-avatar', u);
    set('profile-name',     `${firstname} ${lastname}`.trim());
    set('profile-email',    email);
    set('profile-role',     u.role || 'Membre');
    set('my-invite-code',   inviteCode);
    setVal('profile-firstname',    firstname);
    setVal('profile-lastname',     lastname);
    setVal('profile-email-input',  email);
    setVal('profile-phone',        phone);
  },

  init() {
    document.getElementById('btn-save-profile').addEventListener('click', async () => {
      const data = {
        firstname: document.getElementById('profile-firstname').value.trim(),
        lastname: document.getElementById('profile-lastname').value.trim(),
        email: document.getElementById('profile-email-input').value.trim(),
        phone: document.getElementById('profile-phone').value.trim()
      };
      if (!data.firstname || !data.lastname || !data.email) { Toast.show('Champs obligatoires manquants', 'error'); return; }
      UI.setLoading('btn-save-profile', true, 'Sauvegarde...');
      const res = await API.request('updateProfile', data);
      UI.setLoading('btn-save-profile', false, 'Sauvegarder');
      if (res.success) {
        Object.assign(App.currentUser, data);
        App.currentUser.avatar = (data.firstname[0]+data.lastname[0]).toUpperCase();
        Storage.save('user', App.currentUser);
        UI.updateUserInfo();
        Toast.show('Profil mis à jour !', 'success');
      }
    });

    document.getElementById('btn-copy-code').addEventListener('click', () => {
      UI.copyText(document.getElementById('my-invite-code').textContent);
    });

    /* Photo de profil : clic sur le crayon ouvre le sélecteur de fichier */
    document.getElementById('btn-edit-avatar').addEventListener('click', () => {
      document.getElementById('avatar-file-input').click();
    });
    document.getElementById('avatar-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = ''; /* permet de re-sélectionner le même fichier ensuite */
      if (!file) return;
      if (!file.type.startsWith('image/')) { Toast.show('Choisissez un fichier image.', 'error'); return; }

      try {
        const base64 = await UI.resizeImageToBase64(file);
        const res = await API.request('updateAvatar', { avatar: base64 });
        if (res.success) {
          App.currentUser.avatar = res.data.avatar;
          App.currentUser.avatar_photo = res.data.avatar_photo;
          Storage.save('user', App.currentUser);
          UI.updateUserInfo();
          Toast.show('Photo de profil mise à jour !', 'success');
        } else {
          Toast.show(res.message || 'Erreur lors de la mise à jour de la photo', 'error');
        }
      } catch (err) {
        Toast.show("Impossible de traiter cette image", 'error');
      }
    });

    document.getElementById('btn-change-password').addEventListener('click', async () => {
      const cur = document.getElementById('current-password').value;
      const nw  = document.getElementById('new-password').value;
      if (!cur || !nw) { Toast.show('Entrez l\'ancien et le nouveau mot de passe', 'error'); return; }
      if (nw.length < 8) { Toast.show('Le nouveau mot de passe doit contenir au moins 8 caractères', 'error'); return; }
      const res = await API.request('changePassword', { current: cur, newPassword: nw });
      if (res.success) { Toast.show('Mot de passe modifié !', 'success'); document.getElementById('current-password').value = ''; document.getElementById('new-password').value = ''; }
      else { Toast.show(res.message || 'Mot de passe actuel incorrect', 'error'); }
    });
  }
};

/* ═══════════════════════════════ SETTINGS ═══════════════════════════════ */
const Settings = {
  init() {
    /* Theme buttons */
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        App.settings.theme = theme;
        Storage.save('settings', App.settings);
        Toast.show(`Thème "${btn.querySelector('span').textContent}" activé`, 'success');
      });
    });

    /* Font size slider */
    const sizes = ['xsmall', 'small', 'medium', 'large', 'xlarge'];
    const labels = ['Très petit', 'Petit', 'Normal', 'Grand', 'Très grand'];
    const slider = document.getElementById('font-slider');
    slider.addEventListener('input', () => {
      const size = sizes[slider.value];
      document.documentElement.setAttribute('data-font-size', size);
      document.getElementById('font-preview').textContent = labels[slider.value];
      App.settings.fontSize = size;
      Storage.save('settings', App.settings);
    });

    /* Notification toggles */
    ['payment','requests','confirmed','audit'].forEach(key => {
      const el = document.getElementById(`notif-${key}`);
      if (el) el.addEventListener('change', () => {
        App.settings.notifications[key] = el.checked;
        Storage.save('settings', App.settings);
      });
    });

    /* Security toggles */
    ['pin','hide-amounts'].forEach(key => {
      const el = document.getElementById(`setting-${key}`);
      if (el) el.addEventListener('change', () => {
        const k = key.replace('-','');
        App.settings.security[k] = el.checked;
        Storage.save('settings', App.settings);
      });
    });

    /* Logout buttons */
    document.getElementById('btn-logout').addEventListener('click', () => Auth.logout());
    document.getElementById('btn-logout-settings').addEventListener('click', () => Auth.logout());
  },

  applyStored() {
    const saved = Storage.load('settings');
    if (!saved) return;
    App.settings = { ...App.settings, ...saved };
    document.documentElement.setAttribute('data-theme', App.settings.theme);
    document.documentElement.setAttribute('data-font-size', App.settings.fontSize);
    const sizes = ['xsmall','small','medium','large','xlarge'];
    const idx = sizes.indexOf(App.settings.fontSize);
    const slider = document.getElementById('font-slider');
    if (slider) slider.value = idx >= 0 ? idx : 2;
    document.querySelectorAll('.theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === App.settings.theme);
    });
  }
};

/* ═══════════════════════════════ TRANSACTIONS ═══════════════════════════════ */
const Transactions = {
  async load() {
    const list = document.getElementById('transactions-list');
    if (list) list.innerHTML = UI.skeletonRows(4);
    const res = await API.request('getTransactions');
    if (!res.success || !res.data.length) {
      list.innerHTML = '<div class="empty-state"><p>Aucune transaction</p></div>';
      return;
    }
    list.innerHTML = '';
    this.data = res.data;
    res.data.forEach(tx => list.appendChild(this.txCard(tx)));

    /* Filter chips */
    document.querySelectorAll('#page-transactions .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#page-transactions .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const f = chip.dataset.filter;
        const filtered = f === 'all' ? this.data :
          f === 'paid' ? this.data.filter(t => t.status === 'paid') :
          f === 'pending' ? this.data.filter(t => t.status === 'pending') :
          this.data.filter(t => t.type === 'in');
        list.innerHTML = '';
        filtered.forEach(tx => list.appendChild(this.txCard(tx)));
      });
    });
  },

  txCard(tx) {
    const div = document.createElement('div');
    div.className = 'transaction-item';
    const isOut = tx.type === 'out';
    div.innerHTML = `
      <div class="tx-icon ${tx.type}">
        <svg viewBox="0 0 24 24">${isOut
          ? '<line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="19 12 12 19 5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
          : '<line x1="12" y1="19" x2="12" y2="5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="5 12 12 5 19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
        }</svg>
      </div>
      <div class="tx-info">
        <p class="tx-name">${tx.name}</p>
        <p class="tx-tontine">${tx.tontine}</p>
      </div>
      <div class="tx-right">
        <p class="tx-amount ${tx.type}">${isOut ? '-' : '+'}${UI.formatAmount(tx.amount)} F</p>
        <p class="tx-date">${tx.date}</p>
      </div>
    `;
    return div;
  }
};

/* ═══════════════════════════════ AUDIT LOG ═══════════════════════════════ */
const AuditLog = {
  async load() {
    const list = document.getElementById('audit-log-list');
    if (list) list.innerHTML = UI.skeletonRows(5);
    const res = await API.request('getGlobalLog');
    if (!res.success || !res.data.length) {
      list.innerHTML = '<div class="empty-state"><p>Aucune entrée dans le journal</p></div>';
      return;
    }
    list.innerHTML = '';
    res.data.forEach(entry => {
      const div = document.createElement('div');
      div.className = `log-item ${entry.type}`;
      div.innerHTML = `
        <p class="log-action">${entry.action}</p>
        <p class="log-detail">${entry.detail}</p>
        <div class="log-meta"><span class="log-user">@${entry.user}</span><span class="log-time">${entry.time}</span></div>
      `;
      list.appendChild(div);
    });
  }
};

/* ═══════════════════════════════ INVITE ═══════════════════════════════ */
const Invite = {
  tontines: [],

  init() {
    document.getElementById('btn-send-invite').addEventListener('click', async () => {
      const select = document.getElementById('invite-tontine-select');
      const tontineId = select.value;
      const email = document.getElementById('invite-email').value.trim();
      const message = document.getElementById('invite-message').value.trim();
      if (!tontineId) { Toast.show('Sélectionnez une tontine', 'error'); return; }
      if (!email) { Toast.show('Entrez un email', 'error'); return; }
      UI.setLoading('btn-send-invite', true, 'Envoi...');
      const res = await API.request('sendInvite', { tontineId, email, message });
      UI.setLoading('btn-send-invite', false, "Envoyer l'invitation");
      if (res.success) {
        Toast.show(`Invitation envoyée à ${email} !`, 'success');
        document.getElementById('invite-email').value = '';
        document.getElementById('invite-message').value = '';
      } else {
        Toast.show(res.message || "Erreur lors de l'envoi", 'error');
      }
    });

    /* Met à jour le code + le lien de partage quand on change de tontine */
    document.getElementById('invite-tontine-select').addEventListener('change', (e) => {
      this.updateCodeAndLink(e.target.value);
    });

    document.getElementById('btn-copy-tontine-code')?.addEventListener('click', () => {
      UI.copyText(document.getElementById('invite-tontine-code').textContent);
    });

    document.getElementById('btn-direct-add')?.addEventListener('click', async () => {
      const select = document.getElementById('invite-tontine-select');
      const tontineId = select.value;
      const identifier = document.getElementById('direct-add-identifier').value.trim();
      if (!tontineId) { Toast.show('Sélectionnez une tontine', 'error'); return; }
      if (!identifier) { Toast.show('Entrez un email ou un numéro de téléphone', 'error'); return; }
      UI.setLoading('btn-direct-add', true, 'Ajout...');
      const res = await API.request('addMemberDirect', { tontineId, identifier });
      UI.setLoading('btn-direct-add', false, 'Ajouter à la tontine');
      if (res.success) {
        Toast.show(res.message || 'Membre ajouté !', 'success');
        document.getElementById('direct-add-identifier').value = '';
      } else {
        Toast.show(res.message || 'Impossible d\'ajouter ce membre', 'error');
      }
    });

    document.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const select = document.getElementById('invite-tontine-select');
        if (!select.value) { Toast.show('Sélectionnez une tontine', 'error'); return; }
        const channel = btn.dataset.channel;
        const link = document.getElementById('share-link').textContent;
        const msg = `Rejoins ma tontine sur Tontines Facile ! ${link}`;
        if (channel === 'copy') { UI.copyText(link); }
        else if (channel === 'whatsapp') { window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`); }
        else if (channel === 'sms') { window.open(`sms:?body=${encodeURIComponent(msg)}`); }
      });
    });
  },

  updateCodeAndLink(tontineId) {
    const codeBox  = document.getElementById('invite-code-display');
    const codeHint = document.getElementById('invite-code-hint');
    const t = this.tontines.find(t => String(t.id) === String(tontineId));
    if (!t) {
      codeBox.style.display = 'none';
      codeHint.style.display = 'block';
      document.getElementById('share-link').textContent = 'Sélectionnez une tontine ci-dessus';
      return;
    }
    const code = t.inviteCode || t.invite_code || '—';
    codeHint.style.display = 'none';
    codeBox.style.display = 'flex';
    document.getElementById('invite-tontine-code').textContent = code;
    /* Lien basé sur le domaine réel de l'appli, pas un domaine fictif */
    document.getElementById('share-link').textContent = `${window.location.origin}/join/${code}`;
  },

  _populate(list, select) {
    const prevValue = select.value;
    select.innerHTML = '<option value="">-- Choisir une tontine --</option>';
    this.tontines = (list || []).filter(t => t.userRole === 'admin');
    this.tontines.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      select.appendChild(opt);
    });
    /* Conserve la sélection en cours si elle existe toujours dans la nouvelle liste */
    if (prevValue && this.tontines.some(t => String(t.id) === String(prevValue))) {
      select.value = prevValue;
    }
  },

  async loadTontines() {
    const select = document.getElementById('invite-tontine-select');
    if (!select) return;

    /* Affichage instantané à partir du cache déjà chargé (dashboard / mes tontines),
       pour éviter que le select reste vide/lent le temps d'un nouvel appel réseau */
    if (MyTontines.data && MyTontines.data.length) {
      this._populate(MyTontines.data, select);
      this.updateCodeAndLink(select.value);
    }

    /* Rafraîchit ensuite en arrière-plan pour rester synchronisé avec le serveur */
    const res = await API.request('getTontines');
    if (res.success) {
      this._populate(res.data, select);
    }
    this.updateCodeAndLink(select.value);
  },

  /* Pré-sélectionne une tontine précise (ex: depuis le bouton "Inviter un membre"
     sur la page de détail) sans que l'utilisateur ait besoin de la choisir manuellement */
  async preselect(tontine) {
    await this.loadTontines();
    const select = document.getElementById('invite-tontine-select');
    if (!select || !tontine) return;
    const exists = this.tontines.some(t => String(t.id) === String(tontine.id));
    if (exists) {
      select.value = tontine.id;
      this.updateCodeAndLink(tontine.id);
    }
  }
};

/* ═══════════════════════════════ CONTACTS ═══════════════════════════════ */
const Contacts = {
  searchTimer: null,
  _lastAccepted: [],

  init() {
    const input = document.getElementById('contacts-search-input');
    input.addEventListener('input', () => {
      clearTimeout(this.searchTimer);
      const q = input.value.trim();
      const results = document.getElementById('contacts-search-results');
      if (q.length < 2) { results.innerHTML = ''; return; }
      this.searchTimer = setTimeout(() => this.search(q), 400);
    });
  },

  async load() {
    const acceptedListInit = document.getElementById('contacts-accepted-list');
    if (acceptedListInit) acceptedListInit.innerHTML = UI.skeletonRows(3);
    const res = await API.request('getContacts');
    if (!res.success) return;
    const { accepted, incoming, outgoing } = res.data;
    this._lastAccepted = accepted;

    const incomingCard = document.getElementById('contacts-incoming-card');
    const outgoingCard = document.getElementById('contacts-outgoing-card');
    incomingCard.style.display = incoming.length ? 'block' : 'none';
    outgoingCard.style.display = outgoing.length ? 'block' : 'none';

    const incomingList = document.getElementById('contacts-incoming-list');
    incomingList.innerHTML = '';
    incoming.forEach(c => incomingList.appendChild(this.renderItem(c, 'incoming')));

    const outgoingList = document.getElementById('contacts-outgoing-list');
    outgoingList.innerHTML = '';
    outgoing.forEach(c => outgoingList.appendChild(this.renderItem(c, 'outgoing')));

    const acceptedList = document.getElementById('contacts-accepted-list');
    acceptedList.innerHTML = '';
    if (!accepted.length) {
      acceptedList.innerHTML = UI.emptyState('Vous n\'avez pas encore de contacts');
    } else {
      accepted.forEach(c => acceptedList.appendChild(this.renderItem(c, 'accepted')));
    }
  },

  renderItem(c, mode) {
    const div = document.createElement('div');
    div.className = 'member-item contact-item';
    const photo = c.avatar_photo;
    const avatarClass = photo ? 'avatar-sm has-photo' : 'avatar-sm';
    const avatarStyle = photo ? ` style="background-image:url('${photo}')"` : '';
    let actions = '';
    if (mode === 'incoming') {
      actions = `
        <div class="contact-item-actions">
          <button class="btn-icon" title="Accepter" onclick="Contacts.respond(${c.id},'accept')" style="color:var(--color-primary)">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </button>
          <button class="btn-icon" title="Refuser" onclick="Contacts.respond(${c.id},'decline')" style="color:var(--color-red)">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>`;
    } else if (mode === 'outgoing') {
      actions = `<span class="member-status member-pending">En attente</span>`;
    } else {
      actions = `
        <div class="contact-item-actions">
          <button class="btn-icon" title="Envoyer un message" onclick="Chat.openWithUser(${c.id})">
            <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </button>
          <button class="btn-icon" title="Retirer" onclick="Contacts.remove(${c.id})" style="color:var(--color-red)">
            <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>
          </button>
        </div>`;
    }
    div.innerHTML = `
      <div class="${avatarClass}"${avatarStyle}>${photo ? '' : (c.initials || c.name.slice(0,2).toUpperCase())}</div>
      <div class="member-info">
        <p class="member-name">${c.name}</p>
        <p class="member-role">${c.invite_code || ''}</p>
      </div>
      ${actions}
    `;
    return div;
  },

  async search(q) {
    const results = document.getElementById('contacts-search-results');
    results.innerHTML = '<div class="empty-state small"><p>Recherche…</p></div>';
    const res = await API.request('searchUsers', { query: q });
    if (!res.success || !res.data.length) {
      results.innerHTML = '<div class="empty-state small"><p>Aucun utilisateur trouvé</p></div>';
      return;
    }
    results.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'contact-search-result';
    res.data.forEach(u => {
      const div = document.createElement('div');
      div.className = 'member-item contact-item';
      const photo = u.avatar_photo;
      const avatarClass = photo ? 'avatar-sm has-photo' : 'avatar-sm';
      const avatarStyle = photo ? ` style="background-image:url('${photo}')"` : '';
      let action;
      if (u.contactStatus === 'accepted') action = `<span class="member-status member-paid">Déjà ami</span>`;
      else if (u.contactStatus === 'pending') action = `<span class="member-status member-pending">Invité(e)</span>`;
      else action = `<button class="btn-primary btn-sm" onclick="Contacts.add(${u.id})">Ajouter</button>`;
      div.innerHTML = `
        <div class="${avatarClass}"${avatarStyle}>${photo ? '' : (u.initials || u.name.slice(0,2).toUpperCase())}</div>
        <div class="member-info">
          <p class="member-name">${u.name}</p>
          <p class="member-role">${u.invite_code || u.email || ''}</p>
        </div>
        ${action}
      `;
      wrap.appendChild(div);
    });
    results.appendChild(wrap);
  },

  async add(contactId) {
    const res = await API.request('addContact', { contactId });
    if (res.success) {
      Toast.show(res.message || 'Demande envoyée !', 'success');
      const input = document.getElementById('contacts-search-input');
      if (input.value.trim().length >= 2) this.search(input.value.trim());
      this.load();
    } else {
      Toast.show(res.message || "Impossible d'ajouter ce contact", 'error');
    }
  },

  async respond(contactId, decision) {
    const res = await API.request('respondContact', { contactId, decision });
    if (res.success) { Toast.show(res.message || 'Fait !', 'success'); this.load(); }
    else Toast.show(res.message || 'Erreur', 'error');
  },

  async remove(contactId) {
    const confirmed = await Modal.confirm('Retirer ce contact ?', 'Vous pourrez le ré-ajouter plus tard si besoin.', 'Retirer');
    if (!confirmed) return;
    const res = await API.request('removeContact', { contactId });
    if (res.success) { Toast.show('Contact retiré', 'success'); this.load(); }
  }
};


/* ═══════════════════════════════ CHAT ═══════════════════════════════ */
const Chat = {
  currentConversationId: null,
  currentTitle: '',
  pollTimer: null,
  listPollTimer: null,
  lastMessageId: 0,
  renderedIds: null,
  _fetchInFlight: false,
  _sending: false,

  init() {
    const input = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('btn-chat-send');
    const recordBtn = document.getElementById('btn-chat-record');

    /* Bascule mic ↔ envoi selon que le champ contient du texte (comme WhatsApp),
       et fait grandir la zone de saisie au fil des lignes (jusqu'à une hauteur max, cf. CSS) */
    const syncInputState = () => {
      const hasText = input.value.trim().length > 0;
      sendBtn.classList.toggle('hidden', !hasText);
      recordBtn.classList.toggle('hidden', hasText);
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 110) + 'px';
    };
    input.addEventListener('input', syncInputState);
    syncInputState();

    document.getElementById('btn-chat-send').addEventListener('click', () => this.send());
    document.getElementById('chat-message-input').addEventListener('keydown', (e) => {
      /* Entrée envoie, Maj+Entrée insère une nouvelle ligne */
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
    });

    /* Pièce jointe (photo ou fichier) */
    document.getElementById('btn-chat-attach').addEventListener('click', () => {
      document.getElementById('chat-file-input').click();
    });
    document.getElementById('chat-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        if (file.type.startsWith('image/')) {
          const base64 = await UI.resizeImageToBase64(file, 1000, 0.65);
          await this.sendAttachment('image', base64, file.name);
        } else {
          const base64 = await UI.fileToBase64(file, 2_500_000);
          await this.sendAttachment('file', base64, file.name);
        }
      } catch (err) {
        Toast.show(err.message || "Impossible d'envoyer ce fichier", 'error');
      }
    });

    /* Message vocal */
    document.getElementById('btn-chat-record').addEventListener('click', () => this.toggleRecording());
  },

  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,

  async toggleRecording() {
    const btn = document.getElementById('btn-chat-record');
    if (this.isRecording) {
      this.mediaRecorder?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      Toast.show("L'enregistrement vocal n'est pas supporté sur cet appareil", 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      /* webm/opus = déjà très compressé, léger même pour plusieurs dizaines de secondes */
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
      this.mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.audioChunks.push(e.data); };
      this.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        btn.classList.remove('recording');
        this.isRecording = false;
        const blob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType || 'audio/webm' });
        if (blob.size < 500) return; /* enregistrement trop court / annulé */
        if (blob.size > 1_400_000) { Toast.show('Message vocal trop long, réessayez plus court.', 'error'); return; }
        const reader = new FileReader();
        reader.onload = () => this.sendAttachment('audio', reader.result, 'vocal.webm');
        reader.readAsDataURL(blob);
      };
      this.mediaRecorder.start();
      this.isRecording = true;
      btn.classList.add('recording');
      Toast.show('Enregistrement… touchez à nouveau pour envoyer', 'info');
    } catch (err) {
      Toast.show('Micro indisponible ou permission refusée', 'error');
    }
  },

  async sendAttachment(type, dataUrl, name) {
    if (!this.currentConversationId) return;
    const res = await API.request('sendMessage', {
      conversationId: this.currentConversationId,
      body: '',
      attachmentType: type,
      attachmentData: dataUrl,
      attachmentName: name
    });
    if (res.success) await this.fetchMessages(false);
    else Toast.show(res.message || 'Envoi impossible', 'error');
  },

  /* Rafraîchit périodiquement le badge de messages non lus, même en dehors
     des pages chat (polling léger — cf. choix "polling" pour le temps réel) */
  startBackgroundRefresh() {
    this.stopBackgroundRefresh();
    this.listPollTimer = setInterval(() => {
      if (App.currentPage !== 'chat' && App.currentPage !== 'chat-thread') this.refreshUnreadBadge();
    }, 15000);
  },
  stopBackgroundRefresh() {
    if (this.listPollTimer) { clearInterval(this.listPollTimer); this.listPollTimer = null; }
  },
  async refreshUnreadBadge() {
    const res = await API.request('getConversations');
    if (!res.success) return;
    const total = res.data.reduce((sum, c) => sum + (c.unread || 0), 0);
    this.updateUnreadBadge(total);
  },

  async loadConversations() {
    const list = document.getElementById('chat-conversations-list');
    if (list) list.innerHTML = UI.skeletonRows(4);
    const res = await API.request('getConversations');
    list.innerHTML = '';
    if (!res.success || !res.data.length) {
      list.innerHTML = UI.emptyState('Aucune conversation pour le moment. Démarrez-en une depuis vos contacts !', 'contacts', 'Voir mes contacts');
      this.updateUnreadBadge(0);
      return;
    }
    let totalUnread = 0;
    res.data.forEach(c => {
      totalUnread += c.unread || 0;
      list.appendChild(this.renderConversationItem(c));
    });
    this.updateUnreadBadge(totalUnread);
  },

  renderConversationItem(c) {
    const div = document.createElement('div');
    div.className = 'conversation-item';
    const photo = c.avatar_photo;
    const avatarClass = photo ? 'avatar-sm has-photo' : 'avatar-sm';
    const avatarStyle = photo ? ` style="background-image:url('${photo}')"` : '';
    const initials = (c.avatar && c.avatar.length <= 4) ? c.avatar : (c.title || '?').slice(0, 2).toUpperCase();
    const time = c.last_at ? new Date(c.last_at.replace(' ', 'T')).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    div.innerHTML = `
      <div class="${avatarClass}"${avatarStyle}>${photo ? '' : initials}</div>
      <div class="conversation-info">
        <p class="conversation-name">${c.title || 'Conversation'}</p>
        <p class="conversation-preview">${c.last_message ? UI.escapeHtml(c.last_message) : 'Aucun message pour le moment'}</p>
      </div>
      <div class="conversation-meta">
        <span class="conversation-time">${time}</span>
        ${c.unread ? `<span class="notif-badge-inline">${c.unread}</span>` : ''}
      </div>
    `;
    div.addEventListener('click', () => this.openThread(c.id, c.title, c.avatar, c.avatar_photo));
    return div;
  },

  updateUnreadBadge(n) {
    const badge = document.getElementById('chat-unread-badge');
    if (!badge) return;
    if (n > 0) { badge.textContent = n > 99 ? '99+' : n; badge.style.display = 'inline-flex'; }
    else badge.style.display = 'none';
  },

  /* Démarre (ou récupère) une conversation 1-à-1 avec un contact, et ouvre
     directement le fil de discussion — appelé depuis la page Contacts */
  async openWithUser(userId) {
    const res = await API.request('startConversation', { userId });
    if (!res.success) { Toast.show(res.message || 'Impossible de démarrer la discussion', 'error'); return; }
    const contact = (Contacts && Array.isArray(Contacts._lastAccepted)) ? Contacts._lastAccepted.find(c => String(c.id) === String(userId)) : null;
    await this.openThread(res.data.conversationId, contact?.name || 'Discussion', contact?.avatar, contact?.avatar_photo);
  },

  async openThread(conversationId, title, avatar, avatarPhoto) {
    this.stopPolling();
    this.currentConversationId = conversationId;
    this.currentTitle = title || 'Discussion';
    this.lastMessageId = 0;
    this.renderedIds = new Set();
    this._fetchInFlight = false;
    this._sending = false;
    Nav.go('chat-thread', this.currentTitle);
    RouteMemory.save('chat-thread', this.currentTitle, { conversationId, avatar, avatarPhoto });
    document.getElementById('chat-messages-list').innerHTML = '<div class="empty-state small"><p>Chargement…</p></div>';
    await this.fetchMessages(true);
    this.pollTimer = setInterval(() => this.fetchMessages(false), 3000);
  },

  stopPolling() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  },

  async fetchMessages(initial) {
    if (!this.currentConversationId) return;
    /* Empêche deux requêtes simultanées (ex: polling + envoi) de retomber
       sur les mêmes messages avant que lastMessageId n'ait été mis à jour —
       c'est ce qui causait l'affichage en double. */
    if (this._fetchInFlight) return;
    this._fetchInFlight = true;
    try {
      const res = await API.request('getMessages', {
        conversationId: this.currentConversationId,
        sinceId: initial ? 0 : this.lastMessageId
      });
      if (!res.success) return;
      const list = document.getElementById('chat-messages-list');
      if (initial) { list.innerHTML = ''; this.renderedIds = new Set(); }
      if (!res.data.length) {
        if (initial) list.innerHTML = '<div class="empty-state small"><p>Dites bonjour 👋</p></div>';
        return;
      }
      const wasEmpty = list.querySelector('.empty-state');
      if (wasEmpty) list.innerHTML = '';
      let appended = false;
      res.data.forEach(m => {
        this.lastMessageId = Math.max(this.lastMessageId, m.id);
        /* Sécurité supplémentaire : ne jamais afficher deux fois le même message */
        if (this.renderedIds.has(m.id)) return;
        this.renderedIds.add(m.id);
        list.appendChild(this.renderBubble(m));
        appended = true;
      });
      if (appended) list.scrollTop = list.scrollHeight;
    } finally {
      this._fetchInFlight = false;
    }
  },

  renderBubble(m) {
    const div = document.createElement('div');
    const mine = String(m.sender_id) === String(App.currentUser?.id);
    div.className = `chat-bubble ${mine ? 'mine' : 'theirs'}${m.attachment_type ? ' attachment' : ''}`;
    const time = m.created_at ? new Date(m.created_at.replace(' ', 'T')).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

    let content = '';
    if (m.attachment_type === 'image') {
      content = `<img class="chat-image" src="${m.attachment_data}" alt="${UI.escapeHtml(m.attachment_name || 'Photo')}" />`;
    } else if (m.attachment_type === 'audio') {
      content = `<audio class="chat-audio" controls src="${m.attachment_data}"></audio>`;
    } else if (m.attachment_type === 'file') {
      content = `
        <div class="chat-file">
          <svg width="22" height="22" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/></svg>
          <span class="chat-file-name">${UI.escapeHtml(m.attachment_name || 'Fichier')}</span>
          <a href="${m.attachment_data}" download="${UI.escapeHtml(m.attachment_name || 'fichier')}" class="btn-icon" aria-label="Télécharger">
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </a>
        </div>`;
    }
    if (m.body) content += `<div>${UI.escapeHtml(m.body)}</div>`;
    div.innerHTML = `${content}<span class="chat-bubble-time">${time}</span>`;
    return div;
  },

  async send() {
    if (this._sending) return;
    const input = document.getElementById('chat-message-input');
    const body = input.value.trim();
    if (!body || !this.currentConversationId) return;
    this._sending = true;
    input.value = '';
    input.style.height = 'auto';
    input.dispatchEvent(new Event('input'));
    try {
      const res = await API.request('sendMessage', { conversationId: this.currentConversationId, body });
      if (res.success) {
        await this.fetchMessages(false);
      } else {
        Toast.show(res.message || 'Message non envoyé', 'error');
        input.value = body;
        input.dispatchEvent(new Event('input'));
      }
    } finally {
      this._sending = false;
    }
  }
};

const UI = {
  fileToBase64(file, maxBytes = 2_500_000) {
    return new Promise((resolve, reject) => {
      if (file.size > maxBytes) {
        reject(new Error(`Fichier trop volumineux (max ${Math.round(maxBytes / 1_000_000)} Mo)`));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  },


  /* Échappe le HTML — indispensable pour afficher en sécurité du texte
     saisi par les utilisateurs (messages du chat, etc.) */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  },


  /* Affiche la photo de profil d'un utilisateur sur un élément avatar
     (div rond), avec repli automatique sur les initiales si absente. */
  setAvatarEl(id, user) {
    const el = document.getElementById(id);
    if (!el || !user) return;
    const firstname = user.firstname || '';
    const lastname  = user.lastname  || '';
    const initials = (user.avatar && user.avatar.length <= 4)
      ? user.avatar
      : ((firstname[0] || '') + (lastname[0] || '')).toUpperCase() || '?';
    const photo = user.avatar_photo || user.avatarPhoto || null;
    if (photo) {
      el.style.backgroundImage = `url('${photo}')`;
      el.classList.add('has-photo');
      el.textContent = '';
    } else {
      el.style.backgroundImage = '';
      el.classList.remove('has-photo');
      el.textContent = initials;
    }
  },

  /* Redimensionne/compresse une image (fichier uploadé) en base64 JPEG,
     pour rester léger vu qu'elle est stockée directement en base (pas
     de stockage disque persistant sur l'hébergement serverless). */
  resizeImageToBase64(file, maxSize = 320, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Image invalide'));
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxSize) { height *= maxSize / width; width = maxSize; }
          else if (height > maxSize) { width *= maxSize / height; height = maxSize; }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  },


  formatAmount(n) {
    if (!n && n !== 0) return '—';
    return new Intl.NumberFormat('fr-FR').format(n) + ' F';
  },

  freqLabel(freq) {
    const map = { weekly: 'Hebdo.', biweekly: 'Bi-mens.', monthly: 'Mensuel', quarterly: 'Trimestr.' };
    return map[freq] || freq;
  },

  setLoading(id, loading, text) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading
      ? `<span class="spinner" style="width:20px;height:20px;border-width:2px;margin:0"></span> ${text}`
      : text;
  },

  tontineCard(t) {
    const div = document.createElement('div');
    div.className = 'tontine-card';
    const progress = t.totalTours ? (t.currentTour / t.totalTours) * 100 : 0;
    div.innerHTML = `
      <div class="tontine-card-header">
        <span class="tontine-card-name">${t.name}</span>
        <span class="badge ${t.badge}">${t.badgeText}</span>
      </div>
      <div class="tontine-card-body">
        <div class="tontine-card-stat"><span>Mise</span><span>${UI.formatAmount(t.amount)}</span></div>
        <div class="tontine-card-stat"><span>Membres</span><span>${t.currentMembers}/${t.maxMembers}</span></div>
        <div class="tontine-card-stat"><span>Tour</span><span>${t.currentTour}/${t.totalTours}</span></div>
        <div class="tontine-card-stat"><span>Rôle</span><span>${t.userRole === 'admin' ? '👑 Admin' : '👤 Membre'}</span></div>
      </div>
      <div class="tontine-card-progress"><div class="tontine-card-bar" style="width:${progress}%"></div></div>
    `;
    div.addEventListener('click', () => TontineDetail.open(t));
    return div;
  },

  activityItem(entry) {
    const div = document.createElement('div');
    div.className = 'activity-item';
    const icons = { payment: '💰', admin: '📢', member: '👤', system: '🔄' };
    div.innerHTML = `
      <div class="activity-icon">${icons[entry.type] || '📋'}</div>
      <div class="activity-text"><strong>${entry.action}</strong><br><span>${entry.detail}</span></div>
      <span class="activity-time">${entry.time}</span>
    `;
    return div;
  },

  emptyState(text, page, btnText) {
    return `<div class="empty-state">
      <svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="2" opacity="0.3"/><path d="M22 32h20M32 22v20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
      <p>${text}</p>
      ${page ? `<button class="btn-primary btn-sm" data-page="${page}">${btnText}</button>` : ''}
    </div>`;
  },

  /* Génère n lignes "skeleton" (avatar + texte) pour montrer que des
     données sont en cours de chargement — dashboard, journal, contacts,
     conversations, notifications, etc. */
  skeletonRows(n = 3) {
    let html = '';
    for (let i = 0; i < n; i++) {
      html += `
        <div class="skeleton-row">
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton-lines">
            <div class="skeleton skeleton-line w-60"></div>
            <div class="skeleton skeleton-line w-40"></div>
          </div>
        </div>`;
    }
    return html;
  },

  skeletonCards(n = 2) {
    let html = '';
    for (let i = 0; i < n; i++) html += `<div class="skeleton skeleton-card"></div>`;
    return html;
  },

  copyText(text) {
    navigator.clipboard?.writeText(text).then(() => {
      Toast.show('Copié dans le presse-papier !', 'success');
    }).catch(() => {
      /* Fallback */
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
      Toast.show('Copié !', 'success');
    });
  },

  updateUserInfo() {
    const u = App.currentUser;
    if (!u) return;

    /* Normaliser les champs (API peut retourner first_name ou firstname) */
    const firstname = u.firstname || u.first_name || '';
    const lastname  = u.lastname  || u.last_name  || '';
    const email     = u.email || '';
    const initials  = u.avatar && u.avatar.length <= 4
      ? u.avatar
      : ((firstname[0] || '') + (lastname[0] || '')).toUpperCase() || '?';

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('greeting-name',   firstname || 'Utilisateur');
    UI.setAvatarEl('dashboard-avatar', u);
    UI.setAvatarEl('dropdown-avatar', u);
    set('dropdown-name',   `${firstname} ${lastname}`.trim());
    set('dropdown-email',  email);

    /* Mettre à jour le profil si on est sur cette page */
    if (typeof Profile !== 'undefined') Profile.load();
  }
};

/* ═══════════════════════════════ MODAL ═══════════════════════════════ */
const Modal = {
  open(title, bodyHTML, footerHTML = '') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
  },

  confirm(title, message, confirmText = 'Confirmer') {
    return new Promise(resolve => {
      this.open(title,
        `<p style="font-size:var(--fs-sm);color:var(--color-text-2)">${message}</p>`,
        `<button class="btn-primary btn-full" id="modal-confirm-btn">${confirmText}</button>
         <button class="btn-ghost btn-full" onclick="Modal.close()">Annuler</button>`
      );
      document.getElementById('modal-confirm-btn').addEventListener('click', () => {
        this.close();
        resolve(true);
      });
      document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal-overlay')) { this.close(); resolve(false); }
      }, { once: true });
    });
  }
};

/* ═══════════════════════════════ TOAST ═══════════════════════════════ */
const Toast = {
  show(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-text">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

/* ═══════════════════════════════ LOCAL STORAGE ═══════════════════════════════ */
const Storage = {
  save(key, value) {
    try { localStorage.setItem(`tf_${key}`, JSON.stringify(value)); } catch {}
  },
  load(key) {
    try { return JSON.parse(localStorage.getItem(`tf_${key}`)); } catch { return null; }
  },
  remove(key) {
    try { localStorage.removeItem(`tf_${key}`); } catch {}
  }
};

/* ═══════════════════════════════ ROUTE MEMORY ═══════════════════════════════
   Retient la dernière page visitée (et son contexte : ID de tontine ou de
   conversation) pour qu'un rafraîchissement (F5) rouvre la même page au lieu
   de toujours revenir au tableau de bord. Stocké en sessionStorage : propre
   à l'onglet, effacé à la fermeture. */
const RouteMemory = {
  KEY: 'tf_last_route',
  save(page, title = '', context = null) {
    try { sessionStorage.setItem(this.KEY, JSON.stringify({ page, title, context })); } catch {}
  },
  load() {
    try { return JSON.parse(sessionStorage.getItem(this.KEY)); } catch { return null; }
  },
  clear() {
    try { sessionStorage.removeItem(this.KEY); } catch {}
  }
};

/* ═══════════════════════════════ PWA MANIFEST ═══════════════════════════════ */
function setupPWA() {
  /* Inline manifest */
  const manifest = {
    name: 'Tontines Facile',
    short_name: 'TontinesFacile',
    description: 'Gérez vos tontines en toute transparence',
    start_url: '/index.html',
    display: 'standalone',
    background_color: '#0f6b4a',
    theme_color: '#0f6b4a',
    orientation: 'portrait',
    icons: [
      { src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="%230f6b4a"/><circle cx="96" cy="60" r="32" stroke="white" stroke-width="8" fill="none"/><circle cx="44" cy="140" r="24" stroke="white" stroke-width="8" fill="none"/><circle cx="148" cy="140" r="24" stroke="white" stroke-width="8" fill="none"/><line x1="67" y1="80" x2="55" y2="117" stroke="white" stroke-width="8" stroke-linecap="round"/><line x1="125" y1="80" x2="137" y2="117" stroke="white" stroke-width="8" stroke-linecap="round"/><line x1="68" y1="140" x2="124" y2="140" stroke="white" stroke-width="8" stroke-linecap="round"/></svg>', sizes: '192x192', type: 'image/svg+xml' }
    ]
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  document.getElementById('manifest-link').href = URL.createObjectURL(blob);
}

/* ═══════════════════════════════ EVENT LISTENERS ═══════════════════════════════ */
const PAGE_TITLES = {
  invite: 'Inviter', contacts: 'Contacts', chat: 'Messages',
  terms: "Conditions d'utilisation", privacy: 'Confidentialité',
  transactions: 'Transactions', 'audit-log': 'Journal'
};

/* Navigue vers une page "simple" (sans contexte supplémentaire type ID) en
   chargeant ses données si besoin — utilisé par les clics [data-page] ET
   par la restauration de page après un rafraîchissement (F5). */
function goToPage(page) {
  if (page === 'transactions') Transactions.load();
  if (page === 'audit-log') AuditLog.load();
  if (page === 'profile') Profile.load();
  if (page === 'invite') Invite.loadTontines();
  if (page === 'contacts') Contacts.load();
  if (page === 'chat') Chat.loadConversations();
  Nav.go(page, PAGE_TITLES[page] || '');
}

function setupEventListeners() {
  /* Global data-page click handler */
  document.addEventListener('click', (e) => {
    const pageTarget = e.target.closest('[data-page]');
    if (pageTarget) {
      const page = pageTarget.dataset.page;
      if (page) {
        e.preventDefault();
        Nav.closeMenu();
        goToPage(page);
      }
    }
  });

  /* Back button */
  document.getElementById('btn-back').addEventListener('click', () => Nav.back());

  /* Menu toggle */
  document.getElementById('btn-menu').addEventListener('click', () => {
    const menu = document.getElementById('dropdown-menu');
    const overlay = document.getElementById('dropdown-overlay');
    menu.classList.toggle('hidden');
    overlay.classList.toggle('hidden');
  });

  /* Close menu on overlay click */
  document.getElementById('dropdown-overlay').addEventListener('click', () => Nav.closeMenu());

  /* Notification bell */
  document.getElementById('btn-notif').addEventListener('click', async () => {
    Modal.open('Notifications', UI.skeletonRows(4));
    const res = await API.request('getNotifications');
    const notifs = res.success ? (res.data?.notifications ?? []) : [];
    if (!notifs.length) {
      Modal.open('Notifications', UI.emptyState('Aucune notification pour le moment'));
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

    /* Marque tout comme lu et rafraîchit le badge */
    API.request('markNotificationsRead').then(() => {
      const badge = document.getElementById('notif-badge');
      if (badge) badge.style.display = 'none';
    });

    /* Navigation contextuelle au clic */
    document.querySelectorAll('[data-notif-index]').forEach(el => {
      el.addEventListener('click', () => {
        const n = notifs[parseInt(el.dataset.notifIndex, 10)];
        Modal.close();
        if (!n) return;
        if (n.type === 'join_request' && n.tontine_id) {
          TontineDetail.openById(n.tontine_id, true);
        } else if (n.tontine_id) {
          TontineDetail.openById(n.tontine_id);
        } else if (n.type === 'contact_request' || n.type === 'contact_accepted') {
          Nav.go('contacts');
          Contacts.load();
        }
      });
    });
  });

  /* Modal close */
  document.getElementById('modal-close').addEventListener('click', () => Modal.close());

  /* Browser back button */
  window.addEventListener('popstate', () => Nav.back());
}

/* ═══════════════════════════════ INIT ═══════════════════════════════ */

/* Restaure la page où se trouvait l'utilisateur avant un rafraîchissement.
   Retombe silencieusement sur le dashboard si le contexte est absent/invalide
   (ex: tontine supprimée entre-temps). */
async function restoreRoute(route) {
  if (!route || !route.page || route.page === 'auth') { Nav.go('dashboard'); return; }
  try {
    if (route.page === 'tontine-detail' && route.context?.tontineId) {
      await TontineDetail.openById(route.context.tontineId);
      if (!document.getElementById('page-tontine-detail')?.classList.contains('active')) Nav.go('dashboard');
      return;
    }
    if (route.page === 'chat-thread' && route.context?.conversationId) {
      await Chat.openThread(route.context.conversationId, route.title, route.context.avatar, route.context.avatarPhoto);
      if (!document.getElementById('page-chat-thread')?.classList.contains('active')) Nav.go('dashboard');
      return;
    }
    const pageEl = document.getElementById(`page-${route.page}`);
    if (!pageEl) { Nav.go('dashboard'); return; }
    goToPage(route.page);
  } catch (err) {
    console.error('Restauration de page échouée:', err);
    Nav.go('dashboard');
  }
}

async function init() {

  /* 0. Lien d'invitation direct (ex: tontine-iota.vercel.app/join/TF-ABC123) */
  const joinMatch = window.location.pathname.match(/\/join\/([A-Za-z0-9-]+)/);
  const pendingJoinCode = joinMatch ? decodeURIComponent(joinMatch[1]).toUpperCase() : null;

  /* 1. Vérifier la session IMMÉDIATEMENT avant tout */
  const savedUser  = Storage.load('user');
  const savedToken = Storage.load('token');

  /* 2. Initialiser l'UI */
  setupPWA();
  setupEventListeners();
  Settings.applyStored();
  Auth.init();
  Profile.init();
  Settings.init();
  CreateTontine.init();
  JoinTontine.init();
  Invite.init(); /* sans await - ne bloque pas */
  Contacts.init();
  Chat.init();

  /* 3. Déterminer et activer la bonne page AVANT d'afficher l'app,
        pour éviter le flash du formulaire de connexion au démarrage */
  const isLoggedIn = !!(savedUser && savedToken);
  const savedRoute = isLoggedIn ? RouteMemory.load() : null;
  if (isLoggedIn) {
    App.currentUser = savedUser;
    App.token = savedToken;
    UI.updateUserInfo();
    await restoreRoute(savedRoute);
  } else {
    Nav.go('auth');
  }

  /* 4. Splash screen */
  await new Promise(resolve => setTimeout(resolve, 2200));
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(() => splash.classList.add('hidden'), 500);
  }
  document.getElementById('app').classList.remove('hidden');

  /* 5. Charger les données du dashboard en arrière-plan (l'écran
        dashboard est déjà actif, donc aucun flash de l'écran login) */
  if (isLoggedIn) {
    Dashboard.load().catch(err => console.error('Dashboard.load failed:', err));
    Chat.startBackgroundRefresh();
  }

  /* 5. Si l'app a été ouverte via un lien d'invitation, pré-remplir et lancer la recherche */
  if (pendingJoinCode) {
    Nav.go('join-tontine');
    const input = document.getElementById('join-code');
    if (input) input.value = pendingJoinCode;
    const res = await API.request('searchTontine', { code: pendingJoinCode });
    if (res.success) {
      const t = res.data;
      document.getElementById('preview-name').textContent    = t.name;
      document.getElementById('preview-amount').textContent  = UI.formatAmount(t.amount);
      document.getElementById('preview-members').textContent = t.members;
      document.getElementById('preview-admin').textContent   = t.admin;
      document.getElementById('preview-start').textContent   = t.start;
      document.getElementById('preview-desc').textContent    = t.desc || '';
      document.getElementById('join-preview')?.classList.remove('hidden');
    } else {
      Toast.show(res.message || 'Tontine introuvable. Vérifiez le code.', 'error');
    }
  }
}

/* Start the app when DOM is ready */
document.addEventListener('DOMContentLoaded', () => {
  try {
    init().catch(err => {
      console.error('Init failed:', err);
      document.getElementById('splash-screen').style.display = 'none';
      document.getElementById('app').classList.remove('hidden');
      Nav.go('auth');
    });
  } catch(e) {
    console.error('Crash:', e);
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
    Nav.go('auth');
  }
});
/* ══════════════════════════════════════════════════════════════════
   APP.JS PATCH — Corrections & améliorations intégrées
   Appliqué après le chargement initial de improvements.js
   ══════════════════════════════════════════════════════════════════ */

/* Override Auth.init pour ajouter rate limiting + validation renforcée */
const _origAuthInit = Auth.init.bind(Auth);
Auth.init = function() {
  _origAuthInit();

  /* Patch login : rate limiting + validation email */
  const loginBtn = document.getElementById('btn-login');
  if (loginBtn) {
    loginBtn.replaceWith(loginBtn.cloneNode(true));
    document.getElementById('btn-login').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const pass  = document.getElementById('login-password').value;

      if (!email || !pass) { Toast.show('Veuillez remplir tous les champs', 'error'); return; }
      if (typeof Validate !== 'undefined' && !Validate.email(email) && !email.includes('+')) {
        if (!/\d/.test(email)) { /* allow phone number */
          Toast.show('Format d\'email invalide', 'error'); return;
        }
      }
      if (typeof RateLimit !== 'undefined' && !RateLimit.check('login')) return;

      UI.setLoading('btn-login', true, 'Connexion...');
      const res = await API.request('login', { email, password: pass });
      UI.setLoading('btn-login', false, 'Se connecter');
      if (res.success) {
        Auth.onLogin(res);
        if (typeof PushNotifications !== 'undefined') {
          setTimeout(() => PushNotifications.request(), 2000);
        }
      } else {
        Toast.show(res.message || 'Identifiants incorrects', 'error');
        if (typeof Validate !== 'undefined') Validate.showError('login-password', 'Mot de passe incorrect');
      }
    });
  }

  /* Patch register : validation renforcée + email de bienvenue */
  const regBtn = document.getElementById('btn-register');
  if (regBtn) {
    regBtn.replaceWith(regBtn.cloneNode(true));
    document.getElementById('btn-register').addEventListener('click', async () => {
      const firstname = document.getElementById('reg-firstname').value.trim();
      const lastname  = document.getElementById('reg-lastname').value.trim();
      const email     = document.getElementById('reg-email').value.trim();
      const phone     = document.getElementById('reg-phone').value.trim();
      const password  = document.getElementById('reg-password').value;

      if (typeof Validate !== 'undefined') Validate.clearErrors();

      let valid = true;
      if (!firstname || firstname.length < 2) {
        if (typeof Validate !== 'undefined') Validate.showError('reg-firstname', 'Minimum 2 caractères');
        valid = false;
      }
      if (!lastname || lastname.length < 2) {
        if (typeof Validate !== 'undefined') Validate.showError('reg-lastname', 'Minimum 2 caractères');
        valid = false;
      }
      if (!email || (typeof Validate !== 'undefined' && !Validate.email(email))) {
        if (typeof Validate !== 'undefined') Validate.showError('reg-email', 'Email invalide');
        valid = false;
      }
      if (!password || password.length < 8) {
        if (typeof Validate !== 'undefined') Validate.showError('reg-password', 'Minimum 8 caractères');
        valid = false;
      }
      if (phone && typeof Validate !== 'undefined' && !Validate.phone(phone)) {
        Validate.showError('reg-phone', 'Format invalide (ex: +225 07 00 00 00)');
        valid = false;
      }
      if (!valid) return;
      if (typeof RateLimit !== 'undefined' && !RateLimit.check('register')) return;

      UI.setLoading('btn-register', true, 'Création...');
      const res = await API.request('register', { firstname, lastname, email, phone, password });
      UI.setLoading('btn-register', false, 'Créer mon compte');
      if (res.success) {
        Auth.onLogin(res);
        /* Afficher onboarding pour les nouveaux */
        setTimeout(() => { if (typeof Onboarding !== 'undefined') Onboarding.show(); }, 1500);
      } else {
        Toast.show(res.message || 'Erreur lors de l\'inscription', 'error');
      }
    });
  }
};

/* Override Auth.logout → confirmation simple */
const _origLogout = Auth.logout.bind(Auth);
Auth.logout = function(force = false) {
  if (force) { _origLogout(); return; }
  if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
    _origLogout();
  }
};

/* Override Dashboard.load pour actualiser le badge notifications */
const _origDashLoad = Dashboard.load.bind(Dashboard);
Dashboard.load = async function() {
  await _origDashLoad();
  /* Update notification count */
  const nRes = await API.request('getNotifications');
  if (nRes.success) {
    const unread = nRes.data?.unread || 0;
    const badge  = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }
  }
};

/* Override TontineDetail.recordPayment pour notif locale après confirmation */
const _origRecord = TontineDetail.recordPayment.bind(TontineDetail);
TontineDetail.recordPayment = async function(memberId, memberName) {
  await _origRecord(memberId, memberName);
  if (typeof PushNotifications !== 'undefined') {
    PushNotifications.showLocal('Paiement confirmé', `${memberName} — mise enregistrée`, '✅');
  }
  if (typeof Logger !== 'undefined') {
    Logger.info('Paiement enregistré', { memberId, memberName, tontineId: App.currentTontine?.id });
  }
};

/* Override Nav.go pour logger la navigation */
const _origNavGo = Nav.go.bind(Nav);
Nav.go = function(page, title = '') {
  _origNavGo(page, title);
  if (typeof Logger !== 'undefined') Logger.info(`Navigation → ${page}`);
};

/* Override CreateTontine btn pour validation renforcée */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const createBtn = document.getElementById('btn-create-tontine');
    if (createBtn) {
      const newBtn = createBtn.cloneNode(true);
      createBtn.parentNode.replaceChild(newBtn, createBtn);
      newBtn.addEventListener('click', async () => {
        const name   = document.getElementById('create-name')?.value.trim();
        const amount = document.getElementById('create-amount')?.value;

        if (typeof Validate !== 'undefined') Validate.clearErrors();
        let valid = true;
        if (!name || name.length < 3) {
          if (typeof Validate !== 'undefined') Validate.showError('create-name', 'Minimum 3 caractères');
          valid = false;
        }
        if (!amount || isNaN(amount) || Number(amount) < 100) {
          if (typeof Validate !== 'undefined') Validate.showError('create-amount', 'Montant minimum : 100 FCFA');
          valid = false;
        }
        if (!valid) return;

        const frequency  = document.getElementById('create-frequency')?.value;
        const maxMembers = parseInt(document.getElementById('create-max-members')?.value) || 10;
        const startDate  = document.getElementById('create-start-date')?.value;
        const desc       = document.getElementById('create-desc')?.value.trim();

        if (maxMembers < 2 || maxMembers > 50) {
          if (typeof Validate !== 'undefined') Validate.showError('create-max-members', 'Entre 2 et 50 membres');
          return;
        }

        UI.setLoading('btn-create-tontine', true, 'Création en cours...');
        const res = await API.request('createTontine', {
          name, description: desc, amount: Number(amount), frequency,
          maxMembers, startDate,
          requireApproval: document.getElementById('create-approval')?.checked,
          publicLog:       document.getElementById('create-public-log')?.checked,
          randomOrder:     document.getElementById('create-random-order')?.checked,
          penalties:       document.getElementById('create-penalties')?.checked
        });
        UI.setLoading('btn-create-tontine', false, 'Créer la tontine');

        if (res.success) {
          Toast.show(`✨ Tontine "${name}" créée !`, 'success');
          if (typeof PushNotifications !== 'undefined') {
            PushNotifications.showLocal('Tontine créée !', `"${name}" est prête. Invitez vos membres.`, '🌿');
          }
          /* Reset form */
          ['create-name','create-desc','create-amount'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
          });
          await Dashboard.load();
          setTimeout(() => TontineDetail.open(res.data), 500);
        } else {
          Toast.show(res.message || 'Erreur lors de la création', 'error');
        }
      });
    }

    /* Patch join tontine : validation code */
    const joinSearchBtn = document.getElementById('btn-join-search');
    if (joinSearchBtn) {
      const newJoinBtn = joinSearchBtn.cloneNode(true);
      joinSearchBtn.parentNode.replaceChild(newJoinBtn, joinSearchBtn);
      newJoinBtn.addEventListener('click', async () => {
        const code = document.getElementById('join-code')?.value.trim().toUpperCase();
        if (!code) { Toast.show('Entrez un code d\'invitation', 'error'); return; }
        if (typeof Validate !== 'undefined' && !Validate.code(code)) {
          Toast.show('Format invalide. Ex: TF-ABC123', 'error');
          if (typeof Validate !== 'undefined') Validate.showError('join-code', 'Format: TF-XXXXXX');
          return;
        }
        UI.setLoading('btn-join-search', true, 'Recherche...');
        const res = await API.request('searchTontine', { code });
        UI.setLoading('btn-join-search', false, 'Rechercher');
        if (res.success) {
          const t = res.data;
          document.getElementById('preview-name').textContent    = t.name;
          document.getElementById('preview-amount').textContent  = UI.formatAmount(t.amount);
          document.getElementById('preview-members').textContent = t.members;
          document.getElementById('preview-admin').textContent   = t.admin;
          document.getElementById('preview-start').textContent   = t.start;
          document.getElementById('preview-desc').textContent    = t.desc || '';
          document.getElementById('join-preview').classList.remove('hidden');
        } else {
          Toast.show('Tontine introuvable. Vérifiez le code.', 'error');
          if (typeof Validate !== 'undefined') Validate.showError('join-code', 'Code non trouvé');
        }
      });
    }

    /* Export buttons dans transactions */
    const txExportBtn = document.getElementById('btn-export-tx-csv');
    if (txExportBtn) {
      txExportBtn.addEventListener('click', () => {
        if (typeof Exporter !== 'undefined') Exporter.exportTransactionsCSV(Transactions.data || []);
      });
    }

  }, 3000);
});

/* UI helper: togglePassword */
UI.togglePassword = function(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
};

console.log('[Tontines Facile] app.js patch chargé ✓');
