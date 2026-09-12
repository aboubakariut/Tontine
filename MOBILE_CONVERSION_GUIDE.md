# Guide de Conversion en Application Mobile Native (Android & iOS)

Ce projet a été restructuré avec une architecture modulaire standardisée (`js/core/`, `js/pages/`, `js/pwa/`), totalement compatible avec **Capacitor** (l'outil moderne recommandé par Google et Ionic pour convertir des applications Web en applications natives Android et iOS).

---

## 1. Prérequis

- **Node.js** (v18 ou supérieur) : [nodejs.org](https://nodejs.org/)
- **Android Studio** (pour compiler le fichier APK / Android App Bundle AAB) : [developer.android.com/studio](https://developer.android.com/studio)
- **Java JDK** (version 17 ou 21 recommandée)

---

## 2. Étapes de génération de l'application Android native (APK)

Dans le dossier du projet (`Tontine/`), ouvrez votre terminal (PowerShell ou Bash) et suivez les 4 étapes suivantes :

### Étape 1 : Initialiser les dépendances Capacitor
```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### Étape 2 : Ajouter la plateforme Android
```bash
npx cap add android
```
> Cette commande crée un dossier natif `android/` avec un projet complet Android Studio (Gradle, Manifest Android, MainActivity Java/Kotlin).

### Étape 3 : Synchroniser les fichiers web
```bash
npx cap sync
```
> Cette commande copie vos fichiers HTML, CSS, JavaScript modulaires (`js/`), icônes et manifestes directement dans les assets Android natifs.

### Étape 4 : Ouvrir et compiler dans Android Studio
```bash
npx cap open android
```
Dans Android Studio :
1. Laissez Gradle terminer la synchronisation initiale.
2. Pour tester immédiatement : branchez votre téléphone Android en USB (mode Débogage USB activé) ou lancez un émulateur, puis cliquez sur **Run (Bouton ▶ vert)**.
3. Pour générer un fichier APK installable sur n'importe quel smartphone :
   - Rendez-vous dans le menu supérieur : **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
   - Dès la compilation terminée, cliquez sur le lien `locate` dans la notification en bas à droite pour récupérer votre fichier `app-debug.apk`.

---

## 3. Configuration des autorisations Android (`AndroidManifest.xml`)

Capacitor configure automatiquement la plupart des paramètres. Pour activer les notifications Push, l'accès au réseau et le vibreur, vérifiez dans `android/app/src/main/AndroidManifest.xml` que ces permissions sont présentes :

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## 4. Raccourcis de mise à jour future

Chaque fois que vous modifiez un fichier JavaScript dans `js/` ou le code HTML :
```bash
npx cap copy android
```
Puis relancez l'application dans Android Studio.
