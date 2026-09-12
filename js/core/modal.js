/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — GESTIONNAIRE DE FENÊTRES MODALES
 * Fichier : js/core/modal.js
 * Rôle : Ouvre des boîtes de dialogue immersives, gère le bouton
 *        retour physique Android (popstate) et affiche la restriction démo.
 * ═══════════════════════════════════════════════════════════════════
 */

const Modal = {
  // Indique si une entrée a été poussée dans l'historique navigateur
  _pushedState: false,
  _ignoreNextPopstate: false,
  _closingFromPopstate: false,

  /**
   * Ouvre une fenêtre modale avec titre, corps et pied de page
   * @param {string} title - Titre de la modale
   * @param {string} bodyHTML - Contenu HTML du corps
   * @param {string} footerHTML - Contenu HTML des actions (boutons)
   */
  open(title, bodyHTML, footerHTML = '') {
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const footerEl = document.getElementById('modal-footer');
    const overlay = document.getElementById('modal-overlay');

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHTML;
    if (footerEl) footerEl.innerHTML = footerHTML;
    if (overlay) overlay.classList.remove('hidden');

    // Pousse une entrée d'historique dédiée : un appui sur le retour physique / geste Android
    // ferme d'abord la modale comme dans une application native au lieu de changer de page.
    if (!this._pushedState) {
      try {
        history.pushState({ tfModal: true }, '', location.href);
      } catch {}
      this._pushedState = true;
    }
  },

  /**
   * Ferme la fenêtre modale actuellement ouverte
   */
  close() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');

    if (this._pushedState) {
      this._pushedState = false;
      if (!this._closingFromPopstate) {
        // Consommer l'entrée d'historique poussée à l'ouverture
        this._ignoreNextPopstate = true;
        try {
          history.back();
        } catch {}
      }
    }
    this._closingFromPopstate = false;
  },

  /**
   * Boîte de dialogue de confirmation asynchrone (Promesse résolue avec true/false)
   * @param {string} title - Titre de la confirmation
   * @param {string} message - Question ou message d'avertissement
   * @param {string} confirmText - Libellé du bouton de validation
   * @returns {Promise<boolean>}
   */
  confirm(title, message, confirmText = 'Confirmer') {
    return new Promise(resolve => {
      this.open(
        title,
        `<p style="font-size:var(--fs-sm);color:var(--color-text-2);line-height:1.6">${message}</p>`,
        `<button class="btn-primary btn-full" id="modal-confirm-btn">${confirmText}</button>
         <button class="btn-ghost btn-full" onclick="Modal.close()">Annuler</button>`
      );

      // Écoute du clic sur le bouton de confirmation
      document.getElementById('modal-confirm-btn')?.addEventListener('click', () => {
        this.close();
        resolve(true);
      });

      // Clic hors de la modale = Annulation
      const overlay = document.getElementById('modal-overlay');
      overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close();
          resolve(false);
        }
      }, { once: true });
    });
  },

  /**
   * Affiche la modale de restriction d'accès dédiée au mode démonstration.
   * Empêche toute mutation backend et propose de créer un compte ou de se connecter.
   * @param {string} actionLabel - Action bloquée (ex: 'créer une tontine')
   */
  showDemoRestriction(actionLabel = 'effectuer cette opération') {
    this.open('Accès réservé', `
      <div class="demo-restricted-body">
        <div class="demo-restricted-icon">🔒</div>
        <h3 class="demo-restricted-title">Fonctionnalité réservée aux membres</h3>
        <p class="demo-restricted-desc">
          Vous explorez actuellement Tontines Facile en <strong>mode démo</strong> avec des données d'exemple.<br/>
          Pour <strong>${actionLabel}</strong>, vous devez vous connecter ou créer un compte réel.
        </p>
        <div class="demo-highlight-box">
          ✨ <strong>100% gratuit et instantané :</strong> Créez votre compte en moins d'une minute pour lancer votre vraie tontine.
        </div>
      </div>
    `, `
      <button class="btn-primary btn-full" id="btn-modal-demo-register" style="margin-bottom:8px">✨ Créer mon compte gratuit</button>
      <button class="btn-outline btn-full" id="btn-modal-demo-login" style="margin-bottom:8px">Se connecter</button>
      <button class="btn-ghost btn-full" onclick="Modal.close()">Continuer la visite démo</button>
    `);

    // Redirection vers l'inscription
    document.getElementById('btn-modal-demo-register')?.addEventListener('click', () => {
      Modal.close();
      if (typeof Auth !== 'undefined' && Auth.exitDemoToAuth) {
        Auth.exitDemoToAuth('register');
      }
    });

    // Redirection vers la connexion
    document.getElementById('btn-modal-demo-login')?.addEventListener('click', () => {
      Modal.close();
      if (typeof Auth !== 'undefined' && Auth.exitDemoToAuth) {
        Auth.exitDemoToAuth('login');
      }
    });
  }
};

// Fermeture de la modale lors de l'appui sur le bouton retour du navigateur/téléphone
window.addEventListener('popstate', (e) => {
  if (Modal._ignoreNextPopstate) {
    Modal._ignoreNextPopstate = false;
    return;
  }
  if (Modal._pushedState) {
    Modal._closingFromPopstate = true;
    Modal.close();
  }
});

// Exposer globalement
window.Modal = Modal;
