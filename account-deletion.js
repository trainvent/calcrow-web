import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
  deleteUser, getAuth, getAdditionalUserInfo, GoogleAuthProvider, OAuthProvider,
  inMemoryPersistence, setPersistence, signInWithEmailAndPassword,
  signInWithPopup, signOut, revokeAccessToken,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {doc, getFirestore, writeBatch} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const german = document.documentElement.lang.startsWith('de');
const copy = german ? {
  deleted: 'Dein Calcrow-Konto wurde dauerhaft gelöscht.',
  appleNotice: ' Entferne Calcrow zusätzlich unter „Mit Apple anmelden“ in deinen Apple-Account-Einstellungen, falls die Verbindung dort noch angezeigt wird.',
  invalid: 'Die Anmeldedaten wurden nicht akzeptiert.',
  failed: 'Die Kontolöschung konnte nicht abgeschlossen werden. Bitte melde dich erneut an und versuche es noch einmal.',
  unavailable: 'Die Anmeldung ist auf dieser Website derzeit nicht verfügbar. Bitte nutze die App oder kontaktiere den Support.',
  conflict: 'Nutze die bisherige Anmeldemethode für dieses Calcrow-Konto.',
  blocked: 'Bitte erlaube das Anmeldefenster für diese Website und versuche es erneut.',
  appleSetup: 'Nutze für dieses Apple-Konto bitte in der iPhone-App Einstellungen → Konto löschen. Die Apple-Anmeldung ist auf dieser Website derzeit nicht verfügbar.',
  network: 'Netzwerkfehler. Bitte überprüfe deine Verbindung und versuche es erneut.',
  changed: 'Das angemeldete Konto hat sich geändert. Bitte beginne erneut.',
  expired: 'Bitte melde dich erneut an, um die Löschung zu bestätigen.',
  missing: 'Mit dieser Anmeldung wurde kein bestehendes Calcrow-Konto gefunden. Es wurde kein bestehendes Konto gelöscht.',
  account: 'Das soeben angemeldete Konto',
} : {
  deleted: 'Your Calcrow account has been permanently deleted.',
  appleNotice: ' Also remove Calcrow from Sign in with Apple in your Apple Account settings if the connection is still listed there.',
  invalid: 'The sign-in details were not accepted.',
  failed: 'Account deletion could not be completed. Please sign in again and retry.',
  unavailable: 'Sign-in is currently unavailable on this website. Please use the app or contact support.',
  conflict: 'Use the existing sign-in method for this Calcrow account.',
  blocked: 'Please allow the sign-in popup for this website and try again.',
  appleSetup: 'For this Apple account, use Settings → Delete account in the iPhone app. Apple sign-in is currently unavailable on this website.',
  network: 'Network error. Please check your connection and try again.',
  changed: 'The signed-in account changed. Please start again.',
  expired: 'Please sign in again to confirm deletion.',
  missing: 'No existing Calcrow account was found for this sign-in. No existing account was deleted.',
  account: 'The account you just signed in with',
};

// A separate, memory-only auth session avoids switching the web app's account.
const app = initializeApp({
  apiKey: 'AIzaSyBgEt95MLLxnL1lE18gfc9k8Y9MLxm2Ouw',
  appId: '1:743453990456:web:aff40891efc181165f90cd',
  messagingSenderId: '743453990456',
  projectId: 'calcrow-prod',
  authDomain: 'calcrow-prod.firebaseapp.com',
  storageBucket: 'calcrow-prod.firebasestorage.app',
}, 'calcrow-account-deletion');
const auth = getAuth(app);
const db = getFirestore(app);
const byId = id => document.getElementById(id);
const form = byId('delete-form');
const login = byId('deletion-login');
const confirmation = byId('deletion-confirmation');
const status = byId('status');
const notice = byId('deletion-notice');
notice.addEventListener('cancel', event => event.preventDefault());
byId('deletion-notice-close').addEventListener('click', () => notice.close());
const buttons = ['delete-button', 'google-delete-signin', 'apple-delete-signin', 'confirm-delete-button', 'change-delete-account'].map(byId);
let candidate = null;
let busy = false;
let completed = false;

