/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — MODULE D'AUTHENTIFICATION (PAGE AUTH)
 * Fichier : js/pages/auth.js
 * Rôle : Gère la connexion, l'inscription, la jauge de sécurité du
 *        mot de passe, le mode démo et la déconnexion.
 * ═══════════════════════════════════════════════════════════════════
 */

const Auth = {
  /**
   * Initialise les écouteurs d'événements de l'écran d'authentification
   */
  init() {
    // 1. Bascule entre onglet "Connexion" et "Inscription"
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        // Retirer la classe active de tous les onglets et formulaires
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

        // Activer l'onglet cliqué
        tab.classList.add('active');
        const targetForm = document.getElementById(`form-${tab.dataset.tab}`);
        if (targetForm) targetForm.classList.add('active');
      });
    });

    // 2. Formulaire de connexion
    const loginForm = document.getElementById('form-login');
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault(); // Empêche le rechargement de page natif du formulaire

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        Toast.show('Veuillez remplir tous les champs', 'error');
        return;
      }

      UI.setLoading('btn-login-submit', true, 'Connexion en cours...');
      const res = await API.request('login', { email, password });
      UI.setLoading('btn-login-submit', false, 'Se connecter');

      if (res.success) {
        this.onLogin(res);
      } else {
        Toast.show(res.message || 'Identifiants incorrects', 'error');
      }
    });

    // 3. Formulaire d'inscription
    const regForm = document.getElementById('form-register');
    regForm?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const firstname = document.getElementById('reg-firstname').value.trim();
      const lastname = document.getElementById('reg-lastname').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const password = document.getElementById('reg-password').value;

      // Vérifications côté client
      if (!firstname || !lastname || !email || !password) {
        Toast.show('Veuillez renseigner tous les champs obligatoires', 'error');
        return;
      }
      if (password.length < 8) {
        Toast.show('Le mot de passe doit contenir au moins 8 caractères', 'error');
        return;
      }

      UI.setLoading('btn-register-submit', true, 'Création du compte...');
      const res = await API.request('register', { firstname, lastname, email, phone, password });
      UI.setLoading('btn-register-submit', false, 'Créer mon compte');

      if (res.success) {
        Toast.show('Compte créé avec succès ! Bienvenue.', 'success');
        this.onLogin(res);
      } else {
        Toast.show(res.message || 'Erreur lors de l\'inscription', 'error');
      }
    });

    // 4. Bouton d'accès direct en mode Démonstration
    document.getElementById('btn-demo')?.addEventListener('click', async () => {
      UI.setLoading('btn-demo', true, 'Chargement de la démo...');
      const res = await API.request('demo');
      UI.setLoading('btn-demo', false, 'Essayer en démo');
      if (res.success) {
        this.onLogin(res);
      }
    });

    // 5. Jauge dynamique de force du mot de passe
    document.getElementById('reg-password')?.addEventListener('input', (e) => {
      const v = e.target.value;
      let score = 0;
      if (v.length >= 8) score++;
      if (/[A-Z]/.test(v)) score++;
      if (/[0-9]/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      const bar = document.getElementById('password-strength');
      if (bar) bar.dataset.level = score;
    });

    // 6. Bascule afficher/masquer le mot de passe (œil)
    document.querySelectorAll('.btn-eye').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        if (input) {
          input.type = input.type === 'password' ? 'text' : 'password';
        }
      });
    });
  },

  /**
   * Traite la réussite d'une connexion (réelle ou démo)
   * @param {object} res - Données retournées par le serveur
   */
  onLogin(res) {
    // Effacer les résidus d'une session précédente
    Storage.remove('user');
    Storage.remove('token');
    RouteMemory.clear();
    App.currentUser = null;

    // Récupérer le profil et le token
    const user = res.data?.user ?? res.user;
    const token = res.data?.token ?? res.token;

    App.currentUser = user;
    App.token = token;
    Storage.save('user', user);
    Storage.save('token', token);

    // Afficher ou masquer la bannière persistante selon le mode démo
    const banner = document.getElementById('demo-banner');
    if (banner) {
      if (App.isDemoMode()) {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }

    // Mettre à jour l'en-tête (avatar, prénom)
    setTimeout(() => {
      UI.updateUserInfo();
    }, 100);

    // Charger les données du tableau de bord
    if (typeof Dashboard !== 'undefined' && Dashboard.load) {
      Dashboard.load();
    }

    // Démarrer le rafraîchissement des conversations en arrière-plan
    if (typeof Chat !== 'undefined' && Chat.startBackgroundRefresh) {
      Chat.startBackgroundRefresh();
    }

    // Redirection vers le tableau de bord
    Nav.go('dashboard', 'Tableau de bord');
    Toast.show(`Bienvenue, ${user?.firstname || user?.email || ''} ! 👋`, 'success');
  },

  /**
   * Quitte instantanément la visite démo et renvoie vers la page d'authentification
   * @param {'login'|'register'} tab - Onglet à présélectionner
   */
  exitDemoToAuth(tab = 'login') {
    App.currentUser = null;
    App.token = null;
    Storage.remove('user');
    Storage.remove('token');
    RouteMemory.clear();
    Nav.history = [];

    const banner = document.getElementById('demo-banner');
    if (banner) banner.classList.add('hidden');

    Nav.go('auth');

    // Basculer sur l'onglet souhaité
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    const targetTab = document.querySelector(`.auth-tab[data-tab="${tab}"]`);
    const targetForm = document.getElementById(`form-${tab}`);
    if (targetTab) targetTab.classList.add('active');
    if (targetForm) targetForm.classList.add('active');
  },

  /**
   * Déconnexion sécurisée de l'application
   */
  logout() {
    if (!window.confirm('Se déconnecter de Tontines Facile ?')) return;
    App.currentUser = null;
    App.token = null;
    Storage.remove('user');
    Storage.remove('token');
    RouteMemory.clear();
    Nav.history = [];

    const banner = document.getElementById('demo-banner');
    if (banner) banner.classList.add('hidden');

    // Rechargement propre de la page d'accueil
    window.location.href = '/';
  }
};

// Exposer globalement
window.Auth = Auth;
