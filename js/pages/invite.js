/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — INVITATIONS & PARTAGE (PAGE INVITE)
 * Fichier : js/pages/invite.js
 * Rôle : Permet aux administrateurs et membres d'inviter des proches
 *        par email direct ou en partageant un lien d'adhésion sécurisé.
 * ═══════════════════════════════════════════════════════════════════
 */

const Invite = {
  tontines: [],

  /**
   * Initialise les formulaires de partage et d'invitation
   */
  async init() {
    // 1. Bouton d'envoi de l'invitation par email
    document.getElementById('btn-send-invite')?.addEventListener('click', async () => {
      if (App.checkDemoRestriction('envoyer une invitation par email')) return;

      const select = document.getElementById('invite-tontine-select');
      const tontineId = select?.value;
      const email = document.getElementById('invite-email')?.value.trim();
      const message = document.getElementById('invite-message')?.value.trim();

      if (!tontineId) {
        Toast.show('Veuillez sélectionner une tontine', 'error');
        return;
      }
      if (!email) {
        Toast.show('Veuillez entrer une adresse email valide', 'error');
        return;
      }

      UI.setLoading('btn-send-invite', true, 'Envoi en cours...');
      const res = await API.request('sendInvite', { tontineId, email, message });
      UI.setLoading('btn-send-invite', false, 'Envoyer l\'invitation');

      if (res.success) {
        Toast.show(`✉️ Invitation envoyée à ${email} !`, 'success');
        document.getElementById('invite-email').value = '';
        document.getElementById('invite-message').value = '';
      } else {
        Toast.show(res.message || 'Impossible d\'envoyer l\'invitation', 'error');
      }
    });

    // 2. Mise à jour du code quand on change la tontine sélectionnée
    document.getElementById('invite-tontine-select')?.addEventListener('change', (e) => {
      this.updateCodeAndLink(e.target.value);
    });

    // 3. Bouton de copie du code d'invitation
    document.getElementById('btn-copy-tontine-code')?.addEventListener('click', () => {
      const code = document.getElementById('invite-tontine-code')?.textContent;
      if (code) UI.copyText(code);
    });

    // 4. Bouton de copie du lien d'invitation direct
    document.getElementById('btn-copy-tontine-link')?.addEventListener('click', () => {
      const link = document.getElementById('invite-tontine-link')?.value;
      if (link) UI.copyText(link);
    });
  },

  /**
   * Met à jour le code et le lien affichés selon la tontine choisie
   */
  updateCodeAndLink(tontineId) {
    const t = App.demoData?.tontines?.find(item => String(item.id) === String(tontineId)) || App.currentTontine;
    const code = t?.inviteCode || t?.invite_code || 'TF-INVITE';
    const codeEl = document.getElementById('invite-tontine-code');
    const linkEl = document.getElementById('invite-tontine-link');

    if (codeEl) codeEl.textContent = code;
    if (linkEl) linkEl.value = `${window.location.origin}/join/${code}`;
  }
};

// Exposer globalement
window.Invite = Invite;
