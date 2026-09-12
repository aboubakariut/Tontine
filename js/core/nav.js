/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — ROUTEUR ET NAVIGATION INTERNE (SPA)
 * Fichier : js/core/nav.js
 * Rôle : Gère les transitions fluides entre pages virtuelles sans
 *        rechargement de page, la pile d'historique et la topbar.
 * ═══════════════════════════════════════════════════════════════════
 */

const Nav = {
  // Pile d'historique de navigation interne pour le bouton retour
  history: [],

  /**
   * Navigue vers une page spécifique
   * @param {string} page - Identifiant de la page (ex: 'dashboard', 'tontine-detail')
   * @param {string} title - Titre affiché sur la topbar
   * @param {boolean} isBack - Vrai s'il s'agit d'un retour en arrière (évite d'empiler)
   */
  go(page, title = '', isBack = false) {
    // Si on navigue en avant, empiler la page précédente dans l'historique
    if (!isBack && App.currentPage && App.currentPage !== page && App.currentPage !== 'auth') {
      this.history.push({ page: App.currentPage, title: this._getCurrentTitle() });
    }

    // Masquer toutes les pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Afficher la page cible
    const target = document.getElementById(`page-${page}`);
    if (target) {
      target.classList.add('active');
    } else {
      console.warn(`[Nav] Page introuvable : #page-${page}`);
    }

    // Mettre à jour la page courante
    App.currentPage = page;

    // Mise à jour de la barre supérieure (topbar)
    this._updateTopbar(page, title);

    // Mise à jour des icônes actives de la barre de navigation basse (bottom-nav)
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Mémoriser la route pour restaurer la session au rechargement
    if (page !== 'auth' && typeof RouteMemory !== 'undefined') {
      RouteMemory.save(page, title);
    }

    // Fermer le menu déroulant s'il était ouvert
    this.closeMenu();

    // Faire défiler l'écran vers le haut
    window.scrollTo(0, 0);
  },

  /**
   * Revient à l'écran précédent dans la pile d'historique
   */
  back() {
    if (this.history.length > 0) {
      const prev = this.history.pop();
      this.go(prev.page, prev.title, true);
    } else {
      this.go('dashboard', 'Tableau de bord', true);
    }
  },

  /**
   * Met à jour les éléments de la barre supérieure selon la page
   */
  _updateTopbar(page, title) {
    const isRootPage = ['dashboard', 'my-tontines', 'transactions', 'profile'].includes(page);
    const logoEl = document.getElementById('topbar-logo');
    const titleEl = document.getElementById('topbar-title');
    const backBtn = document.getElementById('btn-back');
    const chatInfoEl = document.getElementById('topbar-chat-info');

    // Masquer les infos de chat par défaut
    if (chatInfoEl) chatInfoEl.classList.add('hidden');

    if (isRootPage) {
      // Pages racines : affichage du logo principal
      if (logoEl) logoEl.classList.remove('hidden');
      if (titleEl) titleEl.classList.add('hidden');
      if (backBtn) backBtn.style.display = 'none';
    } else if (page === 'chat-thread') {
      // Page de discussion chat : avatar et nom du contact dans la topbar
      if (logoEl) logoEl.classList.add('hidden');
      if (titleEl) titleEl.classList.add('hidden');
      if (chatInfoEl) chatInfoEl.classList.remove('hidden');
      if (backBtn) backBtn.style.display = 'flex';
    } else {
      // Pages enfants (détail, création, etc.) : bouton retour et titre de section
      if (logoEl) logoEl.classList.add('hidden');
      if (titleEl) {
        titleEl.textContent = title || page;
        titleEl.classList.remove('hidden');
      }
      if (backBtn) backBtn.style.display = 'flex';
    }
  },

  /**
   * Récupère le titre de la page actuelle
   */
  _getCurrentTitle() {
    const titleEl = document.getElementById('topbar-title');
    return (titleEl && !titleEl.classList.contains('hidden')) ? titleEl.textContent : '';
  },

  /**
   * Ouvre ou ferme le menu déroulant utilisateur
   */
  toggleMenu() {
    const menu = document.getElementById('dropdown-menu');
    if (menu) menu.classList.toggle('hidden');
  },

  /**
   * Ferme le menu déroulant
   */
  closeMenu() {
    const menu = document.getElementById('dropdown-menu');
    if (menu) menu.classList.add('hidden');
  }
};

// Exposer globalement
window.Nav = Nav;
