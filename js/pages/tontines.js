/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — MES TONTINES (PAGE LISTE TONTINES)
 * Fichier : js/pages/tontines.js
 * Rôle : Gère l'affichage de l'ensemble des tontines de l'utilisateur,
 *        avec recherche par nom et filtrage par statut.
 * ═══════════════════════════════════════════════════════════════════
 */

const MyTontines = {
  // Cache local des tontines chargées
  data: [],

  /**
   * Effectue le rendu de la liste complète des tontines avec recherche et filtres
   * @param {Array} tontines - Tableau des tontines récupérées depuis l'API
   */
  render(tontines) {
    this.data = tontines || [];
    const list = document.getElementById('my-tontines-list');
    if (!list) return;

    list.innerHTML = '';

    // Si aucune tontine n'existe
    if (!this.data.length) {
      list.innerHTML = UI.emptyState('Vous ne participez à aucune tontine pour l\'instant', 'create-tontine', 'Créer une tontine');
      return;
    }

    // Afficher chaque carte de tontine
    this.data.forEach(t => list.appendChild(UI.tontineCard(t)));

    // 1. Écoute du champ de recherche textuelle
    const searchInput = document.getElementById('search-tontines');
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';

      let filtered = this.data.filter(t => (t.name || '').toLowerCase().includes(q));
      if (activeFilter !== 'all') {
        filtered = filtered.filter(t => t.status === activeFilter);
      }

      list.innerHTML = '';
      if (!filtered.length) {
        list.innerHTML = '<div class="empty-state small"><p>Aucune tontine ne correspond à votre recherche</p></div>';
      } else {
        filtered.forEach(t => list.appendChild(UI.tontineCard(t)));
      }
    });

    // 2. Écoute des filtres par statut (Toutes, En cours, Terminées)
    document.querySelectorAll('#page-my-tontines .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#page-my-tontines .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const filter = chip.dataset.filter;
        const q = (document.getElementById('search-tontines')?.value || '').trim().toLowerCase();

        let filtered = filter === 'all' ? this.data : this.data.filter(t => t.status === filter);
        if (q) {
          filtered = filtered.filter(t => (t.name || '').toLowerCase().includes(q));
        }

        list.innerHTML = '';
        if (!filtered.length) {
          list.innerHTML = '<div class="empty-state small"><p>Aucune tontine pour ce filtre</p></div>';
        } else {
          filtered.forEach(t => list.appendChild(UI.tontineCard(t)));
        }
      });
    });
  }
};

// Exposer globalement
window.MyTontines = MyTontines;
