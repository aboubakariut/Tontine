/* ══════════════════════════════════════════════════════════════════
   TONTINES FACILE — improvements.js
   Toutes les fonctionnalités manquantes :
   1.  Service Worker (offline)
   2.  Réinitialisation de mot de passe
   3.  Emails réels (via api.php)
   4.  Approbation membres (UI complète)
   5.  PIN de verrouillage
   6.  Push Notifications (Web Push)
   7.  Export PDF/CSV
   8.  Rappels automatiques
   9.  Upload photo de profil
   10. Filtre journal d'audit
   11. Onboarding tutoriel
   12. Confirmation de déconnexion
   13. Pull-to-refresh
   14. Multi-langue (FR/EN)
   15. Rate limiting côté client
   16. CSRF token
   17. Validation renforcée
   18. Logging erreurs structuré
   ══════════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1. SERVICE WORKER — Offline PWA
   ═══════════════════════════════════════════════════════════════ */
const ServiceWorkerManager = {
  async register() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateBanner();
          }
        });
      });
      console.log('[SW] Enregistré :', reg.scope);
      this.watchConnectivity();
    } catch (e) {
      console.warn('[SW] Échec enregistrement :', e);
    }
  },

  showUpdateBanner() {
    const banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.innerHTML = `
      <span>🔄 Mise à jour disponible</span>
      <button onclick="window.location.reload()">Actualiser</button>
    `;
    document.body.appendChild(banner);
  },

  watchConnectivity() {
    const updateStatus = (online) => {
      const bar = document.getElementById('offline-bar') || this.createOfflineBar();
      bar.classList.toggle('visible', !online);
      if (online) Toast.show('Connexion rétablie ✅', 'success');
    };
    window.addEventListener('online',  () => updateStatus(true));
    window.addEventListener('offline', () => updateStatus(false));
    if (!navigator.onLine) updateStatus(false);
  },

  createOfflineBar() {
    const bar = document.createElement('div');
    bar.id = 'offline-bar';
    bar.innerHTML = '📡 Hors ligne — certaines fonctionnalités sont limitées';
    document.body.appendChild(bar);
    return bar;
  }
};

/* ═══════════════════════════════════════════════════════════════
   2. MOT DE PASSE OUBLIÉ
   ═══════════════════════════════════════════════════════════════ */
