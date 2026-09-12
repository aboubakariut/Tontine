/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — REJOINDRE UNE TONTINE (PAGE JOIN TONTINE)
 * Fichier : js/pages/join-tontine.js
 * Rôle : Permet de rechercher une tontine via son code d'invitation
 *        (ex: TF-FAM001), d'en prévisualiser les règles et d'adhérer.
 * ═══════════════════════════════════════════════════════════════════
 */

const JoinTontine = {
  /**
   * Initialise les écouteurs de la page d'adhésion
   */
  init() {
    // 1. Bouton de recherche par code d'invitation
    document.getElementById('btn-join-search')?.addEventListener('click', async () => {
      const code = document.getElementById('join-code')?.value.trim().toUpperCase();
      if (!code) {
        Toast.show('Veuillez entrer un code d\'invitation', 'error');
        return;
      }

      UI.setLoading('btn-join-search', true, 'Recherche...');
      const res = await API.request('searchTontine', { code });
      UI.setLoading('btn-join-search', false, 'Rechercher');

      if (res.success) {
        const t = res.data;
        // Remplir la fiche de prévisualisation
        const nameEl = document.getElementById('preview-name');
        const amountEl = document.getElementById('preview-amount');
        const membersEl = document.getElementById('preview-members');
        const adminEl = document.getElementById('preview-admin');
        const startEl = document.getElementById('preview-start');
        const descEl = document.getElementById('preview-desc');
        const previewBox = document.getElementById('join-preview');

        if (nameEl) nameEl.textContent = t.name;
        if (amountEl) amountEl.textContent = UI.formatAmount(t.amount);
        if (membersEl) membersEl.textContent = t.members;
        if (adminEl) adminEl.textContent = t.admin;
        if (startEl) startEl.textContent = t.start;
        if (descEl) descEl.textContent = t.desc;

        if (previewBox) previewBox.classList.remove('hidden');
      } else {
        Toast.show(res.message || 'Tontine introuvable avec ce code.', 'error');
      }
    });

    // 2. Bouton de confirmation de la demande d'adhésion
    document.getElementById('btn-confirm-join')?.addEventListener('click', async () => {
      // Blocage en mode démonstration
      if (App.checkDemoRestriction('rejoindre cette tontine')) return;

      const code = document.getElementById('join-code')?.value.trim().toUpperCase();
      if (!code) return;

      UI.setLoading('btn-confirm-join', true, 'Envoi de la demande...');
      const res = await API.request('joinTontine', { code });
      UI.setLoading('btn-confirm-join', false, 'Envoyer ma demande d\'adhésion');

      if (res.success) {
        Toast.show(res.message || '🎉 Demande d\'adhésion envoyée !', 'success');
        document.getElementById('join-preview')?.classList.add('hidden');
        document.getElementById('join-code').value = '';
        if (typeof Dashboard !== 'undefined') Dashboard.load();
        Nav.go('dashboard', 'Tableau de bord');
      } else {
        Toast.show(res.message || 'Impossible de rejoindre cette tontine', 'error');
      }
    });
  }
};

// Exposer globalement
window.JoinTontine = JoinTontine;
