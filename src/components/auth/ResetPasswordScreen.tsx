'use client';

import { FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';

export function ResetPasswordScreen({ token, invalid }: { token?: string; invalid?: boolean }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(invalid || !token ? 'This reset link is invalid or has expired.' : '');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true); setError('');
    const result = await authClient.resetPassword({ token, newPassword: password });
    setBusy(false);
    if (result.error) { setError('This reset link is invalid or has expired.'); return; }
    location.assign('/auth?reset=done');
  }

  return <main className="auth-ambient"><div className="auth-orb auth-orb--violet" /><section className="reset-card glass-panel"><div className="brand-mark">W</div><span className="eyebrow">ACCOUNT RECOVERY</span><h1>Choose a new password.</h1><p>Make it memorable and unique. We will revoke the other active sessions.</p><form className="auth-form" onSubmit={(event) => void submit(event)}><label><span>New password</span><input className="input" type="password" minLength={15} maxLength={128} autoComplete="new-password" required disabled={!token || invalid} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="15+ characters" /><small>Spaces are welcome. No arbitrary symbol requirements.</small></label>{error && <div className="auth-error" role="alert">{error}</div>}<button className="btn btn-primary auth-submit" disabled={busy || !token || Boolean(invalid)}>{busy ? 'Updating…' : 'Set new password'}</button></form><a href="/auth">Back to sign in</a></section></main>;
}

