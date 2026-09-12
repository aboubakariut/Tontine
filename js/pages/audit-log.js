/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — JOURNAL D'AUDIT PUBLIC (PAGE AUDIT LOG)
 * Fichier : js/pages/audit-log.js
 * Rôle : Assure la transparence intégrale de toutes les opérations
 *        effectuées (qui a payé, qui a reçu, qui a été approuvé).
 * ═══════════════════════════════════════════════════════════════════
 */

const AuditLog = {
  // Liste des entrées du journal
  data: [],

  /**
   * Charge les entrées du journal d'audit
   */
  async load() {
    const list = document.getElementById('audit-log-list');
    if (list) list.innerHTML = UI.skeletonRows(5);

    const res = await API.request('getGlobalLog');
    // Normalisation : supporte le format paginé { items: [...] } ou le tableau direct
    const entries = Array.isArray(res.data) ? res.data : (res.data?.items || []);

    if (!res.success || !entries.length) {
      if (list) list.innerHTML = '<div class="empty-state"><p>Aucune entrée dans le journal pour l\'instant</p></div>';
      this.data = [];
      return;
    }

    this.data = entries;
    if (list) {
      list.innerHTML = '';
      this.render(entries);
    }

    // Initialiser les filtres s'ils sont disponibles
    if (typeof AuditFilter !== 'undefined' && AuditFilter.init) {
      AuditFilter.init(entries);
    }
  },

  /**
   * Effectue le rendu de la liste des entrées du journal
   * @param {Array} entries - Tableau des événements
   */
  render(entries) {
    const list = document.getElementById('audit-log-list');
    if (!list) return;
    list.innerHTML = '';

    entries.forEach(entry => {
      const div = document.createElement('div');
      div.className = `log-item ${entry.type || 'system'}`;
      div.innerHTML = `
        <p class="log-action">${UI.escapeHtml(entry.action)}</p>
        <p class="log-detail">${UI.escapeHtml(entry.detail)}</p>
        <div class="log-meta">
          <span class="log-user">@${UI.escapeHtml(entry.user || 'Système')}</span>
          <span class="log-time">${entry.time || ''}</span>
        </div>
      `;
      list.appendChild(div);
    });
  }
};

// Exposer globalement
window.AuditLog = AuditLog;
