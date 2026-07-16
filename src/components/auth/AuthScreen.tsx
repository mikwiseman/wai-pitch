'use client';

import { FormEvent, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Icon } from '@/components/icons';

type Method = 'magic' | 'password';
type Intent = 'signin' | 'signup' | 'forgot';
type Capabilities = { magicLink: boolean; passwordReset: boolean; password: boolean; passwordMinLength: number };

export function AuthScreen() {
  const [method, setMethod] = useState<Method>('magic');
  const [intent, setIntent] = useState<Intent>('signin');
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch('/api/auth-capabilities', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load authentication settings');
        return response.json() as Promise<Capabilities>;
      })
      .then((next) => {
        setCapabilities(next);
        if (!next.magicLink) setMethod('password');
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load authentication settings'));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (intent === 'forgot') {
        if (!capabilities?.passwordReset) throw new Error('Password recovery email is not configured yet.');
        const result = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: `${location.origin}/auth/reset` });
        if (result.error) throw new Error('Could not send the recovery email. Try again in a moment.');
        setSent(true);
        return;
      }
      if (method === 'magic') {
        if (!capabilities?.magicLink) throw new Error('Magic link email is not configured yet.');
        const result = await authClient.signIn.magicLink({
          email: email.trim(),
          name: intent === 'signup' ? name.trim() : undefined,
          callbackURL: '/',
          newUserCallbackURL: '/',
          errorCallbackURL: '/auth',
        });
        if (result.error) throw new Error('Could not send the sign-in link. Try again in a moment.');
        setSent(true);
        return;
      }
      if (intent === 'signup') {
        const result = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: '/' });
        if (result.error) throw new Error('Could not create this account. Try signing in, or use another email.');
      } else {
        const result = await authClient.signIn.email({ email: email.trim(), password, rememberMe: true, callbackURL: '/' });
        if (result.error) throw new Error('Email or password is incorrect.');
      }
      location.assign('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  function switchIntent(next: Intent) {
    setIntent(next);
    setError('');
    setSent(false);
  }

  const title = intent === 'signup' ? 'Create your studio.' : intent === 'forgot' ? 'Find your way back.' : 'Welcome back.';
  const subtitle = intent === 'signup'
    ? 'A private workspace for presentations, interfaces, and prototypes.'
    : intent === 'forgot'
      ? 'We will send a private reset link if this email has an account.'
      : 'Continue to the calm canvas where your ideas live.';

  return (
    <main className="auth-ambient">
      <div className="auth-orb auth-orb--violet" /><div className="auth-orb auth-orb--mint" />
      <section className="auth-shell glass-panel">
        <div className="auth-story" aria-hidden>
          <div className="auth-brand"><span>W</span><strong>WAI Design</strong><small>Visual studio</small></div>
          <div className="auth-statement">
            <span className="eyebrow">FROM THOUGHT TO FORM</span>
            <h1>Make space<br />for the <em>idea.</em></h1>
            <p>Compose stories, interfaces, and prototypes in one airy, editable canvas.</p>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-mobile-brand"><span>W</span><strong>WAI Design</strong></div>
          <div className="auth-form-heading">
            <span className="eyebrow">PRIVATE WORKSPACE</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          {sent ? (
            <div className="auth-sent" role="status">
              <div><Icon.Share width={22} /></div>
              <h3>Check your inbox.</h3>
              <p>We sent a private link to <strong>{email}</strong>. It may take a minute to arrive.</p>
              <button className="btn" onClick={() => setSent(false)}>Use another email</button>
            </div>
          ) : (
            <>
              {intent !== 'forgot' && (
                <div className="auth-methods" aria-label="Sign-in method">
                  <button className={method === 'magic' ? 'is-active' : ''} disabled={capabilities ? !capabilities.magicLink : true} onClick={() => setMethod('magic')}><Icon.Sparkle width={15} /> Magic link</button>
                  <button className={method === 'password' ? 'is-active' : ''} onClick={() => setMethod('password')}><Icon.Lock width={15} /> Password</button>
                </div>
              )}

              <form className="auth-form" onSubmit={(event) => void submit(event)}>
                {intent === 'signup' && (
                  <label><span>Name</span><input className="input" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we call you?" /></label>
                )}
                <label><span>Email</span><input className="input" type="email" inputMode="email" autoComplete="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
                {method === 'password' && intent !== 'forgot' && (
                  <label>
                    <span>Password</span>
                    <div className="password-field"><input className="input" type={showPassword ? 'text' : 'password'} autoComplete={intent === 'signup' ? 'new-password' : 'current-password'} minLength={intent === 'signup' ? 15 : undefined} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={intent === 'signup' ? '15+ characters' : 'Your password'} /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button></div>
                    {intent === 'signup' && <small>Use at least 15 characters. Spaces are welcome; arbitrary symbol rules are not.</small>}
                  </label>
                )}
                {error && <div className="auth-error" role="alert">{error}</div>}
                <button className="btn btn-primary auth-submit" disabled={busy || !capabilities}>
                  {busy ? <><span className="busy-spinner" /> Working…</> : intent === 'forgot' ? 'Send recovery link' : method === 'magic' ? 'Email me a magic link' : intent === 'signup' ? 'Create account' : 'Sign in'}
                  {!busy && <span>↗</span>}
                </button>
              </form>

              <div className="auth-alternatives">
                {intent === 'signin' ? <><button onClick={() => switchIntent('signup')}>New here? Create an account</button>{method === 'password' && <button disabled={!capabilities?.passwordReset} onClick={() => switchIntent('forgot')}>Forgot password?</button>}</> : <button onClick={() => switchIntent('signin')}>Already have an account? Sign in</button>}
              </div>
              {capabilities && !capabilities.magicLink && <p className="auth-availability">Magic link and recovery email need a verified sender. Password sign-in is ready.</p>}
            </>
          )}
          <p className="auth-legal">By continuing, you agree to keep shared links private when a project contains confidential work.</p>
        </div>
      </section>
    </main>
  );
}
