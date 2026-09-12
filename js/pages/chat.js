/**
 * ═══════════════════════════════════════════════════════════════════
 * TONTINES FACILE — MESSAGERIE INSTANTANÉE (PAGE CHAT)
 * Fichier : js/pages/chat.js
 * Rôle : Système complet de messagerie (discussions privées et groupes
 *        de tontine), messages vocaux, pièces jointes et accusés de réception.
 * ═══════════════════════════════════════════════════════════════════
 */

const Chat = {
  currentConversationId: null,
  currentTitle: '',
  isGroup: false,
  pollTimer: null,
  listPollTimer: null,
  lastMessageId: 0,
  _sending: false,
  _conversations: [],

  /**
   * Initialise les écouteurs de la zone de saisie du chat
   */
  init() {
    const input = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('btn-chat-send');
    const recordBtn = document.getElementById('btn-chat-record');

    // Bascule dynamique entre bouton Micro et bouton Envoyer selon la saisie
    const syncInputState = () => {
      const hasText = (input?.value || '').trim().length > 0;
      if (sendBtn) sendBtn.classList.toggle('hidden', !hasText);
      if (recordBtn) recordBtn.classList.toggle('hidden', hasText);
      if (input) {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 110) + 'px';
      }
    };

    input?.addEventListener('input', syncInputState);
    syncInputState();

    sendBtn?.addEventListener('click', () => this.send());
    input?.addEventListener('keydown', (e) => {
      // Touche Entrée pour envoyer (Maj+Entrée pour saut de ligne)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });

    // Envoi de pièces jointes (photos / documents)
    document.getElementById('btn-chat-attach')?.addEventListener('click', () => {
      if (App.checkDemoRestriction('envoyer une pièce jointe')) return;
      document.getElementById('chat-file-input')?.click();
    });

    document.getElementById('chat-file-input')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      try {
        if (file.type.startsWith('image/')) {
          const base64 = await UI.resizeImageToBase64(file, 1000, 0.65);
          await this.sendAttachment('image', base64, file.name);
        } else {
          const base64 = await this._fileToBase64(file);
          await this.sendAttachment('file', base64, file.name);
        }
      } catch {
        Toast.show('Impossible d\'envoyer ce fichier', 'error');
      }
    });

    // Enregistrement de messages vocaux
    recordBtn?.addEventListener('click', () => {
      if (App.checkDemoRestriction('envoyer un message vocal')) return;
      this.toggleRecording();
    });
  },

  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,

  /**
   * Déclenche ou arrête l'enregistrement d'un message vocal
   */
  async toggleRecording() {
    if (App.checkDemoRestriction('enregistrer un message vocal')) return;
    const btn = document.getElementById('btn-chat-record');

    if (this.isRecording) {
      this.mediaRecorder?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      Toast.show('L\'enregistrement vocal n\'est pas supporté sur cet appareil', 'error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        btn?.classList.remove('recording');
        this.isRecording = false;

        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        if (blob.size < 500) return; // Annuler si trop court

        const reader = new FileReader();
        reader.onload = () => this.sendAttachment('audio', reader.result, 'vocal.webm');
        reader.readAsDataURL(blob);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      btn?.classList.add('recording');
      Toast.show('Enregistrement en cours… Appuyez pour envoyer', 'info');
    } catch {
      Toast.show('Micro indisponible ou permission refusée', 'error');
    }
  },

  /**
   * Ouvre une conversation privée 1-à-1 avec un utilisateur
   */
  async openWithUser(userId) {
    if (App.checkDemoRestriction('démarrer une conversation privée')) return;
    const res = await API.request('startConversation', { userId });
    if (!res.success) {
      Toast.show(res.message || 'Impossible d\'ouvrir la discussion', 'error');
      return;
    }
    await this.openThread(res.data.conversationId, 'Discussion privée', null, null, false);
  },

  /**
   * Ouvre le chat de groupe d'une tontine
   */
  async openTontineChat(tontineId) {
    if (App.checkDemoRestriction('accéder au chat de groupe')) return;
    const res = await API.request('getOrCreateTontineChat', { tontineId });
    if (!res.success) {
      Toast.show(res.message || 'Chat indisponible', 'error');
      return;
    }
    const name = App.currentTontine?.id === tontineId ? App.currentTontine.name : 'Chat de tontine';
    await this.openThread(res.data.conversationId, name, null, null, true);
  },

  /**
   * Ouvre un fil de discussion
   */
  async openThread(conversationId, title, avatar, avatarPhoto, isGroup = false) {
    this.currentConversationId = conversationId;
    this.currentTitle = title || 'Discussion';
    this.isGroup = isGroup;
    this.lastMessageId = 0;

    Nav.go('chat-thread', this.currentTitle);

    const avatarEl = document.getElementById('topbar-chat-avatar');
    const nameEl = document.getElementById('topbar-chat-name');
    if (nameEl) nameEl.textContent = this.currentTitle;

    const list = document.getElementById('chat-messages-list');
    if (list) list.innerHTML = UI.skeletonRows(4);

    await this.fetchMessages();
  },

  /**
   * Récupère les messages d'une conversation
   */
  async fetchMessages() {
    if (!this.currentConversationId) return;
    const res = await API.request('getMessages', { conversationId: this.currentConversationId });
    const list = document.getElementById('chat-messages-list');
    if (!list) return;

    if (!res.success || !res.data?.length) {
      list.innerHTML = '<div class="empty-state small"><p>Aucun message pour le moment. Dites bonjour ! 👋</p></div>';
      return;
    }

    list.innerHTML = '';
    res.data.forEach(m => {
      const mine = String(m.sender_id) === String(App.currentUser?.id);
      const div = document.createElement('div');
      div.className = `chat-bubble ${mine ? 'mine' : 'theirs'}`;
      div.innerHTML = `
        ${!mine && this.isGroup ? `<div class="chat-sender-name">${UI.escapeHtml(m.sender_name || '')}</div>` : ''}
        ${m.attachment_type === 'image' ? `<img class="chat-image" src="${m.attachment_data}" alt="Photo" />` : ''}
        ${m.attachment_type === 'audio' ? `<audio class="chat-audio" controls src="${m.attachment_data}"></audio>` : ''}
        ${m.body ? `<div>${UI.escapeHtml(m.body)}</div>` : ''}
        <span class="chat-time">${m.time || ''}</span>
      `;
      list.appendChild(div);
    });

    list.scrollTop = list.scrollHeight;
  },

  /**
   * Envoie un message texte
   */
  async send() {
    if (App.checkDemoRestriction('envoyer des messages dans le chat')) return;
    if (this._sending) return;

    const input = document.getElementById('chat-message-input');
    const body = (input?.value || '').trim();
    if (!body || !this.currentConversationId) return;

    this._sending = true;
    input.value = '';
    input.style.height = 'auto';

    const res = await API.request('sendMessage', {
      conversationId: this.currentConversationId,
      body
    });

    this._sending = false;
    if (res.success) {
      this.fetchMessages();
    } else {
      Toast.show(res.message || 'Impossible d\'envoyer le message', 'error');
    }
  },

  /**
   * Envoie une pièce jointe
   */
  async sendAttachment(type, dataUrl, name) {
    if (App.checkDemoRestriction('envoyer un fichier dans le chat')) return;
    if (!this.currentConversationId) return;

    const res = await API.request('sendMessage', {
      conversationId: this.currentConversationId,
      body: '',
      attachmentType: type,
      attachmentData: dataUrl,
      attachmentName: name
    });

    if (res.success) {
      this.fetchMessages();
    } else {
      Toast.show(res.message || 'Erreur lors de l\'envoi du fichier', 'error');
    }
  },

  startBackgroundRefresh() {},
  stopBackgroundRefresh() {},

  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
};

// Exposer globalement
window.Chat = Chat;
