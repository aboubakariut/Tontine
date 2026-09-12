/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — PARAMÈTRES & PERSONNALISATION (PAGE SETTINGS)
 * Fichier : js/pages/settings.js
 * Rôle : Gère les préférences visuelles (thèmes sombre/émeraude/ambre),
 *        les options de confidentialité et le code d'accès de l'app.
 * ═══════════════════════════════════════════════════════════════════
 */

const Settings = {
  /**
   * Applique les paramètres stockés en mémoire au démarrage
   */
  applyStored() {
    const saved = Storage.load('settings');
    if (saved) {
      App.settings = Object.assign(App.settings, saved);
    }
    this.applyTheme(App.settings.theme || 'emerald');
  },

  /**
   * Applique un thème CSS sur l'élément racine
   * @param {string} themeName - Identifiant du thème
   */
  applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    App.settings.theme = themeName;
    Storage.save('settings', App.settings);

    // Mettre à jour l'état visuel actif des boutons de thème
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
  },

  /**
   * Initialise les écouteurs de la page des paramètres
   */
  init() {
    // 1. Boutons de sélection de thèmes
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        if (theme) this.applyTheme(theme);
      });
    });

    // 2. Bascule masquer / afficher les montants financiers
    const hideAmountsToggle = document.getElementById('toggle-hide-amounts');
    if (hideAmountsToggle) {
      hideAmountsToggle.checked = !!App.settings.security?.hideAmounts;
      hideAmountsToggle.addEventListener('change', (e) => {
        App.settings.security.hideAmounts = e.target.checked;
        Storage.save('settings', App.settings);
        if (typeof Dashboard !== 'undefined') Dashboard.load();
        Toast.show(e.target.checked ? 'Montants masqués à l\'écran' : 'Montants visibles', 'info');
      });
    }

    // 3. Déconnexion depuis les paramètres
    document.getElementById('btn-logout-settings')?.addEventListener('click', () => {
      if (typeof Auth !== 'undefined' && Auth.logout) {
        Auth.logout();
      }
    });
  }
};

// Exposer globalement
window.Settings = Settings;
