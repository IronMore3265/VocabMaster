import { supabase } from '../supabase.js';
import { clearRememberedEmail, getRememberedEmail, setRememberedEmail } from '../store.js';
import { logoTile } from '../brand.js';
import { bindPasswordPeek, esc, inputCls, passwordField, primaryBtn } from '../ui.js';

export function render() {
  const savedEmail = getRememberedEmail();
  return `
  <div class="min-h-dvh bg-background px-5 pt-safe">
    <div class="max-w-md mx-auto flex flex-col gap-4" style="padding-top:72px">
      <div class="flex flex-col items-center gap-2.5 mb-6">
        ${logoTile()}
        <h1 class="text-headline-lg font-headline text-on-surface">VocabMaster</h1>
        <p class="text-body-md text-on-surface-variant text-center">Sign in to continue your vocabulary journey.</p>
      </div>

      <input data-email type="email" autocomplete="email" placeholder="Email" value="${esc(savedEmail)}" class="${inputCls}" />
      ${passwordField('data-password', { autocomplete: 'current-password' })}

      <label class="flex items-center gap-2.5 px-1 select-none">
        <input data-remember type="checkbox" ${savedEmail ? 'checked' : ''}
          class="w-4 h-4 rounded border-outline-variant accent-primary" />
        <span class="text-body-sm text-on-surface-variant">Remember me</span>
      </label>

      <p data-error class="text-body-sm text-error hidden"></p>

      ${primaryBtn('Sign In', 'data-submit disabled', '')}

      <div class="flex justify-center gap-1.5">
        <span class="text-body-sm text-on-surface-variant">New here?</span>
        <button data-nav="#/sign-up" class="text-body-sm text-primary font-medium">Create an account</button>
      </div>
    </div>
  </div>`;
}

export function mount(root) {
  const email = root.querySelector('[data-email]');
  const password = root.querySelector('[data-password]');
  const remember = root.querySelector('[data-remember]');
  const submit = root.querySelector('[data-submit]');
  const errorEl = root.querySelector('[data-error]');
  bindPasswordPeek(root);
  let loading = false;

  // Email pre-filled from "Remember me" — jump straight to the password field.
  if (email.value) password.focus();

  const refresh = () => {
    submit.disabled = loading || !email.value || !password.value;
    submit.textContent = loading ? 'Signing in…' : 'Sign In';
  };
  email.addEventListener('input', refresh);
  password.addEventListener('input', refresh);

  const doSignIn = async () => {
    if (submit.disabled) return;
    loading = true; refresh();
    errorEl.classList.add('hidden');
    const trimmedEmail = email.value.trim();
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: password.value,
    });
    loading = false; refresh();
    if (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
      return;
    }
    // Success: persist (or forget) the email per the checkbox.
    if (remember.checked) setRememberedEmail(trimmedEmail);
    else clearRememberedEmail();
    // On success the auth listener re-renders the app into the tabs.
  };
  submit.addEventListener('click', doSignIn);
  password.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSignIn(); });
  refresh();
}
