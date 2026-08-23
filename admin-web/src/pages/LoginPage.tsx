import { FormEvent, useState } from 'react';
import { apiLogin } from '../api';

type Props = {
  onAuthed: () => void;
};

export function LoginPage({ onAuthed }: Props) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await apiLogin(userId, password);
      if (res.user.role !== 'admin') {
        throw new Error('This account cannot access admin.');
      }
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="card login-card" onSubmit={(e) => void submit(e)}>
        <div className="brand">BuildMart</div>
        <p className="brand-sub" style={{ color: 'var(--muted)' }}>
          Admin sign in
        </p>
        <label>
          User ID
          <input value={userId} onChange={(e) => setUserId(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
