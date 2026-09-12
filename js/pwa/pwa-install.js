/**
 * ==============================================================================================
 * MODULE PWA INSTALLATION (js/pwa/pwa-install.js)
 * ==============================================================================================
 * Ce module prend en charge le cycle de vie complet de l'installation de la Progressive Web App (PWA) :
 * 1. Capture de l'événement natif du navigateur 'beforeinstallprompt'.
 * 2. Affichage dynamique du bouton ou de la bannière d'installation dans l'application.
 * 3. Déclenchement de la boîte de dialogue d'installation native du système (WebAPK sur Android).
 * 4. Détection de l'installation réussie ('appinstalled') pour nettoyer l'interface et remercier l'utilisateur.
 * 5. Détection de l'exécution en mode autonome ('standalone' ou affichage plein écran).
 * ==============================================================================================
 */

// Variable globale pour mémoriser l'événement d'installation différé
let deferredPrompt = null;

// Définition de l'objet PWAInstall exposé globalement sur l'objet window
window.PWAInstall = {

  /**
   * Initialise les écouteurs d'événements relatifs à l'installation PWA.
   * Doit être appelée lors du démarrage de l'application (dans js/app.js).
   */
  init() {
    // Vérifie si l'application est déjà exécutée en tant qu'application installée (mode autonome)
    if (this.isStandalone()) {
      // Masque le bouton d'installation s'il existe dans le DOM
      this.hideInstallButton();
      return; // Fin du traitement car l'application est déjà installée
    }

    // Écoute de l'événement 'beforeinstallprompt' envoyé par les navigateurs Chromium (Chrome, Edge, Samsung Internet)
    // Cet événement indique que l'application remplit tous les critères d'éligibilité PWA / WebAPK.
    window.addEventListener('beforeinstallprompt', (event) => {
      // Empêche l'affichage automatique de la mini-bannière par défaut du navigateur
      event.preventDefault();

      // Sauvegarde l'événement pour pouvoir l'invoquer plus tard via un clic utilisateur
      deferredPrompt = event;

      // Rend visible le bouton d'installation dans l'interface utilisateur
      this.showInstallButton();
    });

    // Écoute de l'événement 'appinstalled' déclenché dès que l'utilisateur a confirmé l'installation
    window.addEventListener('appinstalled', () => {
      // Réinitialise la référence d'installation pour libérer les ressources
      deferredPrompt = null;

      // Masque définitivement le bouton d'installation de l'interface
      this.hideInstallButton();

      // Affiche un message de succès Toast pour accueillir chaleureusement l'utilisateur
      if (window.Toast && typeof window.Toast.show === 'function') {
        window.Toast.show('Félicitations ! L\'application Tontine a été installée sur votre appareil.', 'success');
      }
    });

    // Liaison de l'action de clic sur les boutons d'installation marqués par la classe ou l'ID
    const installBtn = document.getElementById('pwa-install-btn');
    // Si l'élément de bouton est présent dans la structure HTML
    if (installBtn) {
      // Attache un gestionnaire d'événement de clic
      installBtn.addEventListener('click', () => {
        // Appelle la méthode d'invitation à l'installation
        this.promptInstall();
      });
    }
  },

  /**
   * Déclenche la boîte de dialogue native du navigateur invitant à installer l'application.
   * Sur Android Chrome, cela déclenche la création d'un vrai package WebAPK natif.
   */
  async promptInstall() {
    // Vérifie si l'événement d'installation a bien été capturé au préalable
    if (!deferredPrompt) {
      // Si l'événement n'est pas disponible, affiche une aide explicative selon le navigateur
      if (this.isIOS()) {
        if (window.Toast) {
          window.Toast.show('Sur iOS (iPhone/iPad) : appuyez sur le bouton Partager puis sur "Sur l\'écran d\'accueil".', 'info');
        }
      } else {
        if (window.Toast) {
          window.Toast.show('L\'application est déjà installée ou votre navigateur ne supporte pas l\'installation directe.', 'info');
        }
      }
      return;
    }

    try {
      // Déclenche l'affichage de l'invite système native d'installation
      deferredPrompt.prompt();

      // Attend le choix final de l'utilisateur (accepté ou refusé)
      const choiceResult = await deferredPrompt.userChoice;

      // Si l'utilisateur a accepté l'installation
      if (choiceResult.outcome === 'accepted') {
        // Masque le bouton d'installation de l'interface
        this.hideInstallButton();
      }

      // Réinitialise la variable de prompt pour éviter de réutiliser un événement consommé
      deferredPrompt = null;
    } catch (error) {
      // Journalise toute erreur éventuelle survenue lors de l'installation
      console.error('[PWAInstall] Erreur lors de l\'invite d\'installation :', error);
    }
  },

  /**
   * Vérifie si l'application s'exécute actuellement en mode PWA autonome (Standalone).
   * @returns {boolean} Vrai si l'app tourne sans barre d'adresse de navigateur.
   */
  isStandalone() {
    // Vérifie le media query standard W3C 'display-mode: standalone'
    const isStandaloneMQ = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;

    // Vérifie la propriété non-standard d'iOS Safari (navigator.standalone)
    const isIOSStandalone = window.navigator.standalone === true;

    // Retourne vrai si l'une des deux conditions est satisfaite
    return isStandaloneMQ || isIOSStandalone;
  },

  /**
   * Vérifie si le système d'exploitation de l'utilisateur est iOS (iPhone / iPad).
   * @returns {boolean} Vrai si l'appareil est sous iOS.
   */
  isIOS() {
    // Analyse la chaîne User Agent du navigateur
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  },

  /**
   * Rend visible le bouton d'installation PWA dans le document.
   */
  showInstallButton() {
    // Récupère l'élément HTML bouton d'installation par son identifiant
    const installBtn = document.getElementById('pwa-install-btn');
    // Si l'élément existe dans la page
    if (installBtn) {
      // Supprime le style de masquage
      installBtn.style.display = 'inline-flex';
      // Supprime la classe d'invisibilité éventuelle
      installBtn.classList.remove('hidden');
    }
  },

  /**
   * Masque le bouton d'installation PWA dans le document.
   */
  hideInstallButton() {
    // Récupère l'élément HTML bouton d'installation
    const installBtn = document.getElementById('pwa-install-btn');
    // Si l'élément existe dans la page
    if (installBtn) {
      // Applique le masquage strict
      installBtn.style.display = 'none';
      // Ajoute la classe de masquage
      installBtn.classList.add('hidden');
    }
  }
};
