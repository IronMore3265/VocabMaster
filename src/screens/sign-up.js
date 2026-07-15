import { supabase } from '../supabase.js';
import { icon, inputCls, primaryBtn } from '../ui.js';
import { PASSWORD_RULES, checkPassword, passwordValid } from '../lib/password.js';

function reqList() {
  return `
  <ul data-reqs class="flex flex-col gap-1.5 -mt-1 mb-1">
    ${PASSWORD_RULES.map((r, i) => `
    <li data-req="${i}" class="flex items-center gap-2 text-body-sm text-on-surface-variant transition-colors">
      <span data-mark class="grid place-items-center w-4 h-4 rounded-full border border-outline-variant shrink-0">
        ${icon('check', 'text-[11px] opacity-0 transition-opacity')}
      </span>
      <span>${r.label}</span>
    </li>`).join('')}
  </ul>`;
}

export function render() {
  return `
  <div class="min-h-dvh bg-background px-5 pt-safe">
    <div class="max-w-md mx-auto flex flex-col gap-4" style="padding-top:16px">
      <div class="h-12 flex items-center -ml-3">
        <button data-nav="#/sign-in" class="p-3 rounded-full text-on-surface active:opacity-70 transition-opacity">
          ${icon('arrow_back')}
        </button>
      </div>

      <div class="flex flex-col gap-1.5 mb-2">
        <h1 class="text-headline-lg font-headline text-on-surface">Create your account</h1>
        <p class="text-body-md text-on-surface-variant">Your progress syncs across devices.</p>
      </div>

      <input data-name type="text" placeholder="Display name" class="${inputCls}" />
      <input data-email type="email" autocomplete="email" placeholder="Email" class="${inputCls}" />
      <input data-password type="password" autocomplete="new-password" placeholder="Password" class="${inputCls}" />

      ${reqList()}

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
  const reqItems = [...root.querySelectorAll('[data-req]')];
  let loading = false;

  const refreshReqs = () => {
    checkPassword(password.value).forEach(({ ok }, i) => {
      const li = reqItems[i];
      const mark = li.querySelector('[data-mark]');
      const tick = mark.querySelector('svg');
      li.classList.toggle('text-secondary', ok);
      li.classList.toggle('text-on-surface-variant', !ok);
      mark.classList.toggle('bg-secondary', ok);
      mark.classList.toggle('border-secondary', ok);
      mark.classList.toggle('border-outline-variant', !ok);
      tick.classList.toggle('opacity-0', !ok);
      tick.classList.toggle('text-on-primary', ok);
    });
  };

  const refresh = () => {
    submit.disabled = loading || !email.value || !passwordValid(password.value);
    submit.textContent = loading ? 'Creating…' : 'Create Account';
  };
  email.addEventListener('input', refresh);
  password.addEventListener('input', () => { refreshReqs(); refresh(); });

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
  refreshReqs();
  refresh();
}
