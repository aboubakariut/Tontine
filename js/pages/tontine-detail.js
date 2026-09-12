/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — DÉTAIL D'UNE TONTINE (PAGE TONTINE DETAIL)
 * Fichier : js/pages/tontine-detail.js
 * Rôle : Gère l'affichage d'une tontine (membres, matrice des paiements,
 *        validation de cotisations, Mobile Money, changement de tour et réglages).
 * ═══════════════════════════════════════════════════════════════════
 */

const TontineDetail = {
  // Capture des preuves de paiement associées par ID membre
  _proofByMemberId: {},

  /**
   * Ouvre la fiche de détail à partir d'un objet tontine complet
   * @param {object} tontine - Données de la tontine
   */
  open(tontine) {
    App.currentTontine = tontine;
    Nav.go('tontine-detail', tontine.name);
    RouteMemory.save('tontine-detail', tontine.name, { tontineId: tontine.id });
    this.render(tontine);
  },

  /**
   * Ouvre une tontine à partir de son identifiant numérique (ex: lien direct ou notif)
   * @param {number} tontineId - ID de la tontine
   * @param {boolean} focusPendingRequests - Scroll direct vers les demandes en attente
   * @param {number|null} highlightRequestId - ID de la demande à mettre en surbrillance
   */
  async openById(tontineId, focusPendingRequests = false, highlightRequestId = null) {
    const res = await API.request('getTontine', { tontineId });
    if (!res.success) {
      Toast.show(res.message || 'Tontine introuvable', 'error');
      return;
    }
    this.open(res.data);
    if (focusPendingRequests && res.data.userRole === 'admin') {
      this.loadPendingRequests(tontineId, highlightRequestId);
    }
  },

  /**
   * Rafraîchit les données de la tontine affichée sans modifier l'historique
   * @param {number} tontineId - ID de la tontine
   */
  async refresh(tontineId) {
    const res = await API.request('getTontine', { tontineId });
    if (!res.success) {
      Toast.show(res.message || 'Tontine introuvable', 'error');
      return;
    }
    App.currentTontine = res.data;
    this.render(res.data);
  },

  /**
   * Effectue le rendu graphique complet de la tontine
   * @param {object} t - Objet tontine
   */
  render(t) {
    // 1. En-tête de la tontine
    const nameEl = document.getElementById('detail-name');
    const descEl = document.getElementById('detail-desc');
    const badgeEl = document.getElementById('detail-badge');
    const potEl = document.getElementById('detail-pot');
    const amountEl = document.getElementById('detail-amount');
    const membersEl = document.getElementById('detail-members-count');
    const tourEl = document.getElementById('detail-tour');
    const nextDateEl = document.getElementById('detail-next-date');
    const adminEl = document.getElementById('detail-admin');

    if (nameEl) nameEl.textContent = t.name;
    if (descEl) descEl.textContent = t.description || '';
    if (badgeEl) {
      badgeEl.className = `badge ${t.badge || 'badge-active'}`;
      badgeEl.textContent = t.badgeText || 'En cours';
    }

    // Calcul de la cagnotte accumulée
    const totalPot = parseFloat(t.pot) || (t.amount * (t.currentMembers || 1));
    if (potEl) potEl.textContent = UI.formatAmount(totalPot);
    if (amountEl) amountEl.textContent = UI.formatAmount(t.amount);
    if (membersEl) membersEl.textContent = `${t.currentMembers || 0}/${t.maxMembers || 10}`;
    if (tourEl) tourEl.textContent = `${t.currentTour || 1}/${t.totalTours || 1}`;

    // Date de la prochaine cotisation
    if (nextDateEl) {
      const d = t.nextPaymentDate ? new Date(t.nextPaymentDate) : null;
      nextDateEl.textContent = d && !isNaN(d.getTime()) ? d.toLocaleDateString('fr-FR') : (t.nextPaymentDate || '—');
    }

    // Administrateur
    const adminMember = (t.members || []).find(m => m.role === 'Administrateur' || m.role === 'admin');
    if (adminEl) adminEl.textContent = adminMember?.name || 'Administrateur';

    // 2. Boutons d'actions selon le rôle (Admin ou Membre)
    const isAdmin = t.userRole === 'admin';
    const adminActions = document.getElementById('detail-admin-actions');
    const nextTourBtn = document.getElementById('btn-next-tour');
    const memberActionZone = document.getElementById('detail-member-actions');

    if (adminActions) adminActions.style.display = isAdmin ? 'flex' : 'none';
    if (nextTourBtn) nextTourBtn.style.display = isAdmin ? 'block' : 'none';

    // Affichage du bouton Mobile Money pour les membres qui n'ont pas encore payé
    if (memberActionZone) {
      const myMembership = (t.members || []).find(m => m.id === App.currentUser?.id);
      if (myMembership && !myMembership.paid) {
        memberActionZone.style.display = 'block';
        memberActionZone.innerHTML = `
          <button class="btn-primary btn-full mb" onclick="TontineDetail.payMobileMoney(${t.id})">
            📲 Payer ma cotisation via Mobile Money
          </button>`;
      } else {
        memberActionZone.style.display = 'none';
      }
    }

    // 3. Rendu de la liste des membres
    const membersList = document.getElementById('detail-members-list');
    if (membersList) {
      membersList.innerHTML = '';
      (t.members || []).forEach(m => {
        const row = document.createElement('div');
        row.className = 'member-item';
        row.id = `member-row-${m.id}`;
        row.dataset.searchName = (m.name || '').toLowerCase();

        const isMe = m.id === App.currentUser?.id;
        const hasDebt = Number(m.debt) > 0;

        // Statut visuel (Payé / En attente / Dette)
        let statusBadge = m.paid
          ? '<span class="member-status member-paid">✓ Payé</span>'
          : '<span class="member-status member-pending">⏳ En attente</span>';

        if (hasDebt) {
          statusBadge += ` <span class="member-status member-debt" title="Dette de ${UI.formatAmount(m.debt)}">⚠️ Dette: ${UI.formatAmount(m.debt)}</span>`;
        }

        // Actions admin sur le membre (valider paiement, dette, rôle, retrait)
        let actionsHtml = '';
        if (isAdmin && !m.paid) {
          actionsHtml += `<button class="btn-ghost btn-sm" onclick="TontineDetail.recordPayment(${m.id})">Valider paiement</button>`;
        }
        if (isAdmin && hasDebt) {
          actionsHtml += `<button class="btn-ghost btn-sm" style="color:var(--color-warning)" onclick="TontineDetail.settleDebt(${m.id})">Régler dette</button>`;
        }

        row.innerHTML = `
          <div class="avatar-sm">${m.avatar || (m.name || '?').slice(0, 2).toUpperCase()}</div>
          <div class="member-info">
            <p class="member-name">${UI.escapeHtml(m.name)}${isMe ? ' <span style="opacity:0.6">(Moi)</span>' : ''}${m.isBeneficiary ? ' 🏆' : ''}</p>
            <p class="member-role">${m.role || 'Membre'}</p>
          </div>
          <div class="member-status-wrap">
            ${statusBadge}
            ${actionsHtml}
          </div>
        `;
        membersList.appendChild(row);
      });
    }

    // 4. Rendu de la matrice des tours
    this.renderMatrix(t);

    // 5. Charger les demandes d'adhésion si admin
    if (isAdmin) {
      this.loadPendingRequests(t.id);
    }
  },

  /**
   * Génère la matrice de suivi des cotisations tour par tour
   * @param {object} t - Objet tontine
   */
  renderMatrix(t) {
    const container = document.getElementById('detail-payment-matrix');
    if (!container) return;

    const tours = t.totalTours || 5;
    const members = t.members || [];

    let tableHtml = '<table class="matrix-table"><thead><tr><th>Membre</th>';
    for (let i = 1; i <= tours; i++) {
      tableHtml += `<th>T${i}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';

    members.forEach(m => {
      tableHtml += `<tr><td>${UI.escapeHtml(m.name)}</td>`;
      for (let i = 1; i <= tours; i++) {
        // Détermination du statut de la case (payé au tour actuel ou précédent)
        let cellClass = 'matrix-pending';
        let cellText = '—';
        if (i < t.currentTour) {
          cellClass = 'matrix-paid';
          cellText = '✓';
        } else if (i === t.currentTour) {
          cellClass = m.paid ? 'matrix-paid' : 'matrix-current';
          cellText = m.paid ? '✓' : '⏳';
        }
        tableHtml += `<td class="${cellClass}">${cellText}</td>`;
      }
      tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
  },

  /**
   * Charge les demandes d'adhésion en attente de validation
   * @param {number} tontineId - ID tontine
   * @param {number|null} highlightRequestId - Demande à cibler
   */
  async loadPendingRequests(tontineId, highlightRequestId = null) {
    const card = document.getElementById('detail-pending-requests-card');
    const list = document.getElementById('detail-pending-requests-list');
    if (!card || !list) return;

    const res = await API.request('getPendingMembers', { tontineId });
    if (!res.success || !res.data.length) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'block';
    list.innerHTML = '';
    res.data.forEach(m => {
      const div = document.createElement('div');
      div.className = 'member-item';
      div.id = `pending-request-${m.id}`;
      div.innerHTML = `
        <div class="avatar-sm">${m.initials || m.name.slice(0, 2).toUpperCase()}</div>
        <div class="member-info">
          <p class="member-name">${UI.escapeHtml(m.name)}</p>
          <p class="member-role">Demande du ${m.requested_at || ''}</p>
        </div>
        <div class="contact-item-actions">
          <button class="btn-icon" title="Accepter" style="color:var(--color-primary)" onclick="TontineDetail.respondPending(${tontineId},${m.id},'approve',this)">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </button>
          <button class="btn-icon" title="Refuser" style="color:var(--color-red)" onclick="TontineDetail.respondPending(${tontineId},${m.id},'reject',this)">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      `;
      list.appendChild(div);
    });
  },

  /**
   * Approuve ou refuse une demande d'adhésion
   */
  async respondPending(tontineId, memberId, action, btnEl = null) {
    if (App.checkDemoRestriction(action === 'approve' ? 'approuver un membre' : 'refuser un membre')) return;

    const res = await API.request('approveMember', { tontineId, memberId, action });
    if (res.success) {
      Toast.show(action === 'approve' ? 'Membre accepté avec succès !' : 'Demande refusée', 'success');
      this.loadPendingRequests(tontineId);
      this.refresh(tontineId);
    } else {
      Toast.show(res.message || 'Erreur lors du traitement', 'error');
    }
  },

  /**
   * Enregistre manuellement le paiement de cotisation d'un membre
   */
  async recordPayment(memberId) {
    if (App.checkDemoRestriction('confirmer un paiement')) return;
    const member = App.currentTontine?.members.find(m => m.id === memberId);
    const memberName = member?.name || 'ce membre';
    const debt = Number(member?.debt) || 0;

    let clearDebt = false;
    if (debt > 0) {
      const confirmed = await new Promise(resolve => {
        Modal.open(`Confirmer le paiement de ${memberName} ?`, `
          <p style="font-size:var(--fs-sm);color:var(--color-text-2);margin-bottom:12px">Cette action sera enregistrée dans le journal transparent de la tontine.</p>
          <label style="display:flex;align-items:center;gap:8px;font-size:var(--fs-sm);cursor:pointer">
            <input type="checkbox" id="clear-debt-checkbox" />
            Régler également sa dette existante de ${UI.formatAmount(debt)}
          </label>
        `, `
          <button class="btn-primary btn-full" id="modal-record-confirm-btn">Confirmer le paiement</button>
          <button class="btn-ghost btn-full" onclick="Modal.close()">Annuler</button>
        `);
        document.getElementById('modal-record-confirm-btn')?.addEventListener('click', () => {
          clearDebt = document.getElementById('clear-debt-checkbox')?.checked || false;
          Modal.close();
          resolve(true);
        });
      });
      if (!confirmed) return;
    } else {
      const confirmed = await Modal.confirm(`Confirmer le paiement de ${memberName} ?`, 'Cette action sera enregistrée dans le journal de la tontine.', 'Confirmer le paiement');
      if (!confirmed) return;
    }

    const res = await API.request('recordPayment', { tontineId: App.currentTontine.id, memberId, clearDebt });
    if (res.success) {
      Toast.show(`Paiement de ${memberName} validé !`, 'success');
      this.refresh(App.currentTontine.id);
    }
  },

  /**
   * Marque la dette d'un membre comme réglée (paiement en main propre)
   */
  async settleDebt(memberId) {
    if (App.checkDemoRestriction('marquer une dette comme réglée')) return;
    const member = App.currentTontine?.members.find(m => m.id === memberId);
    if (!member || !(Number(member.debt) > 0)) return;

    const confirmed = await Modal.confirm(`Marquer la dette de ${member.name} comme réglée ?`, `Montant : ${UI.formatAmount(member.debt)}.`, 'Marquer réglée');
    if (!confirmed) return;

    const res = await API.request('settleDebt', { tontineId: App.currentTontine.id, memberId });
    if (res.success) {
      Toast.show('Dette réglée avec succès.', 'success');
      this.refresh(App.currentTontine.id);
    }
  },

  /**
   * Passe au tour suivant de la tontine et verse la cagnotte
   */
  async advanceTour(force = false) {
    if (App.checkDemoRestriction('passer au tour suivant')) return;
    const t = App.currentTontine;
    const res = await API.request('nextTour', { tontineId: t.id, force });
    if (!res.success) {
      Toast.show(res.message || 'Erreur', 'error');
      return;
    }

    if (res.data?.needsConfirmation) {
      const names = res.data.unpaidMembers.map(u => u.name).join(', ');
      const confirmed = await Modal.confirm(
        'Membres impayés',
        `${names} n'ont pas encore payé. Si vous continuez, une dette de ${UI.formatAmount(res.data.amount)} sera enregistrée pour chacun. Continuer ?`,
        'Continuer et enregistrer les dettes'
      );
      if (!confirmed) return;
      return this.advanceTour(true);
    }

    Toast.show(res.message || 'Tour suivant lancé avec succès !', 'success');
    this.refresh(t.id);
  },

  /**
   * Affiche l'écran de paiement Mobile Money P2P avec code USSD et téléversement de preuve
   */
  payMobileMoney(tontineId) {
    if (App.checkDemoRestriction('effectuer un paiement Mobile Money')) return;
    const t = App.currentTontine;
    if (!t.momoNumber || !t.momoOperator) {
      Toast.show("L'administrateur n'a pas encore renseigné de numéro Mobile Money.", 'warning');
      return;
    }

    const opData = {
      mtn:    { label: 'MTN Mobile Money', ussd: '*126#', emoji: '🟡' },
      orange: { label: 'Orange Money',     ussd: '#150#', emoji: '🟠' },
      wave:   { label: 'Wave',             ussd: '',      emoji: '🔵' },
      moov:   { label: 'Moov Money',       ussd: '*155#', emoji: '🔴' },
      mpesa:  { label: 'M-Pesa',           ussd: '*334#', emoji: '🟢' },
      airtel: { label: 'Airtel Money',     ussd: '*166#', emoji: '🔴' },
      free:   { label: 'Free Money',       ussd: '#150#', emoji: '🔴' }
    };

    const opInfo = opData[t.momoOperator] || { label: t.momoOperator || 'Mobile Money', ussd: '', emoji: '💳' };
    const opLabel = opInfo.label;
    const ussdActionHtml = opInfo.ussd
      ? `<a href="tel:${encodeURIComponent(opInfo.ussd)}" class="btn-primary btn-full" style="text-decoration:none;display:block;text-align:center;margin-top:6px">📞 Composer ${opInfo.ussd}</a>`
      : `<p style="font-size:var(--fs-sm);font-weight:600;color:var(--color-primary);margin-top:6px">Ouvrez votre application ${opLabel} pour effectuer le transfert.</p>`;
    const formattedNumber = t.momoNumber.replace(/(\d{3})(?=\d)/g, '$1 ').trim();

    Modal.open(`Payer via ${opLabel}`, `
      <div class="form-group">
        <p style="font-size:var(--fs-sm);color:var(--color-text-2);margin-bottom:12px">
          Paiement direct de pair à pair vers le téléphone de l'administrateur sans aucun intermédiaire.
        </p>
        <label class="form-label">1. Numéro à créditer (${opLabel})</label>
        <div class="invite-code-box">
          <span>${formattedNumber}</span>
          <button class="btn-icon" onclick="UI.copyText('${t.momoNumber}')">
            <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" fill="none"/></svg>
          </button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">2. Montant à envoyer</label>
        <p style="font-size:var(--fs-lg);font-weight:700;color:var(--color-primary)">${UI.formatAmount(t.amount)}</p>
      </div>
      <div class="form-group">
        <label class="form-label">3. Envoi via ${opLabel}</label>
        ${ussdActionHtml}
      </div>
      <div class="form-group">
        <button class="btn-secondary btn-full" id="btn-confirm-momo-paid">✓ J'ai envoyé le paiement</button>
      </div>
    `);

    document.getElementById('btn-confirm-momo-paid')?.addEventListener('click', async () => {
      const res = await API.request('declarePayment', { tontineId: t.id });
      Modal.close();
      if (res.success) {
        Toast.show('Déclaration envoyée ! En attente de validation.', 'success');
        this.refresh(t.id);
      }
    });
  }
};

// Exposer globalement
window.TontineDetail = TontineDetail;