function setBusy(value) {
  busy = value;
  buttons.forEach(button => { button.disabled = value || completed; });
}
function message(text, tone = 'error') {
  status.textContent = text;
  status.dataset.tone = tone;
}
function clearMessage() { status.textContent = ''; delete status.dataset.tone; }
function errorMessage(error, provider) {
  if (provider === 'apple.com' && ['auth/operation-not-allowed', 'auth/invalid-oauth-client-id', 'auth/invalid-oauth-response'].includes(error?.code)) return copy.appleSetup;
  if (['auth/unauthorized-domain', 'auth/operation-not-allowed', 'auth/operation-not-supported-in-this-environment'].includes(error?.code)) return copy.unavailable;
  if (error?.code === 'auth/account-exists-with-different-credential') return copy.conflict;
  if (error?.code === 'auth/popup-blocked') return copy.blocked;
  if (error?.code === 'auth/network-request-failed') return copy.network;
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/invalid-email', 'auth/user-not-found'].includes(error?.code)) return copy.invalid;
  return copy.failed;
}
async function resetAccount() {
  candidate = null;
  form.reset();
  confirmation.hidden = true;
  login.hidden = completed;
  try { await signOut(auth); } catch (_) { /* The isolated session can expire. */ }
}
async function authenticate(provider) {
  if (busy || completed) return;
  setBusy(true);
  clearMessage();
  try {
    let result;
    if (provider === 'password') {
      result = await signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
    } else {
      const method = provider === 'google.com' ? new GoogleAuthProvider() : new OAuthProvider('apple.com');
      if (provider === 'google.com') method.setCustomParameters({prompt: 'select_account'});
      else { method.addScope('email'); method.addScope('name'); }
      result = await signInWithPopup(auth, method);
    }
    // Firebase popup sign-in can create a new auth record. Do not leave an
    // accidental registration when the visitor is trying to delete an account.
    if (getAdditionalUserInfo(result)?.isNewUser) {
      await deleteUser(result.user);
      await resetAccount();
      message(copy.missing);
      return;
    }
    candidate = {
      user: result.user,
      signedInAt: Date.now(),
      appleToken: provider === 'apple.com' ? OAuthProvider.credentialFromResult(result)?.accessToken : null,
    };
    form.reset();
    byId('deletion-account-email').textContent = result.user.email || result.user.displayName || copy.account;
    login.hidden = true;
    confirmation.hidden = false;
    byId('confirm-delete-button').focus();
  } catch (error) {
    await resetAccount();
    if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error?.code)) message(errorMessage(error, provider));
  } finally { setBusy(false); }
}

form.addEventListener('submit', event => { event.preventDefault(); return authenticate('password'); });
byId('google-delete-signin').addEventListener('click', () => authenticate('google.com'));
byId('apple-delete-signin').addEventListener('click', () => authenticate('apple.com'));
byId('change-delete-account').addEventListener('click', async () => {
  if (busy) return;
  setBusy(true); await resetAccount(); clearMessage(); setBusy(false);
});
byId('confirm-delete-button').addEventListener('click', async () => {
  if (busy || !candidate || completed) return;
  setBusy(true);
  clearMessage();
  try {
    const {user, signedInAt, appleToken} = candidate;
    if (auth.currentUser?.uid !== user.uid) { await resetAccount(); message(copy.changed); return; }
    if (Date.now() - signedInAt > 4 * 60 * 1000) { await resetAccount(); message(copy.expired); return; }
    await user.getIdToken(true);
    let appleRevocationPending = user.providerData.some(p => p.providerId === 'apple.com');
    if (appleToken) {
      try { await revokeAccessToken(auth, appleToken); appleRevocationPending = false; }
      catch (_) { /* Fulfill account deletion even if Apple revocation fails. */ }
    }
    if (auth.currentUser?.uid !== user.uid) { await resetAccount(); message(copy.changed); return; }
    const batch = writeBatch(db);
    for (const path of ['users', 'email_verification_codes', 'verificationCodes']) batch.delete(doc(db, path, user.uid));
    await batch.commit();
    if (auth.currentUser?.uid !== user.uid) { await resetAccount(); message(copy.changed); return; }
    await deleteUser(user);
    completed = true;
    await resetAccount();
    message(copy.deleted + (appleRevocationPending ? copy.appleNotice : ''), 'success');
    if (appleRevocationPending && typeof notice.showModal === 'function') {
      byId('deletion-notice-message').textContent = copy.deleted + copy.appleNotice;
      notice.showModal();
      byId('deletion-notice-close').focus();
    }
  } catch (error) {
    await resetAccount();
    message(errorMessage(error));
  } finally { setBusy(false); }
});

try { await setPersistence(auth, inMemoryPersistence); setBusy(false); }
catch (_) { setBusy(true); message(copy.failed); }
