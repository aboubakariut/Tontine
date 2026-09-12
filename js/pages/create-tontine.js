/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — CRÉATION DE TONTINE (PAGE CREATE TONTINE)
 * Fichier : js/pages/create-tontine.js
 * Rôle : Gère le formulaire de configuration et création d'une
 *        nouvelle tontine (montant, fréquence, règles, membres max).
 * ═══════════════════════════════════════════════════════════════════
 */

const CreateTontine = {
  /**
   * Initialise le formulaire de création
   */
  init() {
    // Définir la date de début par défaut à aujourd'hui
    const dateInput = document.getElementById('create-start-date');
    if (dateInput) {
      dateInput.valueAsDate = new Date();
    }

    // Écoute du bouton principal de création
    const createBtn = document.getElementById('btn-create-tontine');
    createBtn?.addEventListener('click', async () => {
      // Vérification du mode démo
      if (App.checkDemoRestriction('créer une tontine')) return;

      const name = document.getElementById('create-name')?.value.trim();
      const desc = document.getElementById('create-desc')?.value.trim();
      const amount = parseInt(document.getElementById('create-amount')?.value, 10);
      const frequency = document.getElementById('create-frequency')?.value;
      const maxMembers = parseInt(document.getElementById('create-max-members')?.value, 10) || 10;
      const startDate = document.getElementById('create-start-date')?.value;

      // Validations côté client
      if (!name || name.length < 3) {
        Toast.show('Le nom de la tontine doit contenir au moins 3 caractères', 'error');
        return;
      }
      if (!amount || amount < 100) {
        Toast.show('Le montant minimum par cotisation est de 100 FCFA', 'error');
        return;
      }
      if (maxMembers < 2 || maxMembers > 50) {
        Toast.show('Le nombre de membres doit être compris entre 2 et 50', 'error');
        return;
      }

      UI.setLoading('btn-create-tontine', true, 'Création en cours...');
      const res = await API.request('createTontine', {
        name,
        description: desc,
        amount,
        frequency,
        maxMembers,
        startDate,
        requireApproval: document.getElementById('create-approval')?.checked || false,
        publicLog: document.getElementById('create-public-log')?.checked || true,
        randomOrder: document.getElementById('create-random-order')?.checked || false,
        penalties: document.getElementById('create-penalties')?.checked || false
      });
      UI.setLoading('btn-create-tontine', false, 'Créer la tontine');

      if (res.success) {
        Toast.show(`✨ Tontine "${name}" créée avec succès !`, 'success');
        // Réinitialiser les champs du formulaire
        document.getElementById('create-name').value = '';
        document.getElementById('create-desc').value = '';
        document.getElementById('create-amount').value = '';

        // Actualiser le tableau de bord et ouvrir la tontine
        if (typeof Dashboard !== 'undefined') Dashboard.load();
        if (typeof TontineDetail !== 'undefined' && res.data) {
          setTimeout(() => TontineDetail.open(res.data), 400);
        }
      } else {
        Toast.show(res.message || 'Erreur lors de la création de la tontine', 'error');
      }
    });
  }
};

// Exposer globalement
window.CreateTontine = CreateTontine;