const ForgotPassword = {
  open() {
    Modal.open('Mot de passe oublié', `
      <p style="font-size:var(--fs-sm);color:var(--color-text-2);margin-bottom:var(--sp-md)">
        Entrez votre email. Vous recevrez un lien de réinitialisation valable <strong>1 heure</strong>.
      </p>
      <div class="form-group">
        <label class="form-label">Adresse email</label>
        <input type="email" class="form-input" id="forgot-email" placeholder="vous@exemple.com" autocomplete="email"/>
      </div>
      <div id="forgot-msg"></div>
    `, `
      <button class="btn-primary btn-full" id="btn-forgot-submit">Envoyer le lien</button>
      <button class="btn-ghost btn-full" onclick="Modal.close()">Annuler</button>
    `);

    document.getElementById('btn-forgot-submit').addEventListener('click', async () => {
      const email = document.getElementById('forgot-email').value.trim();
      if (!Validate.email(email)) {
        document.getElementById('forgot-msg').innerHTML = '<p style="color:var(--color-red);font-size:var(--fs-xs)">Email invalide.</p>';
        return;
      }
      RateLimit.check('forgot');
      UI.setLoading('btn-forgot-submit', true, 'Envoi...');
      const res = await API.request('forgotPassword', { email });
      UI.setLoading('btn-forgot-submit', false, 'Envoyer le lien');
      const msg = document.getElementById('forgot-msg');
      if (res.success) {
        msg.innerHTML = '<p style="color:var(--color-green);font-size:var(--fs-xs)">✅ Email envoyé ! Vérifiez votre boîte mail.</p>';
        setTimeout(() => Modal.close(), 3000);
      } else {
        msg.innerHTML = `<p style="color:var(--color-red);font-size:var(--fs-xs)">${res.message}</p>`;
      }
    });
  },

  /* Traitement du token dans l'URL */
  checkResetToken() {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const action = params.get('action');
    if (action === 'reset' && token) {
      history.replaceState({}, '', window.location.pathname);
      this.showResetForm(token);
    }
  },

  showResetForm(token) {
    Modal.open('Nouveau mot de passe', `
      <div class="form-group">
        <label class="form-label">Nouveau mot de passe</label>
        <div class="input-password">
          <input type="password" class="form-input" id="reset-pw" placeholder="Min. 8 caractères"/>
          <button class="btn-eye" onclick="UI.togglePassword('reset-pw')" type="button">👁</button>
        </div>
        <div class="password-strength" id="reset-strength"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Confirmer</label>
        <input type="password" class="form-input" id="reset-pw2" placeholder="Répétez le mot de passe"/>
      </div>
      <div id="reset-msg"></div>
    `, `
      <button class="btn-primary btn-full" id="btn-reset-submit">Changer le mot de passe</button>
    `);

    document.getElementById('reset-pw').addEventListener('input', (e) => {
      const bar = document.getElementById('reset-strength');
      bar.dataset.level = Validate.passwordStrength(e.target.value);
    });

    document.getElementById('btn-reset-submit').addEventListener('click', async () => {
      const pw  = document.getElementById('reset-pw').value;
      const pw2 = document.getElementById('reset-pw2').value;
      const msg = document.getElementById('reset-msg');
      if (pw.length < 8) { msg.innerHTML = '<p style="color:var(--color-red);font-size:var(--fs-xs)">Minimum 8 caractères.</p>'; return; }
      if (pw !== pw2)    { msg.innerHTML = '<p style="color:var(--color-red);font-size:var(--fs-xs)">Les mots de passe ne correspondent pas.</p>'; return; }
      UI.setLoading('btn-reset-submit', true, 'Modification...');
      const res = await API.request('resetPassword', { token, password: pw });
      UI.setLoading('btn-reset-submit', false, 'Changer le mot de passe');
      if (res.success) {
        Toast.show('Mot de passe modifié ! Vous pouvez vous connecter.', 'success');
        Modal.close();
      } else {
        msg.innerHTML = `<p style="color:var(--color-red);font-size:var(--fs-xs)">${res.message}</p>`;
      }
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   4. APPROBATION MEMBRES — UI complète
   ═══════════════════════════════════════════════════════════════ */
const MemberApproval = {
  openPending(tontine) {
    const pending = (tontine.pending_members || []);
    if (!pending.length) {
      Toast.show('Aucune demande en attente', 'info'); return;
    }
    let html = '<div style="display:flex;flex-direction:column;gap:10px">';
    pending.forEach(m => {
      html += `
        <div class="member-item" id="pending-${m.id}">
          <div class="avatar-sm">${m.initials || m.name.slice(0,2).toUpperCase()}</div>
          <div class="member-info">
            <p class="member-name">${m.name}</p>
            <p class="member-role">Demande le ${m.requested_at || 'récemment'}</p>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn-primary btn-sm" onclick="MemberApproval.decide(${tontine.id},${m.id},'approve','${m.name}')">✓</button>
            <button class="btn-outline btn-sm" onclick="MemberApproval.decide(${tontine.id},${m.id},'reject','${m.name}')">✗</button>
          </div>
        </div>`;
    });
    html += '</div>';
    Modal.open(`Demandes en attente (${pending.length})`, html);
  },

  async decide(tontineId, memberId, action, name) {
    const label = action === 'approve' ? 'approuver' : 'refuser';
    const confirmed = await Modal.confirm(
      `${action === 'approve' ? 'Approuver' : 'Refuser'} ${name} ?`,
      `Voulez-vous vraiment ${label} la demande de ${name} ?`,
      action === 'approve' ? '✓ Approuver' : '✗ Refuser'
    );
    if (!confirmed) return;

    const res = await API.request('approveMember', { tontineId, memberId, action });
    if (res.success) {
      const el = document.getElementById(`pending-${memberId}`);
      if (el) el.remove();
      Toast.show(
        action === 'approve' ? `${name} a été accepté(e) !` : `Demande de ${name} refusée.`,
        action === 'approve' ? 'success' : 'warning'
      );
      Dashboard.load();
    } else {
      Toast.show(res.message || 'Erreur', 'error');
    }
  },

  /* Badge de demandes en attente sur l'icône admin */
  async updateBadge(tontineId) {
    const res = await API.request('getPendingMembers', { tontineId });
    const count = res.data?.length || 0;
    const badge = document.getElementById('pending-badge');
    if (badge) { badge.textContent = count; badge.style.display = count ? 'flex' : 'none'; }
  }
};

/* ═══════════════════════════════════════════════════════════════
   5. PIN DE VERROUILLAGE
   ═══════════════════════════════════════════════════════════════ */
const PINLock = {
  STORAGE_KEY: 'tf_pin_hash',
  isSetup: false,

  init() {
    this.isSetup = !!Storage.load('pin_enabled');
    if (this.isSetup && Storage.load('pin_enabled')) {
      this.lock();
    }
    const toggle = document.getElementById('setting-pin');
    if (toggle) {
      toggle.checked = this.isSetup;
      toggle.addEventListener('change', () => {
        if (toggle.checked) this.setupPIN();
        else this.disablePIN();
      });
    }
  },

  setupPIN() {
    Modal.open('Créer un code PIN', `
      <p style="font-size:var(--fs-sm);color:var(--color-text-2);margin-bottom:var(--sp-md)">
        Ce PIN sera demandé à chaque ouverture de l'application.
      </p>
      <div class="pin-grid" id="pin-display"><span></span><span></span><span></span><span></span></div>
      <div class="pin-keypad" id="pin-keypad"></div>
      <p class="pin-hint" id="pin-hint">Entrez votre nouveau PIN (4 chiffres)</p>
    `);
    this._renderKeypad('pin-keypad', (pin) => {
      if (pin.length === 4) {
        Storage.save('pin_hash', this._hash(pin));
        Storage.save('pin_enabled', true);
        this.isSetup = true;
        Toast.show('PIN activé avec succès', 'success');
        Modal.close();
      }
    });
  },

  disablePIN() {
    this.lock(true, () => {
      Storage.remove('pin_hash');
      Storage.remove('pin_enabled');
      this.isSetup = false;
      Toast.show('PIN désactivé', 'warning');
    });
  },

  lock(verify = false, onSuccess = null) {
    const overlay = document.createElement('div');
    overlay.id = 'pin-overlay';
    overlay.innerHTML = `
      <div class="pin-lock-inner">
        <div class="pin-lock-icon">🔒</div>
        <h2>Tontines Facile</h2>
        <p>${verify ? 'Confirmez votre PIN' : 'Entrez votre PIN pour continuer'}</p>
        <div class="pin-grid" id="pin-lock-display"><span></span><span></span><span></span><span></span></div>
        <div class="pin-keypad" id="pin-lock-keypad"></div>
        <p class="pin-hint" id="pin-lock-hint" style="color:transparent">.</p>
        <button class="pin-logout-btn" onclick="Auth.logout()">Changer de compte</button>
      </div>
    `;
    document.body.appendChild(overlay);

    this._renderKeypad('pin-lock-keypad', (pin) => {
      if (pin.length === 4) {
        if (this._hash(pin) === Storage.load('pin_hash')) {
          overlay.remove();
          if (onSuccess) onSuccess();
        } else {
          document.getElementById('pin-lock-hint').textContent = '❌ PIN incorrect, réessayez';
          document.getElementById('pin-lock-hint').style.color = 'var(--color-red)';
          /* Reset display */
          document.querySelectorAll('#pin-lock-display span').forEach(s => s.classList.remove('filled'));
          setTimeout(() => { document.getElementById('pin-lock-hint').style.color = 'transparent'; }, 1500);
        }
      }
    });
  },

  _renderKeypad(containerId, onComplete) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const display = document.getElementById(containerId.replace('keypad', 'display'));
    let pin = '';
    const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
    keys.forEach(k => {
      const btn = document.createElement('button');
      btn.className = 'pin-key' + (k === '' ? ' pin-key-empty' : '');
      btn.textContent = k;
      if (k !== '') btn.addEventListener('click', () => {
        if (k === '⌫') {
          pin = pin.slice(0, -1);
        } else if (pin.length < 4) {
          pin += k;
        }
        /* Update display */
        display.querySelectorAll('span').forEach((s, i) => {
          s.classList.toggle('filled', i < pin.length);
        });
        if (pin.length === 4) onComplete(pin);
      });
      container.appendChild(btn);
    });
  },

  _hash(pin) {
    /* Simple hash — in production use bcrypt via server */
    let h = 0;
    for (let i = 0; i < pin.length; i++) { h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0; }
    return h.toString(36) + '_tf_' + pin.length;
  }
};

/* ═══════════════════════════════════════════════════════════════
   6. PUSH NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════ */
const PushNotifications = {
  async request() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') {
      Toast.show('Notifications bloquées dans vos paramètres navigateur', 'warning'); return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      Toast.show('Notifications activées ! 🔔', 'success');
      await this.subscribe();
    }
  },

  async subscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjZJkuHJ1uE08cGkMvQJWbMaZGE='
          /* Remplacer par votre vraie clé VAPID publique */
        )
      });
      await API.request('savePushSubscription', { subscription: JSON.stringify(sub) });
    } catch (e) {
      console.warn('[Push] Abonnement échoué :', e);
    }
  },

  showLocal(title, body, icon = '🌿') {
    if (Notification.permission !== 'granted') return;
    new Notification(`${icon} ${title}`, { body, badge: '/icon-72.png', tag: 'tf-local' });
  },

  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = window.atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }
};

