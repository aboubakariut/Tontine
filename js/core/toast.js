/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — SYSTÈME DE NOTIFICATIONS TOAST
 * Fichier : js/core/toast.js
 * Rôle : Affiche des messages d'information temporaires et animés
 *        à l'utilisateur (succès, erreur, avertissement, info).
 * ═══════════════════════════════════════════════════════════════════
 */

const Toast = {
  /**
   * Affiche un message toast flottant
   * @param {string} message - Texte ou notification à afficher
   * @param {'success'|'error'|'warning'|'info'} type - Type visuel de l'alerte
   * @param {number} duration - Durée d'affichage en millisecondes (défaut: 3500ms)
   */
  show(message, type = 'info', duration = 3500) {
    // Récupérer le conteneur HTML global des toasts
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Création de l'élément toast DOM
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Dictionnaire d'émojis selon la sévérité
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    // Construction du contenu HTML interne sécurisé
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <span class="toast-text">${message}</span>
    `;

    // Insertion dans le conteneur visible
    container.appendChild(toast);

    // Déclenchement de la disparition après le délai configuré
    setTimeout(() => {
      toast.classList.add('fade-out');
      // Suppression définitive du DOM après l'animation CSS (300ms)
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// Exposer globalement
window.Toast = Toast;
