import { supabase } from '../supabase.js';
import { inputCls, primaryBtn } from '../ui.js';

export function render() {
  return `
  <div class="min-h-dvh bg-background px-5 pt-safe">
    <div class="max-w-md mx-auto flex flex-col gap-4" style="padding-top:72px">
      <div class="flex flex-col gap-1.5 mb-4">
        <h1 class="text-headline-lg font-headline text-on-surface">Create your account</h1>
        <p class="text-body-md text-on-surface-variant">Your progress syncs across devices.</p>
      </div>

      <input data-name type="text" placeholder="Display name" class="${inputCls}" />
      <input data-email type="email" autocomplete="email" placeholder="Email" class="${inputCls}" />
      <input data-password type="password" autocomplete="new-password" placeholder="Password (min 6 characters)" class="${inputCls}" />

      <p data-error class="text-body-sm text-error hidden"></p>
      <p data-notice class="text-body-sm text-secondary hidden"></p>

      ${primaryBtn('Create Account', 'data-submit disabled', '')}

      <div class="flex justify-center gap-1.5">
        <span class="text-body-sm text-on-surface-variant">Already have an account?</span>
        <button data-nav="#/sign-in" class="text-body-sm text-primary font-medium">Sign in</button>
      </div>
    </div>
  </div>`;
}

export function mount(root) {
  const name = root.querySelector('[data-name]');
  const email = root.querySelector('[data-email]');
  const password = root.querySelector('[data-password]');
  const submit = root.querySelector('[data-submit]');
  const errorEl = root.querySelector('[data-error]');
  const noticeEl = root.querySelector('[data-notice]');
  let loading = false;

  const refresh = () => {
    submit.disabled = loading || !email.value || password.value.length < 6;
    submit.textContent = loading ? 'Creating…' : 'Create Account';
  };
  [email, password].forEach((el) => el.addEventListener('input', refresh));

  const doSignUp = async () => {
    if (submit.disabled) return;
    loading = true; refresh();
    errorEl.classList.add('hidden');
    noticeEl.classList.add('hidden');
    const { data, error } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: password.value,
      options: { data: { display_name: name.value.trim() || undefined } },
    });
    loading = false; refresh();
    if (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    } else if (!data.session) {
      // Email confirmation is enabled in Supabase Auth settings.
      noticeEl.textContent = 'Check your inbox to confirm your email, then sign in.';
      noticeEl.classList.remove('hidden');
    }
  };
  submit.addEventListener('click', doSignUp);
  password.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSignUp(); });
  refresh();
}