/* ═══════════════════════════════════════════════════════════════
   7. EXPORT PDF / CSV
   ═══════════════════════════════════════════════════════════════ */
const Exporter = {
  /* Export CSV du journal d'audit */
  exportLogCSV(entries, filename = 'journal-audit.csv') {
    const headers = ['Date', 'Type', 'Action', 'Détail', 'Auteur'];
    const rows    = entries.map(e => [
      e.time, e.type, e.action, e.detail, e.user
    ].map(v => `"${(v || '').replace(/"/g, '""')}"`));
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const bom = '\uFEFF'; // UTF-8 BOM pour Excel
    this._download(bom + csv, filename, 'text/csv;charset=utf-8');
    Toast.show('Export CSV téléchargé', 'success');
  },

  /* Export CSV des transactions */
  exportTransactionsCSV(transactions) {
    const headers = ['Date', 'Type', 'Libellé', 'Tontine', 'Montant (FCFA)', 'Statut'];
    const rows    = transactions.map(t => [
      t.date,
      t.type === 'in' ? 'Crédit' : 'Débit',
      t.name, t.tontine,
      t.amount,
      t.status
    ].map(v => `"${(String(v || '')).replace(/"/g, '""')}"`));
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    this._download('\uFEFF' + csv, 'transactions.csv', 'text/csv;charset=utf-8');
    Toast.show('Export CSV téléchargé', 'success');
  },

  /* Export HTML → Print (simule PDF) */
  exportAuditPDF(entries, tontineName = 'Tontines Facile') {
    const rows = entries.map(e => `
      <tr>
        <td style="padding:8px;border:1px solid #cde8da;font-size:12px;color:#6b9b7e">${e.time}</td>
        <td style="padding:8px;border:1px solid #cde8da;font-size:12px"><span class="type-badge ${e.type}">${e.type}</span></td>
        <td style="padding:8px;border:1px solid #cde8da;font-size:12px;font-weight:700">${e.action}</td>
        <td style="padding:8px;border:1px solid #cde8da;font-size:12px;color:#3d6b52">${e.detail}</td>
        <td style="padding:8px;border:1px solid #cde8da;font-size:12px;color:#0f6b4a;font-weight:600">${e.user}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
      <title>Journal d'audit — ${tontineName}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:40px;color:#0d2b1e}
        h1{color:#0f6b4a;margin-bottom:4px}
        .meta{color:#6b9b7e;font-size:13px;margin-bottom:24px}
        table{width:100%;border-collapse:collapse}
        th{background:#0f6b4a;color:#fff;padding:10px 8px;text-align:left;font-size:12px}
        tr:nth-child(even){background:#f0f7f4}
        .type-badge{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700}
        .type-badge.payment{background:#dcfce7;color:#16a34a}
        .type-badge.admin{background:#fef3c7;color:#d97706}
        .type-badge.member{background:#dbeafe;color:#1d4ed8}
        .type-badge.system{background:#f3f4f6;color:#6b7280}
        @media print{body{margin:20px}}
      </style></head><body>
      <h1>🌿 Journal d'audit</h1>
      <p class="meta">Tontine : <strong>${tontineName}</strong> · Exporté le ${new Date().toLocaleDateString('fr-FR')} · ${entries.length} entrées</p>
      <table><thead><tr><th>Date</th><th>Type</th><th>Action</th><th>Détail</th><th>Auteur</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload=()=>window.print()<\/script></body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  },

  _download(content, filename, type) {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

/* ═══════════════════════════════════════════════════════════════
   8. RAPPELS AUTOMATIQUES (cron simulé côté client)
   ═══════════════════════════════════════════════════════════════ */
const AutoReminder = {
  CHECK_INTERVAL: 3600000, // 1h

  start() {
    this.check();
    setInterval(() => this.check(), this.CHECK_INTERVAL);
  },

  async check() {
    if (!App.currentUser) return;
    const lastCheck = Storage.load('last_reminder_check');
    const now = Date.now();
    if (lastCheck && now - lastCheck < this.CHECK_INTERVAL) return;
    Storage.save('last_reminder_check', now);

    const res = await API.request('getTontines');
    if (!res.success) return;

    res.data.forEach(t => {
      if (t.userRole !== 'admin') return;
      const nextDate = t.nextPaymentDate ? new Date(t.nextPaymentDate) : null;
      if (!nextDate) return;
      const daysLeft = Math.ceil((nextDate - new Date()) / 86400000);
      if (daysLeft <= 3 && daysLeft >= 0) {
        PushNotifications.showLocal(
          'Rappel de paiement',
          `${t.name} — échéance dans ${daysLeft} jour(s)`, '💰'
        );
      }
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   9. UPLOAD PHOTO DE PROFIL
   ═══════════════════════════════════════════════════════════════ */
const AvatarUpload = {
  init() {
    const btn = document.getElementById('btn-edit-avatar');
    if (!btn) return;
    btn.addEventListener('click', () => this.openPicker());
  },

  openPicker() {
    Modal.open('Changer la photo de profil', `
      <div style="display:flex;flex-direction:column;gap:16px;align-items:center">
        <div class="avatar-xl" id="avatar-preview" style="width:100px;height:100px;font-size:2rem">
          ${App.currentUser?.avatar || 'U'}
        </div>
        <input type="file" id="avatar-file" accept="image/jpeg,image/png,image/webp"
               style="display:none"/>
        <button class="btn-primary" onclick="document.getElementById('avatar-file').click()">
          📷 Choisir une photo
        </button>
        <p style="font-size:var(--fs-xs);color:var(--color-text-3)">JPG, PNG ou WebP · Max 2 Mo</p>
        <div class="avatar-initials-grid" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
          ${['🌿','⭐','💎','🦁','🦋','🌸','🔥','🎯'].map(e =>
            `<button class="avatar-emoji-btn" onclick="AvatarUpload.setEmoji('${e}')"
              style="width:44px;height:44px;border-radius:50%;background:var(--color-surface2);
                     border:1.5px solid var(--color-border);font-size:22px">${e}</button>`
          ).join('')}
        </div>
      </div>
    `, `<button class="btn-primary btn-full" id="btn-save-avatar">Sauvegarder</button>`);

    document.getElementById('avatar-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2097152) { Toast.show('Image trop grande (max 2 Mo)', 'error'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.getElementById('avatar-preview');
        img.style.backgroundImage = `url(${ev.target.result})`;
        img.style.backgroundSize  = 'cover';
        img.textContent = '';
        img.dataset.imgData = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('btn-save-avatar').addEventListener('click', async () => {
      const preview = document.getElementById('avatar-preview');
      const imgData = preview.dataset.imgData || preview.textContent;
      UI.setLoading('btn-save-avatar', true, 'Sauvegarde...');
      const res = await API.request('updateAvatar', { avatar: imgData });
      UI.setLoading('btn-save-avatar', false, 'Sauvegarder');
      if (res.success) {
        App.currentUser.avatar = imgData;
        Storage.save('user', App.currentUser);
        UI.updateUserInfo();
        Toast.show('Photo mise à jour !', 'success');
        Modal.close();
      }
    });
  },

  setEmoji(emoji) {
    const preview = document.getElementById('avatar-preview');
    preview.style.backgroundImage = '';
    preview.textContent = emoji;
    preview.dataset.imgData = emoji;
  }
};

/* ═══════════════════════════════════════════════════════════════
   10. FILTRE JOURNAL D'AUDIT
   ═══════════════════════════════════════════════════════════════ */
const AuditFilter = {
  allEntries: [],

  init(entries) {
    this.allEntries = entries;
    this.render(entries);

    /* Inject filter UI */
    const list = document.getElementById('audit-log-list');
    const filterBar = document.createElement('div');
    filterBar.className = 'audit-filter-bar';
    filterBar.innerHTML = `
      <div class="filter-chips" style="margin-bottom:12px">
        <button class="chip active" data-type="all">Tout</button>
        <button class="chip" data-type="payment">💰 Paiements</button>
        <button class="chip" data-type="admin">👑 Admin</button>
        <button class="chip" data-type="member">👤 Membres</button>
        <button class="chip" data-type="system">⚙️ Système</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input type="date" class="form-input" id="audit-date-from" style="flex:1;font-size:var(--fs-xs)" placeholder="Du"/>
        <input type="date" class="form-input" id="audit-date-to"   style="flex:1;font-size:var(--fs-xs)" placeholder="Au"/>
        <button class="btn-outline btn-sm" id="btn-audit-search">Filtrer</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input type="text" class="form-input" id="audit-search" placeholder="Rechercher dans le journal..." style="flex:1;font-size:var(--fs-sm)"/>
        <button class="btn-ghost btn-sm" id="btn-export-csv" title="Exporter CSV">📥 CSV</button>
        <button class="btn-ghost btn-sm" id="btn-export-pdf" title="Imprimer / PDF">🖨️ PDF</button>
      </div>
    `;
    list.parentNode.insertBefore(filterBar, list);

    /* Type filter */
    filterBar.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        filterBar.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.apply();
      });
    });

    /* Date + text filter */
    document.getElementById('btn-audit-search').addEventListener('click', () => this.apply());
    document.getElementById('audit-search').addEventListener('input', () => this.apply());

    /* Exports */
    document.getElementById('btn-export-csv').addEventListener('click', () =>
      Exporter.exportLogCSV(this.allEntries));
    document.getElementById('btn-export-pdf').addEventListener('click', () =>
      Exporter.exportAuditPDF(this.allEntries, App.currentTontine?.name));
  },

  apply() {
    const type   = document.querySelector('.audit-filter-bar .chip.active')?.dataset.type || 'all';
    const from   = document.getElementById('audit-date-from')?.value;
    const to     = document.getElementById('audit-date-to')?.value;
    const search = document.getElementById('audit-search')?.value.toLowerCase();

    let filtered = this.allEntries;
    if (type !== 'all')  filtered = filtered.filter(e => e.type === type);
    if (search) filtered = filtered.filter(e =>
      (e.action + e.detail + e.user).toLowerCase().includes(search));
    this.render(filtered);
  },

  render(entries) {
    const list = document.getElementById('audit-log-list');
    list.innerHTML = '';
    if (!entries.length) {
      list.innerHTML = '<div class="empty-state small"><p>Aucune entrée correspondante</p></div>';
      return;
    }
    entries.forEach(entry => {
      const div = document.createElement('div');
      div.className = `log-item ${entry.type}`;
      div.innerHTML = `
        <p class="log-action">${entry.action}</p>
        <p class="log-detail">${entry.detail}</p>
        <div class="log-meta">
          <span class="log-user">@${entry.user}</span>
          <span class="log-time">${entry.time}</span>
        </div>`;
      list.appendChild(div);
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   11. ONBOARDING TUTORIEL
   ═══════════════════════════════════════════════════════════════ */
const Onboarding = {
  steps: [
    { icon: '🌿', title: 'Bienvenue !', text: 'Tontines Facile vous permet de gérer vos tontines avec une transparence totale. Chaque action est enregistrée.' },
    { icon: '➕', title: 'Créez votre première tontine', text: 'Appuyez sur "Créer" dans la barre du bas. Définissez le montant, la fréquence et les règles en 3 étapes.' },
    { icon: '👥', title: 'Invitez vos membres', text: 'Partagez le code d\'invitation généré automatiquement. Vos contacts peuvent rejoindre en 1 tap.' },
    { icon: '💰', title: 'Suivez les paiements', text: 'Confirmez les mises, visualisez la matrice de paiements et lancez les tours suivants facilement.' },
    { icon: '📋', title: 'Journal d\'audit transparent', text: 'Toutes les actions sont enregistrées et visibles par tous les membres. Aucune modification possible.' },
  ],
  current: 0,

  shouldShow() {
    return !Storage.load('onboarding_done') && !App.currentUser;
  },

  show() {
    if (Storage.load('onboarding_done')) return;
    this.current = 0;
    this.render();
  },

  render() {
    const step = this.steps[this.current];
    const existing = document.getElementById('onboarding-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-card">
        <div class="onboarding-icon">${step.icon}</div>
        <h2 class="onboarding-title">${step.title}</h2>
        <p class="onboarding-text">${step.text}</p>
        <div class="onboarding-dots">
          ${this.steps.map((_, i) =>
            `<span class="dot ${i === this.current ? 'active' : ''}"></span>`
          ).join('')}
        </div>
        <button class="btn-primary btn-full" id="btn-onboarding-next">
          ${this.current < this.steps.length - 1 ? 'Suivant →' : 'Commencer 🚀'}
        </button>
        <button class="btn-ghost btn-full" id="btn-onboarding-skip" style="margin-top:8px">
          Passer
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btn-onboarding-next').addEventListener('click', () => {
      if (this.current < this.steps.length - 1) {
        this.current++;
        this.render();
      } else {
        this.finish();
      }
    });
    document.getElementById('btn-onboarding-skip').addEventListener('click', () => this.finish());
  },

  finish() {
    document.getElementById('onboarding-overlay')?.remove();
    Storage.save('onboarding_done', true);
  }
};

/* ═══════════════════════════════════════════════════════════════
   12. CONFIRMATION DE DÉCONNEXION
   ═══════════════════════════════════════════════════════════════ */
const SafeLogout = {
  async confirm() {
    const ok = await Modal.confirm(
      'Se déconnecter ?',
      'Voulez-vous vraiment vous déconnecter ? Vous devrez vous reconnecter pour accéder à vos tontines.',
      'Se déconnecter'
    );
    if (ok) Auth.logout();
  }
};

/* ═══════════════════════════════════════════════════════════════
   13. PULL-TO-REFRESH
   ═══════════════════════════════════════════════════════════════ */
const PullToRefresh = {
  startY: 0,
  pulling: false,
  threshold: 80,

  init() {
    const content = document.getElementById('main-content');
    if (!content) return;

    content.addEventListener('touchstart', (e) => {
      if (content.scrollTop === 0) {
        this.startY = e.touches[0].clientY;
        this.pulling = true;
      }
    }, { passive: true });

    content.addEventListener('touchmove', (e) => {
      if (!this.pulling) return;
      const dist = e.touches[0].clientY - this.startY;
      if (dist > 0 && dist < 150) {
        let indicator = document.getElementById('ptr-indicator');
        if (!indicator) {
          indicator = document.createElement('div');
          indicator.id = 'ptr-indicator';
          indicator.innerHTML = '↓ Tirer pour actualiser';
          content.parentNode.insertBefore(indicator, content);
        }
        const opacity = Math.min(dist / this.threshold, 1);
        indicator.style.opacity = opacity;
        indicator.style.transform = `translateY(${Math.min(dist * 0.4, 40)}px)`;
        if (dist >= this.threshold) indicator.innerHTML = '🔄 Relâcher pour actualiser';
      }
    }, { passive: true });

    content.addEventListener('touchend', async (e) => {
      if (!this.pulling) return;
      this.pulling = false;
      const dist = e.changedTouches[0].clientY - this.startY;
      const indicator = document.getElementById('ptr-indicator');
      if (dist >= this.threshold) {
        if (indicator) indicator.innerHTML = '<div class="spinner" style="width:24px;height:24px;margin:0 auto"></div>';
        await this.refresh();
      }
      if (indicator) {
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 300);
      }
    }, { passive: true });
  },

  async refresh() {
    const page = App.currentPage;
    if (page === 'dashboard')  await Dashboard.load();
    if (page === 'my-tontines') await Dashboard.load();
    if (page === 'transactions') await Transactions.load();
    if (page === 'audit-log')   await AuditLog.load();
    if (page === 'tontine-detail' && App.currentTontine) {
      const res = await API.request('getTontine', { tontineId: App.currentTontine.id });
      if (res.success) TontineDetail.render(res.data);
    }
    Toast.show('Actualisé ✓', 'success');
  }
};

/* ═══════════════════════════════════════════════════════════════
   14. MULTI-LANGUE (FR / EN)
   ═══════════════════════════════════════════════════════════════ */
const I18n = {
  current: 'fr',
  strings: {
    fr: {
      'my_tontines': 'Mes Tontines', 'create': 'Créer', 'join': 'Rejoindre',
      'profile': 'Profil', 'settings': 'Paramètres', 'dashboard': 'Accueil',
      'login': 'Se connecter', 'register': 'Créer mon compte',
      'logout': 'Déconnexion', 'save': 'Sauvegarder',
      'confirm': 'Confirmer', 'cancel': 'Annuler',
      'active_tontines': 'Tontines actives', 'total_savings': 'Épargne totale',
      'next_payment': 'Prochaine mise', 'total_members': 'Membres totaux',
      'no_tontines': 'Aucune tontine pour l\'instant',
      'create_first': 'Créer ma première tontine',
    },
    en: {
      'my_tontines': 'My Tontines', 'create': 'Create', 'join': 'Join',
      'profile': 'Profile', 'settings': 'Settings', 'dashboard': 'Home',
      'login': 'Sign in', 'register': 'Create account',
      'logout': 'Sign out', 'save': 'Save',
      'confirm': 'Confirm', 'cancel': 'Cancel',
      'active_tontines': 'Active tontines', 'total_savings': 'Total savings',
      'next_payment': 'Next payment', 'total_members': 'Total members',
      'no_tontines': 'No tontines yet',
      'create_first': 'Create my first tontine',
    }
  },

  t(key) { return this.strings[this.current]?.[key] || this.strings['fr'][key] || key; },

  setLanguage(lang) {
    if (!this.strings[lang]) return;
    this.current = lang;
    Storage.save('language', lang);
    document.documentElement.lang = lang;
    this.applyAll();
    Toast.show(lang === 'en' ? 'Language set to English' : 'Langue définie en français', 'success');
  },

  applyAll() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });
  },

  init() {
    const saved = Storage.load('language') || 'fr';
    this.current = saved;
    this.applyAll();
  }
};

/* ═══════════════════════════════════════════════════════════════
   15. RATE LIMITING CÔTÉ CLIENT
   ═══════════════════════════════════════════════════════════════ */
const RateLimit = {
  counts: {},
  limits: { login: { max: 5, window: 300000 }, forgot: { max: 3, window: 600000 }, register: { max: 3, window: 300000 } },

  check(action) {
    const limit = this.limits[action];
    if (!limit) return true;
    const now = Date.now();
    if (!this.counts[action]) this.counts[action] = [];
    this.counts[action] = this.counts[action].filter(t => now - t < limit.window);
    if (this.counts[action].length >= limit.max) {
      const wait = Math.ceil((limit.window - (now - this.counts[action][0])) / 1000);
      Toast.show(`Trop de tentatives. Réessayez dans ${wait}s.`, 'error');
      return false;
    }
    this.counts[action].push(now);
    return true;
  }
};

/* ═══════════════════════════════════════════════════════════════
   16. CSRF TOKEN
   ═══════════════════════════════════════════════════════════════ */
const CSRF = {
  token: null,

  generate() {
    this.token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    Storage.save('csrf_token', this.token);
    return this.token;
  },

  get() {
    if (!this.token) this.token = Storage.load('csrf_token') || this.generate();
    return this.token;
  }
};

/* Patch API pour inclure CSRF token automatiquement */
const _originalRequest = API.request.bind(API);
API.request = async function(action, data = {}) {
  return _originalRequest(action, { ...data, csrf: CSRF.get() });
};

/* ═══════════════════════════════════════════════════════════════
   17. VALIDATION RENFORCÉE
   ═══════════════════════════════════════════════════════════════ */
const Validate = {
  email(v)   { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); },
  phone(v)   { return !v || /^[\d\s+\-().]{8,20}$/.test(v); },
  amount(v)  { return !isNaN(v) && Number(v) >= 100; },
  name(v)    { return v && v.trim().length >= 2 && v.trim().length <= 120; },
  code(v)    { return /^TF-[A-Z0-9]{4,8}$/.test(v?.toUpperCase()); },

  passwordStrength(pw) {
    let s = 0;
    if (pw.length >= 8)            s++;
    if (/[A-Z]/.test(pw))         s++;
    if (/[0-9]/.test(pw))         s++;
    if (/[^A-Za-z0-9]/.test(pw))  s++;
    return s;
  },

  showError(fieldId, msg) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add('input-error');
    let err = field.parentNode.querySelector('.field-error');
    if (!err) { err = document.createElement('p'); err.className = 'field-error'; field.parentNode.appendChild(err); }
    err.textContent = msg;
    field.addEventListener('input', () => { field.classList.remove('input-error'); err.remove(); }, { once: true });
  },

  clearErrors() {
    document.querySelectorAll('.input-error').forEach(e => e.classList.remove('input-error'));
    document.querySelectorAll('.field-error').forEach(e => e.remove());
  }
};

/* ═══════════════════════════════════════════════════════════════
   18. LOGGING STRUCTURÉ DES ERREURS
   ═══════════════════════════════════════════════════════════════ */
const Logger = {
  logs: [],
  MAX: 100,

  log(level, message, context = {}) {
    const entry = {
      ts: new Date().toISOString(), level, message,
      page: App.currentPage, user: App.currentUser?.id || null, ...context
    };
    this.logs.unshift(entry);
    if (this.logs.length > this.MAX) this.logs.pop();
    if (level === 'error') console.error(`[TF][${level.toUpperCase()}]`, message, context);
    else console.log(`[TF][${level.toUpperCase()}]`, message, context);
  },

  info(msg, ctx)  { this.log('info', msg, ctx); },
  warn(msg, ctx)  { this.log('warn', msg, ctx); },
  error(msg, ctx) { this.log('error', msg, ctx); },

  exportLogs() {
    const json = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `tf-logs-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  },

  /* Capture les erreurs globales */
  installGlobalHandler() {
    window.addEventListener('error', e => {
      this.error(e.message, { file: e.filename, line: e.lineno, col: e.colno });
    });
    window.addEventListener('unhandledrejection', e => {
      this.error('Promise rejetée', { reason: String(e.reason) });
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   STYLES ADDITIONNELS (injectés dynamiquement)
   ═══════════════════════════════════════════════════════════════ */
(function injectStyles() {
  const css = `
  /* ── Offline bar ── */
  #offline-bar {
    position:fixed;top:0;left:0;right:0;z-index:9999;
    background:#e03040;color:#fff;text-align:center;
    padding:10px;font-size:.8rem;font-weight:700;
    transform:translateY(-100%);transition:transform .3s ease;
  }
  #offline-bar.visible { transform:translateY(0); }

  /* ── Update banner ── */
  .update-banner {
    position:fixed;bottom:calc(var(--nav-h,72px) + 12px);left:16px;right:16px;
    background:var(--color-surface,#fff);border:1.5px solid var(--color-primary,#0f6b4a);
    border-radius:12px;padding:12px 16px;display:flex;align-items:center;
    justify-content:space-between;z-index:500;box-shadow:0 4px 20px rgba(0,0,0,.15);
    font-size:.85rem;font-weight:600;
  }
  .update-banner button {
    background:var(--color-primary,#0f6b4a);color:#fff;border:none;
    padding:6px 14px;border-radius:8px;font-weight:700;cursor:pointer;font-size:.8rem;
  }

  /* ── PIN overlay ── */
  #pin-overlay {
    position:fixed;inset:0;background:var(--color-bg,#f0f7f4);
    z-index:9000;display:flex;align-items:center;justify-content:center;
    padding:var(--sp-lg,24px);
  }
  .pin-lock-inner { text-align:center;max-width:320px;width:100%; }
  .pin-lock-icon { font-size:48px;margin-bottom:16px;animation:bounce .6s ease infinite alternate; }
  @keyframes bounce { from{transform:translateY(0)} to{transform:translateY(-8px)} }
  .pin-lock-inner h2 { font-size:1.4rem;font-weight:800;color:var(--color-text,#0d2b1e);margin-bottom:4px; }
  .pin-lock-inner p  { font-size:.85rem;color:var(--color-text-2,#3d6b52);margin-bottom:24px; }

  .pin-grid {
    display:flex;gap:16px;justify-content:center;margin-bottom:24px;
  }
  .pin-grid span {
    width:20px;height:20px;border-radius:50%;
    border:2px solid var(--color-border,#cde8da);
    transition:all .15s;
  }
  .pin-grid span.filled {
    background:var(--color-primary,#0f6b4a);border-color:var(--color-primary,#0f6b4a);
    transform:scale(1.2);
  }

  .pin-keypad {
    display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:260px;margin:0 auto;
  }
  .pin-key {
    height:64px;border-radius:16px;background:var(--color-surface,#fff);
    border:1.5px solid var(--color-border,#cde8da);
    font-size:1.4rem;font-weight:700;color:var(--color-text,#0d2b1e);
    cursor:pointer;transition:all .1s;box-shadow:0 2px 8px rgba(0,0,0,.06);
  }
  .pin-key:active { transform:scale(.92);background:var(--color-surface2,#e8f5ef); }
  .pin-key-empty { visibility:hidden;pointer-events:none; }
  .pin-hint { font-size:.8rem;color:var(--color-text-3,#6b9b7e);min-height:1.2em;margin:12px 0; }
  .pin-logout-btn {
    font-size:.8rem;color:var(--color-text-3,#6b9b7e);background:none;border:none;
    cursor:pointer;margin-top:16px;text-decoration:underline;
  }

  /* ── Onboarding ── */
  #onboarding-overlay {
    position:fixed;inset:0;background:rgba(0,0,0,.7);
    z-index:8000;display:flex;align-items:flex-end;justify-content:center;
    backdrop-filter:blur(6px);padding:20px;
  }
  .onboarding-card {
    background:var(--color-surface,#fff);border-radius:24px;
    padding:32px 24px;width:100%;max-width:420px;text-align:center;
    animation:slideUp .4s ease;
  }
  .onboarding-icon { font-size:56px;margin-bottom:16px; }
  .onboarding-title { font-size:1.4rem;font-weight:800;margin-bottom:8px;color:var(--color-text,#0d2b1e); }
  .onboarding-text  { font-size:.9rem;color:var(--color-text-2,#3d6b52);line-height:1.7;margin-bottom:24px; }
  .onboarding-dots  { display:flex;gap:8px;justify-content:center;margin-bottom:24px; }
  .onboarding-dots .dot {
    width:8px;height:8px;border-radius:50%;background:var(--color-border,#cde8da);transition:all .3s;
  }
  .onboarding-dots .dot.active { background:var(--color-primary,#0f6b4a);width:24px;border-radius:4px; }

  /* ── Pull-to-refresh indicator ── */
  #ptr-indicator {
    position:absolute;top:var(--topbar-h,60px);left:50%;transform:translateX(-50%);
    background:var(--color-primary,#0f6b4a);color:#fff;padding:8px 20px;
    border-radius:999px;font-size:.8rem;font-weight:700;opacity:0;
    transition:opacity .2s,transform .2s;pointer-events:none;z-index:200;white-space:nowrap;
  }

  /* ── Audit filter bar ── */
  .audit-filter-bar { margin-bottom:4px; }

  /* ── Avatar emoji buttons ── */
  .avatar-emoji-btn:hover { transform:scale(1.2);background:var(--color-primary,#0f6b4a)!important; }

  /* ── Input error state ── */
  .input-error { border-color:var(--color-red,#e03040)!important;box-shadow:0 0 0 3px rgba(224,48,64,.1)!important; }
  .field-error  { font-size:var(--fs-xs,.72rem);color:var(--color-red,#e03040);margin-top:4px; }

  /* ── Language selector in settings ── */
  .lang-grid { display:flex;gap:12px;margin-top:8px; }
  .lang-btn {
    flex:1;padding:12px;border-radius:var(--r-md,14px);border:2px solid var(--color-border,#cde8da);
    background:var(--color-surface,#fff);cursor:pointer;font-size:.9rem;font-weight:700;
    transition:all .15s;
  }
  .lang-btn.active { border-color:var(--color-primary,#0f6b4a);color:var(--color-primary,#0f6b4a);background:var(--color-surface2,#e8f5ef); }

  /* ── Export buttons in transactions ── */
  .export-bar { display:flex;gap:8px;margin-bottom:12px;justify-content:flex-end; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ═══════════════════════════════════════════════════════════════
   INITIALISATION DE TOUS LES MODULES
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* Logger en premier pour capturer toutes les erreurs */
  Logger.installGlobalHandler();
  Logger.info('Improvements.js chargé');

  /* CSRF */
  CSRF.generate();

  /* Service Worker */
  ServiceWorkerManager.register();

  /* PWA token reset */
  ForgotPassword.checkResetToken();

  /* Pull to refresh */
  PullToRefresh.init();

  /* Auto-reminders */
  setTimeout(() => AutoReminder.start(), 5000);

  /* I18n */
  I18n.init();

  /* Patch logout buttons → confirmation simple */
  const patchLogout = () => {
    ['btn-logout', 'btn-logout-settings'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);
      document.getElementById(id)?.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (window.confirm('Se déconnecter de Tontines Facile ?')) {
          App.currentUser = null;
          App.token = null;
          try {
            localStorage.removeItem('tf_user');
            localStorage.removeItem('tf_token');
          } catch(err) {}
          Nav.history = [];
          if (typeof RealtimeNotifications !== 'undefined') RealtimeNotifications.disconnect();
          Nav.go('auth');
          Toast.show('Vous avez été déconnecté', 'warning');
        }
      });
    });
  };

  /* Patch forgot password link */
  const patchForgot = () => {
    document.querySelector('.auth-forgot')?.addEventListener('click', (e) => {
      e.preventDefault(); ForgotPassword.open();
    });
  };

  /* Patch notifications bell → request push permission */
  document.getElementById('btn-notif')?.addEventListener('click', () => {
    PushNotifications.request();
  }, { once: true });

  /* Add language selector to settings */
  const addLanguageSettings = () => {
    const cards = document.querySelectorAll('#page-settings .form-card');
    if (cards.length < 1) return;
    const langCard = document.createElement('div');
    langCard.className = 'form-card';
    langCard.innerHTML = `
      <h3 class="card-title">🌍 Langue / Language</h3>
      <div class="lang-grid">
        <button class="lang-btn ${I18n.current === 'fr' ? 'active' : ''}" onclick="I18n.setLanguage('fr')">🇫🇷 Français</button>
        <button class="lang-btn ${I18n.current === 'en' ? 'active' : ''}" onclick="I18n.setLanguage('en')">🇬🇧 English</button>
      </div>`;
    const lastCard = cards[cards.length - 1];
    lastCard.parentNode.insertBefore(langCard, lastCard);
  };

  /* Add export buttons to transactions page */
  const addExportButtons = () => {
    const txPage = document.getElementById('page-transactions');
    if (!txPage) return;
    const exportBar = document.createElement('div');
    exportBar.className = 'export-bar';
    exportBar.innerHTML = `
      <button class="btn-ghost btn-sm" id="btn-export-tx-csv">📥 Exporter CSV</button>
    `;
    const pageContent = txPage.querySelector('.page-content');
    if (pageContent) pageContent.insertBefore(exportBar, pageContent.firstChild);
    document.getElementById('btn-export-tx-csv')?.addEventListener('click', () => {
      Exporter.exportTransactionsCSV(Transactions.data || []);
    });
  };

  /* Add pending members button to tontine detail admin */
  const addPendingButton = () => {
    const adminActions = document.getElementById('detail-admin-actions');
    if (!adminActions) return;
    const pendingBtn = document.createElement('button');
    pendingBtn.className = 'btn-icon';
    pendingBtn.id = 'btn-pending-members';
    pendingBtn.title = 'Demandes en attente';
    pendingBtn.style.display = 'none';
    pendingBtn.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <span id="pending-badge" class="notif-badge" style="display:none;background:#f0b429">0</span>
    `;
    pendingBtn.addEventListener('click', () => {
      if (App.currentTontine) MemberApproval.openPending(App.currentTontine);
    });
    adminActions.appendChild(pendingBtn);
  };

  /* Wait for app to be ready, then patch */
  const waitAndPatch = () => {
    const app = document.getElementById('app');
    if (!app || app.classList.contains('hidden')) {
      setTimeout(waitAndPatch, 300); return;
    }
    patchLogout();
    patchForgot();
    addLanguageSettings();
    addExportButtons();
    addPendingButton();
    AvatarUpload.init();
    PINLock.init();
    Logger.info('Tous les patches appliqués');
  };
  setTimeout(waitAndPatch, 2500);

  /* Patch TontineDetail.open to also check pending members */
  const _origOpen = TontineDetail.open.bind(TontineDetail);
  TontineDetail.open = function(tontine) {
    _origOpen(tontine);
    if (tontine.userRole === 'admin') {
      const pendingBtn = document.getElementById('btn-pending-members');
      if (pendingBtn) {
        const pendingCount = tontine.pending_members?.length || 0;
        pendingBtn.style.display = pendingCount > 0 ? 'flex' : 'none';
        const badge = document.getElementById('pending-badge');
        if (badge) { badge.textContent = pendingCount; badge.style.display = pendingCount > 0 ? 'flex' : 'none'; }
      }
    }
  };

  /* Patch AuditLog.load to use AuditFilter */
  const _origAuditLoad = AuditLog.load.bind(AuditLog);
  AuditLog.load = async function() {
    await _origAuditLoad();
    const res = await API.request('getGlobalLog');
    if (res.success) AuditFilter.init(res.data);
  };

  /* Show onboarding for new users */
  setTimeout(() => {
    if (!Storage.load('user') && !Storage.load('onboarding_done')) {
      Onboarding.show();
    }
  }, 3000);
});

/* ── Expose globally ── */
window.ForgotPassword = ForgotPassword;
window.MemberApproval = MemberApproval;
window.PINLock        = PINLock;
window.Exporter       = Exporter;
window.AuditFilter    = AuditFilter;
window.Onboarding     = Onboarding;
window.SafeLogout     = SafeLogout;
window.I18n           = I18n;
window.Validate       = Validate;
window.Logger         = Logger;
window.PushNotifications = PushNotifications;

/* ═══════════════════════════════════════════════════════════════
   PWA INSTALL PROMPT
   ═══════════════════════════════════════════════════════════════ */
const PWAInstall = {
  deferredPrompt: null,

  init() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const btn = document.getElementById('pwa-install-btn');
      if (btn) btn.classList.add('visible');
    });

    document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
      if (!this.deferredPrompt) return;
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        Toast.show('Application installée ! 🎉', 'success');
        document.getElementById('pwa-install-btn')?.classList.remove('visible');
      }
      this.deferredPrompt = null;
    });

    window.addEventListener('appinstalled', () => {
      document.getElementById('pwa-install-btn')?.classList.remove('visible');
      Toast.show('Tontines Facile installé avec succès !', 'success');
      Logger.info('PWA installée');
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   SERVER-SENT EVENTS — Notifications temps réel
   ═══════════════════════════════════════════════════════════════ */
const RealtimeNotifications = {
  es: null,
  lastId: 0,

  connect() {
    if (!App.token || !window.EventSource) return;
    if (this.es) this.es.close();

    const url = `api.php?action=sse&token=${App.token}&lastId=${this.lastId}`;
    this.es = new EventSource(url);

    this.es.onmessage = (e) => {
      try {
        const notif = JSON.parse(e.data);
        this.lastId = Math.max(this.lastId, notif.id || 0);
        this.handleNotification(notif);
      } catch {}
    };

    this.es.onerror = () => {
      this.es.close();
      /* Reconnect after 10s */
      setTimeout(() => this.connect(), 10000);
    };
  },

  disconnect() {
    if (this.es) { this.es.close(); this.es = null; }
  },

  handleNotification(notif) {
    /* Update badge */
    const badge = document.getElementById('notif-badge');
    if (badge) {
      const current = parseInt(badge.textContent) || 0;
      badge.textContent = current + 1;
      badge.style.display = 'flex';
    }

    /* Bell shake animation */
    const bell = document.querySelector('.notif-btn');
    if (bell) {
      bell.classList.add('has-notif');
      setTimeout(() => bell.classList.remove('has-notif'), 2000);
    }

    /* Toast notification */
    const icons = { payment_confirmed: '💰', payment_reminder: '⏰', approved: '✅', rejected: '❌', disbursement: '🏆', join_request: '👤' };
    Toast.show(`${icons[notif.type] || '🔔'} ${notif.title}`, 'info', 5000);

    /* Local push */
    PushNotifications.showLocal(notif.title, notif.body || '', icons[notif.type] || '🔔');

    Logger.info('Notification reçue', { type: notif.type, title: notif.title });
  }
};

/* ═══════════════════════════════════════════════════════════════
   INITIALISATION FINALE — Tous les modules
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* PWA Install */
  PWAInstall.init();

  /* Patch Auth.onLogin pour démarrer SSE + AutoReminder */
  const _origOnLogin = Auth.onLogin.bind(Auth);
  Auth.onLogin = function(res) {
    _origOnLogin(res);
    setTimeout(() => {
      RealtimeNotifications.connect();
      AutoReminder.start();
    }, 1000);
  };

  /* Patch Auth.logout pour fermer SSE */
  const _origLogoutFinal = Auth.logout.bind(Auth);
  Auth.logout = function(force = false) {
    RealtimeNotifications.disconnect();
    _origLogoutFinal(force);
  };

  /* Restaurer session si déjà connecté → démarrer SSE */
  const savedToken = Storage.load('token');
  if (savedToken) {
    App.token = savedToken;
    setTimeout(() => RealtimeNotifications.connect(), 3000);
  }

  Logger.info('PWAInstall + RealtimeNotifications initialisés');
});

window.PWAInstall             = PWAInstall;
window.RealtimeNotifications  = RealtimeNotifications;
