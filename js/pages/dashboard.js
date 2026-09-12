/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — TABLEAU DE BORD (PAGE DASHBOARD)
 * Fichier : js/pages/dashboard.js
 * Rôle : Charge et affiche la synthèse financière (épargne totale,
 *        tontines en cours, prochaine échéance) et le flux d'activité.
 * ═══════════════════════════════════════════════════════════════════
 */

const Dashboard = {
  /**
   * Charge l'ensemble des données du tableau de bord
   */
  async load() {
    // 1. Mise en place des squelettes de chargement (expérience visuelle fluide)
    const listEl = document.getElementById('dashboard-tontines-list');
    const actElInit = document.getElementById('dashboard-activity-list');
    const myTontinesListEl = document.getElementById('my-tontines-list');
    const statIds = ['stat-active', 'stat-savings', 'stat-next', 'stat-members'];

    statIds.forEach(id => document.getElementById(id)?.classList.add('text-skeleton'));
    if (listEl) listEl.innerHTML = UI.skeletonCards(2);
    if (actElInit) actElInit.innerHTML = UI.skeletonRows(3);
    if (myTontinesListEl && (!MyTontines.data || !MyTontines.data.length)) {
      myTontinesListEl.innerHTML = UI.skeletonCards(3);
    }

    // 2. Récupération des tontines de l'utilisateur
    const res = await API.request('getTontines');
    const tontines = res.success ? (res.data || []) : [];

    // 3. Calcul des métriques statistiques
    const active = tontines.filter(t => t.status === 'active').length;
    // Calcul de l'épargne cumulée basé sur la cagnotte (pot) ou montant
    const savings = tontines.reduce((sum, t) => sum + (parseFloat(t.pot) || parseFloat(t.amount) || 0), 0);
    const members = tontines.reduce((sum, t) => sum + (t.currentMembers || 0), 0);

    // Formatage de la date de la prochaine cotisation
    const rawNextDate = tontines[0]?.nextPaymentDate;
    let formattedNextDate = '—';
    if (rawNextDate) {
      const nd = new Date(rawNextDate);
      formattedNextDate = isNaN(nd.getTime()) ? rawNextDate : nd.toLocaleDateString('fr-FR');
    }

    // 4. Injection des valeurs dans les cartes de statistiques
    const statActive = document.getElementById('stat-active');
    const statSavings = document.getElementById('stat-savings');
    const statNext = document.getElementById('stat-next');
    const statMembers = document.getElementById('stat-members');

    if (statActive) statActive.textContent = active;
    if (statSavings) statSavings.textContent = UI.formatAmount(savings);
    if (statNext) statNext.textContent = formattedNextDate;
    if (statMembers) statMembers.textContent = members;

    // Retrait des classes squelettes
    statIds.forEach(id => document.getElementById(id)?.classList.remove('text-skeleton'));

    // 5. Rendu de la liste abrégée des tontines (max 3 sur l'accueil)
    if (listEl) {
      listEl.innerHTML = '';
      if (!tontines.length) {
        listEl.innerHTML = UI.emptyState('Aucune tontine active pour le moment', 'create-tontine', 'Créer une tontine');
      } else {
        tontines.slice(0, 3).forEach(t => listEl.appendChild(UI.tontineCard(t)));
      }
    }

    // 6. Activité récente (journal global)
    const logRes = await API.request('getGlobalLog');
    const actEl = document.getElementById('dashboard-activity-list');
    if (actEl) {
      actEl.innerHTML = '';
      // Support universel : objet paginé { items: [...] } ou tableau direct [...]
      const logEntries = Array.isArray(logRes.data) ? logRes.data : (logRes.data?.items || []);
      if (logRes.success && logEntries.length) {
        logEntries.slice(0, 4).forEach(entry => actEl.appendChild(UI.activityItem(entry)));
      } else {
        actEl.innerHTML = '<div class="empty-state small"><p>Aucune activité récente</p></div>';
      }
    }

    // 7. Synchroniser également la page complète "Mes Tontines"
    if (typeof MyTontines !== 'undefined' && MyTontines.render) {
      MyTontines.render(tontines);
    }
  }
};

// Exposer globalement
window.Dashboard = Dashboard;
