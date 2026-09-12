/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — PROFIL PERSONNEL (PAGE PROFILE)
 * Fichier : js/pages/profile.js
 * Rôle : Gère les informations personnelles de l'utilisateur,
 *        l'avatar photo, le changement de mot de passe et le parrainage.
 * ═══════════════════════════════════════════════════════════════════
 */

const Profile = {
  /**
   * Remplit les champs de la page profil avec les données de l'utilisateur
   */
  load() {
    const user = App.currentUser;
    if (!user) return;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };
    const setText = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt || '—';
    };

    const fullName = `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.email || 'Utilisateur';
    const email = user.email || '';
    const phone = user.phone || '';
    const inviteCode = user.invite_code || user.inviteCode || 'TF-MEMBER';

    setText('profile-name', fullName);
    setText('profile-email', email);
    setText('my-invite-code', inviteCode);
    setVal('profile-firstname', user.firstname);
    setVal('profile-lastname', user.lastname);
    setVal('profile-email-input', email);
    setVal('profile-phone', phone);
  },

  /**
   * Initialise les formulaires et interactions de la page profil
   */
  init() {
    // 1. Sauvegarde des informations personnelles
    document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
      if (App.checkDemoRestriction('modifier votre profil')) return;

      const data = {
        firstname: document.getElementById('profile-firstname')?.value.trim(),
        lastname: document.getElementById('profile-lastname')?.value.trim(),
        email: document.getElementById('profile-email-input')?.value.trim(),
        phone: document.getElementById('profile-phone')?.value.trim()
      };

      if (!data.firstname || !data.lastname || !data.email) {
        Toast.show('Veuillez renseigner tous les champs obligatoires', 'error');
        return;
      }

      UI.setLoading('btn-save-profile', true, 'Sauvegarde en cours...');
      const res = await API.request('updateProfile', data);
      UI.setLoading('btn-save-profile', false, 'Sauvegarder');

      if (res.success) {
        Object.assign(App.currentUser, data);
        App.currentUser.avatar = ((data.firstname[0] || '') + (data.lastname[0] || '')).toUpperCase();
        Storage.save('user', App.currentUser);
        UI.updateUserInfo();
        Toast.show('✨ Profil mis à jour avec succès !', 'success');
      } else {
        Toast.show(res.message || 'Erreur lors de la mise à jour', 'error');
      }
    });

    // 2. Bouton de copie du code de parrainage
    document.getElementById('btn-copy-code')?.addEventListener('click', () => {
      const code = document.getElementById('my-invite-code')?.textContent;
      if (code) UI.copyText(code);
    });

    // 3. Téléversement de photo de profil (avec redimensionnement automatique)
    document.getElementById('btn-edit-avatar')?.addEventListener('click', () => {
      if (App.checkDemoRestriction('changer votre photo de profil')) return;
      document.getElementById('avatar-file-input')?.click();
    });

    document.getElementById('avatar-file-input')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        Toast.show('Veuillez choisir un fichier image valide', 'error');
        return;
      }

      try {
        const base64 = await UI.resizeImageToBase64(file, 400, 0.75);
        const res = await API.request('updateAvatar', { avatar: base64 });
        if (res.success) {
          App.currentUser.avatar = res.data.avatar;
          App.currentUser.avatar_photo = res.data.avatar_photo;
          Storage.save('user', App.currentUser);
          UI.updateUserInfo();
          Toast.show('Photo de profil mise à jour !', 'success');
        } else {
          Toast.show(res.message || 'Erreur lors de la mise à jour de la photo', 'error');
        }
      } catch {
        Toast.show('Impossible de traiter cette image', 'error');
      }
    });

    // 4. Formulaire de modification du mot de passe
    document.getElementById('btn-change-password')?.addEventListener('click', async () => {
      if (App.checkDemoRestriction('changer votre mot de passe')) return;

      const current = document.getElementById('current-password')?.value;
      const newPassword = document.getElementById('new-password')?.value;

      if (!current || !newPassword) {
        Toast.show('Entrez l\'ancien et le nouveau mot de passe', 'error');
        return;
      }
      if (newPassword.length < 8) {
        Toast.show('Le nouveau mot de passe doit comporter au moins 8 caractères', 'error');
        return;
      }

      UI.setLoading('btn-change-password', true, 'Mise à jour...');
      const res = await API.request('changePassword', { current, newPassword });
      UI.setLoading('btn-change-password', false, 'Changer le mot de passe');

      if (res.success) {
        Toast.show('Mot de passe modifié avec succès !', 'success');
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
      } else {
        Toast.show(res.message || 'Mot de passe actuel incorrect', 'error');
      }
    });
  }
};

// Exposer globalement
window.Profile = Profile;
