import { supabase } from '../supabase.js';
import { bindPasswordPeek, icon, inputCls, passwordField, primaryBtn } from '../ui.js';

export function render() {
  return `
  <div class="min-h-dvh bg-background px-5 pt-safe">
    <div class="max-w-md mx-auto flex flex-col gap-4" style="padding-top:72px">
      <div class="flex flex-col items-center gap-2.5 mb-6">
        <div class="w-[72px] h-[72px] rounded-3xl bg-primary-fixed flex items-center justify-center">
          ${icon('menu_book', 'text-primary text-[36px]')}
        </div>
        <h1 class="text-headline-lg font-headline text-on-surface">VocabMaster</h1>
        <p class="text-body-md text-on-surface-variant text-center">Sign in to continue your vocabulary journey.</p>
      </div>

      <input data-email type="email" autocomplete="email" placeholder="Email" class="${inputCls}" />
      ${passwordField('data-password', { autocomplete: 'current-password' })}

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
  const submit = root.querySelector('[data-submit]');
  const errorEl = root.querySelector('[data-error]');
  bindPasswordPeek(root);
  let loading = false;

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
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    });
    loading = false; refresh();
    if (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
    // On success the auth listener re-renders the app into the tabs.
  };
  submit.addEventListener('click', doSignIn);
  password.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSignIn(); });
  refresh();
}
