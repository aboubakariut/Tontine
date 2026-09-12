/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — RÉPERTOIRE & CONTACTS (PAGE CONTACTS)
 * Fichier : js/pages/contacts.js
 * Rôle : Permet de gérer son carnet d'amis tontiniers, d'inviter des
 *        membres et d'engager des conversations directes en tête-à-tête.
 * ═══════════════════════════════════════════════════════════════════
 */

const Contacts = {
  // Cache des derniers contacts acceptés
  _lastAccepted: [],

  /**
   * Initialise les interactions de la page contacts
   */
  init() {
    // Écouteur sur le champ de recherche de contacts
    const searchInput = document.getElementById('contacts-search-input');
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (q.length >= 2) {
        this.search(q);
      } else {
        const resBox = document.getElementById('contacts-search-results');
        if (resBox) resBox.innerHTML = '';
      }
    });
  },

  /**
   * Charge la liste des contacts acceptés et des invitations en attente
   */
  async load() {
    const list = document.getElementById('contacts-list');
    if (list) list.innerHTML = UI.skeletonRows(3);

    const res = await API.request('getContacts');
    if (!res.success) {
      if (list) list.innerHTML = '<div class="empty-state small"><p>Impossible de charger vos contacts</p></div>';
      return;
    }

    const accepted = res.data?.accepted || [];
    const pending = res.data?.pending || [];
    this._lastAccepted = accepted;

    if (list) {
      list.innerHTML = '';
      if (!accepted.length && !pending.length) {
        list.innerHTML = UI.emptyState('Votre répertoire est vide. Ajoutez des membres via leur code d\'invitation !');
        return;
      }

      // Demandes reçues en attente
      if (pending.length > 0) {
        const pendingTitle = document.createElement('h4');
        pendingTitle.className = 'section-sub-title';
        pendingTitle.textContent = `Demandes reçues (${pending.length})`;
        list.appendChild(pendingTitle);
        pending.forEach(c => list.appendChild(this.renderContactItem(c, 'pending')));
      }

      // Contacts confirmés
      if (accepted.length > 0) {
        const acceptedTitle = document.createElement('h4');
        acceptedTitle.className = 'section-sub-title mt';
        acceptedTitle.textContent = `Mes contacts (${accepted.length})`;
        list.appendChild(acceptedTitle);
        accepted.forEach(c => list.appendChild(this.renderContactItem(c, 'accepted')));
      }
    }
  },

  /**
   * Effectue le rendu HTML d'un contact
   * @param {object} c - Données du contact
   * @param {'accepted'|'pending'|'outgoing'} mode - Statut
   * @returns {HTMLElement}
   */
  renderContactItem(c, mode = 'accepted') {
    const div = document.createElement('div');
    div.className = 'member-item contact-item';
    const photo = c.avatar_photo;
    const avatarClass = photo ? 'avatar-sm has-photo' : 'avatar-sm';
    const avatarStyle = photo ? ` style="background-image:url('${photo}')"` : '';

    let actions = '';
    if (mode === 'pending') {
      actions = `
        <div class="contact-item-actions">
          <button class="btn-icon" title="Accepter" onclick="Contacts.respond(${c.id}, 'accept')" style="color:var(--color-primary)">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </button>
          <button class="btn-icon" title="Refuser" onclick="Contacts.respond(${c.id}, 'decline')" style="color:var(--color-red)">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>`;
    } else {
      actions = `
        <div class="contact-item-actions">
          <button class="btn-icon" title="Envoyer un message" onclick="Chat.openWithUser(${c.id})">
            <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </button>
          <button class="btn-icon" title="Retirer" onclick="Contacts.remove(${c.id})" style="color:var(--color-red)">
            <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>
          </button>
        </div>`;
    }

    div.innerHTML = `
      <div class="${avatarClass}"${avatarStyle}>${photo ? '' : (c.initials || (c.name || '?').slice(0, 2).toUpperCase())}</div>
      <div class="member-info">
        <p class="member-name">${UI.escapeHtml(c.name)}</p>
        <p class="member-role">${c.invite_code || ''}</p>
      </div>
      ${actions}
    `;
    return div;
  },

  /**
   * Recherche globale d'utilisateurs
   * @param {string} q - Mot-clé ou code
   */
  async search(q) {
    const results = document.getElementById('contacts-search-results');
    if (!results) return;
    results.innerHTML = '<div class="empty-state small"><p>Recherche en cours…</p></div>';

    const res = await API.request('searchUsers', { query: q });
    if (!res.success || !res.data.length) {
      results.innerHTML = '<div class="empty-state small"><p>Aucun utilisateur trouvé</p></div>';
      return;
    }

    results.innerHTML = '';
    res.data.forEach(u => {
      const div = document.createElement('div');
      div.className = 'member-item contact-item';
      div.innerHTML = `
        <div class="avatar-sm">${(u.name || '?').slice(0, 2).toUpperCase()}</div>
        <div class="member-info">
          <p class="member-name">${UI.escapeHtml(u.name)}</p>
          <p class="member-role">${u.invite_code || ''}</p>
        </div>
        <button class="btn-primary btn-sm" onclick="Contacts.add(${u.id})">Ajouter</button>
      `;
      results.appendChild(div);
    });
  },

  /**
   * Envoie une invitation de contact
   */
  async add(userId) {
    if (App.checkDemoRestriction('ajouter un contact')) return;
    const res = await API.request('addContact', { userId });
    if (res.success) {
      Toast.show('Demande d\'ami envoyée !', 'success');
      this.load();
    } else {
      Toast.show(res.message || 'Impossible d\'ajouter ce contact', 'error');
    }
  },

  /**
   * Accepte ou refuse une demande
   */
  async respond(contactId, decision) {
    if (App.checkDemoRestriction('répondre à une demande de contact')) return;
    const res = await API.request('respondContact', { contactId, decision });
    if (res.success) {
      Toast.show(decision === 'accept' ? 'Contact ajouté !' : 'Demande refusée', 'success');
      this.load();
    }
  },

  /**
   * Supprime un contact
   */
  async remove(contactId) {
    if (App.checkDemoRestriction('retirer un contact')) return;
    const confirmed = await Modal.confirm('Retirer ce contact ?', 'Cette action peut être annulée plus tard.', 'Retirer');
    if (!confirmed) return;
    const res = await API.request('removeContact', { contactId });
    if (res.success) {
      Toast.show('Contact retiré.', 'info');
      this.load();
    }
  }
};

// Exposer globalement
window.Contacts = Contacts;
