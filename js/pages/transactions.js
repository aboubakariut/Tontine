/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — HISTORIQUE FINANCIER (PAGE TRANSACTIONS)
 * Fichier : js/pages/transactions.js
 * Rôle : Affiche l'historique complet des cotisations et réceptions de
 *        cagnottes, avec filtres par statut et export CSV.
 * ═══════════════════════════════════════════════════════════════════
 */

const Transactions = {
  // Liste en cache des transactions chargées
  data: [],

  /**
   * Charge l'historique des transactions depuis l'API
   */
  async load() {
    const list = document.getElementById('transactions-list');
    if (list) list.innerHTML = UI.skeletonRows(4);

    const res = await API.request('getTransactions');
    if (!res.success || !res.data.length) {
      if (list) list.innerHTML = '<div class="empty-state"><p>Aucune transaction enregistrée pour l\'instant</p></div>';
      this.data = [];
      return;
    }

    this.data = res.data;
    if (list) {
      list.innerHTML = '';
      res.data.forEach(tx => list.appendChild(this.txCard(tx)));
    }

    // Configuration des puces de filtrage (Toutes, Payées, En attente, Cagnottes)
    document.querySelectorAll('#page-transactions .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#page-transactions .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const f = chip.dataset.filter;
        const filtered = f === 'all' ? this.data :
          f === 'paid' ? this.data.filter(t => t.status === 'paid') :
          f === 'pending' ? this.data.filter(t => t.status === 'pending') :
          this.data.filter(t => t.type === 'out');

        list.innerHTML = '';
        if (!filtered.length) {
          list.innerHTML = '<div class="empty-state small"><p>Aucune transaction correspondante</p></div>';
        } else {
          filtered.forEach(tx => list.appendChild(this.txCard(tx)));
        }
      });
    });
  },

  /**
   * Génère l'élément DOM d'une ligne de transaction
   * @param {object} tx - Donnée de la transaction
   * @returns {HTMLElement}
   */
  txCard(tx) {
    const div = document.createElement('div');
    div.className = 'transaction-item';
    const isOut = tx.type === 'out'; // 'out' = versement de cagnotte gagnée

    div.innerHTML = `
      <div class="tx-icon ${tx.type}">
        <svg viewBox="0 0 24 24">${isOut
          ? '<line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="19 12 12 19 5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
          : '<line x1="12" y1="19" x2="12" y2="5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="5 12 12 5 19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
        }</svg>
      </div>
      <div class="tx-info">
        <p class="tx-name">${UI.escapeHtml(tx.name)}</p>
        <p class="tx-tontine">${UI.escapeHtml(tx.tontine)}</p>
      </div>
      <div class="tx-right">
        <p class="tx-amount ${tx.type}">${isOut ? '-' : '+'}${UI.formatAmount(tx.amount)}</p>
        <p class="tx-date">${tx.date}</p>
      </div>
    `;
    return div;
  }
};

// Exposer globalement
window.Transactions = Transactions;
