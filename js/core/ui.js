/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — UTILITAIRES D'INTERFACE UTILISATEUR (UI)
 * Fichier : js/core/ui.js
 * Rôle : Fournit les fonctions de rendu réutilisables, formateurs
 *        monétaires (FCFA), dates locales et compression d'images.
 * ═══════════════════════════════════════════════════════════════════
 */

const UI = {
  /**
   * Formate un montant numérique en devise locale (ex: 25 000 FCFA)
   * @param {number|string} n - Montant brut
   * @returns {string} Chaîne formatée avec séparateurs de milliers
   */
  formatAmount(n) {
    const num = Number(n) || 0;
    // Si l'option masquer les montants est activée dans les paramètres de sécurité
    if (App.settings?.security?.hideAmounts) return '•••••• FCFA';
    return num.toLocaleString('fr-FR') + ' FCFA';
  },

  /**
   * Échappe les caractères spéciaux HTML pour prévenir les injections XSS
   * @param {string} str - Texte non filtré
   * @returns {string} Texte sécurisé pour affichage DOM
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Active ou désactive l'état de chargement sur un bouton avec spinner
   * @param {string} btnId - Identifiant DOM du bouton
   * @param {boolean} loading - Vrai pour afficher le spinner
   * @param {string} text - Texte à afficher pendant le chargement ou au retour
   */
  setLoading(btnId, loading, text = '') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.dataset.prevText = btn.textContent;
      btn.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px"></span>${text || 'Chargement...'}`;
    } else {
      btn.textContent = text || btn.dataset.prevText || 'Valider';
    }
  },

  /**
   * Génère le squelette HTML de cartes en cours de chargement
   * @param {number} count - Nombre de cartes fantômes
   * @returns {string} HTML des squelettes animés
   */
  skeletonCards(count = 2) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="tontine-card skeleton" style="pointer-events:none">
          <div class="skeleton-line" style="width:55%;height:18px;margin-bottom:12px"></div>
          <div class="skeleton-line" style="width:80%;height:14px;margin-bottom:8px"></div>
          <div class="skeleton-line" style="width:40%;height:14px"></div>
        </div>`;
    }
    return html;
  },

  /**
   * Génère le squelette HTML de lignes de tableau ou listes
   * @param {number} count - Nombre de lignes
   * @returns {string} HTML des lignes animées
   */
  skeletonRows(count = 3) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-row" style="display:flex;align-items:center;gap:12px;padding:12px 0">
          <div class="skeleton-circle" style="width:40px;height:40px;border-radius:50%;flex-shrink:0"></div>
          <div style="flex:1">
            <div class="skeleton-line" style="width:60%;height:14px;margin-bottom:6px"></div>
            <div class="skeleton-line" style="width:35%;height:11px"></div>
          </div>
        </div>`;
    }
    return html;
  },

  /**
   * Crée un élément DOM interactif représentant une carte de tontine
   * @param {object} t - Objet tontine
   * @returns {HTMLElement} Carte de tontine prête à insérer
   */
  tontineCard(t) {
    const div = document.createElement('div');
    div.className = 'tontine-card';
    const progress = t.totalTours ? (t.currentTour / t.totalTours) * 100 : 0;
    const iconHtml = t.icon
      ? `<div class="tontine-card-icon has-photo" style="background-image:url('${t.icon}')"></div>`
      : '';

    div.innerHTML = `
      <div class="tontine-card-header">
        <span class="tontine-card-name">${iconHtml}${this.escapeHtml(t.name)}</span>
        <span class="badge ${t.badge || 'badge-active'}">${t.badgeText || 'En cours'}</span>
      </div>
      <div class="tontine-card-body">
        <div class="tontine-card-stat"><span>Mise</span><span>${this.formatAmount(t.amount)}</span></div>
        <div class="tontine-card-stat"><span>Membres</span><span>${t.currentMembers || 0}/${t.maxMembers || 10}</span></div>
        <div class="tontine-card-stat"><span>Tour</span><span>${t.currentTour || 1}/${t.totalTours || 1}</span></div>
        <div class="tontine-card-stat"><span>Rôle</span><span>${t.userRole === 'admin' ? '👑 Admin' : '👤 Membre'}</span></div>
      </div>
      <div class="tontine-card-progress"><div class="tontine-card-bar" style="width:${progress}%"></div></div>
    `;

    // Clic pour ouvrir la fiche détaillée de la tontine
    div.addEventListener('click', () => {
      if (typeof TontineDetail !== 'undefined' && TontineDetail.open) {
        TontineDetail.open(t);
      }
    });

    return div;
  },

  /**
   * Crée une entrée d'activité pour le journal ou le flux d'accueil
   * @param {object} entry - Donnée du journal
   * @returns {HTMLElement}
   */
  activityItem(entry) {
    const div = document.createElement('div');
    div.className = 'activity-item';
    const icons = { payment: '💰', admin: '📢', member: '👤', system: '🔄' };
    div.innerHTML = `
      <div class="activity-icon">${icons[entry.type] || '📋'}</div>
      <div class="activity-text"><strong>${entry.action || ''}</strong><br><span>${entry.detail || ''}</span></div>
      <span class="activity-time">${entry.time || ''}</span>
    `;
    return div;
  },

  /**
   * Bloc d'état vide (aucun contenu trouvé)
   * @param {string} text - Message explicatif
   * @param {string} page - Page vers laquelle rediriger au clic sur le bouton
   * @param {string} btnText - Libellé du bouton d'action
   * @returns {string} HTML de l'état vide
   */
  emptyState(text, page = '', btnText = '') {
    return `<div class="empty-state">
      <svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="2" opacity="0.3"/><path d="M22 32h20M32 22v20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
      <p>${text}</p>
      ${page ? `<button class="btn-primary btn-sm" data-page="${page}">${btnText}</button>` : ''}
    </div>`;
  },

  /**
   * Copie un texte dans le presse-papiers avec toast de confirmation
   * @param {string} text - Texte à copier
   */
  copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        Toast.show('Copié dans le presse-papier !', 'success');
      }).catch(() => this._copyFallback(text));
    } else {
      this._copyFallback(text);
    }
  },

  _copyFallback(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      Toast.show('Copié !', 'success');
    } catch {
      Toast.show('Impossible de copier automatiquement', 'error');
    }
    document.body.removeChild(el);
  },

  /**
   * Redimensionne et compresse une image en base64 (idéal pour mobile/Vercel serverless)
   * @param {File} file - Fichier image sélectionné
   * @param {number} maxDimension - Largeur/hauteur max (pixels)
   * @param {number} quality - Qualité JPEG (0.1 à 1.0)
   * @returns {Promise<string>} Données base64 data:image/jpeg
   */
  resizeImageToBase64(file, maxDimension = 600, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxDimension || h > maxDimension) {
            if (w > h) {
              h = Math.round((h * maxDimension) / w);
              w = maxDimension;
            } else {
              w = Math.round((w * maxDimension) / h);
              h = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Met à jour les informations d'en-tête (avatar, prénom, dropdown profil)
   */
  updateUserInfo() {
    const user = App.currentUser;
    if (!user) return;
    const name = `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.email || 'Utilisateur';
    const initials = (user.avatar && user.avatar.length <= 4)
      ? user.avatar
      : ((user.firstname?.[0] || '') + (user.lastname?.[0] || '')).toUpperCase() || 'TF';

    // Nom sur le menu déroulant
    const dropdownName = document.getElementById('dropdown-name');
    if (dropdownName) dropdownName.textContent = name;

    // Avatar
    const avatars = document.querySelectorAll('.avatar-sm, .avatar-lg, .avatar-xl');
    avatars.forEach(el => {
      if (user.avatar_photo) {
        el.classList.add('has-photo');
        el.style.backgroundImage = `url('${user.avatar_photo}')`;
        el.textContent = '';
      } else {
        el.classList.remove('has-photo');
        el.style.backgroundImage = '';
        el.textContent = initials;
      }
    });
  }
};

// Exposer globalement
window.UI = UI;
