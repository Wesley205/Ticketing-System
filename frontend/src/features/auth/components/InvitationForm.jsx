import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { AppIcon } from '../../../components/icons/AppIcon.jsx';

export function InvitationForm({ onSubmit, errorMessage, isSubmitting = false, initialToken = '' }) {
  const [token, setToken] = useState(initialToken);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const hasError = Boolean(errorMessage);

  async function handleSubmit(event) {
    event.preventDefault();
    if (confirmPassword && password !== confirmPassword) {
      return;
    }
    await onSubmit({
      token: token.trim(),
      username: username.trim(),
      phone: phone.trim(),
      password,
    });
  }

  return (
    <form className="ui-stack-md auth-form" onSubmit={handleSubmit}>
      {hasError ? (
        <div className="auth-inline-error" role="alert">
          <span aria-hidden="true">!</span>
          <strong>{errorMessage}</strong>
        </div>
      ) : null}

      <FormField label="Token / Invitation Code" htmlFor="activation-token">
        <input
          id="activation-token"
          className={`ui-input auth-input ${hasError ? 'auth-input-error' : ''}`}
          type="text"
          required
          placeholder="NSC-8821-XP92-ICT"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
      </FormField>

      <FormField label="Preferred Username" htmlFor="activation-username">
        <input
          id="activation-username"
          className="ui-input auth-input"
          type="text"
          autoComplete="username"
          minLength={3}
          required
          placeholder="e.g. j.dane"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </FormField>

      <FormField label="Phone Number (Optional)" htmlFor="activation-phone">
        <input
          id="activation-phone"
          className="ui-input auth-input"
          type="text"
          autoComplete="tel"
          placeholder="e.g. +234 800 000 0000"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </FormField>

      <FormField
        label="Choose Password"
        htmlFor="activation-password"
        hint="Password requirements are set by your administrator. Use at least 12 characters when possible."
      >
        <div className="auth-password-wrap">
          <input
            id="activation-password"
            className={`ui-input auth-input ${hasError ? 'auth-input-error' : ''}`}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={6}
            required
            placeholder="************"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <AppIcon name={showPassword ? 'view-off' : 'view'} size={18} />
          </button>
        </div>
      </FormField>

      <FormField
        label="Confirm Password"
        htmlFor="activation-confirm-password"
        error={confirmPassword && password !== confirmPassword ? 'Passwords do not match.' : ''}
      >
        <div className="auth-password-wrap">
          <input
            id="activation-confirm-password"
            className={`ui-input auth-input ${confirmPassword && password !== confirmPassword ? 'auth-input-error' : ''}`}
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={6}
            required
            placeholder="************"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowConfirmPassword((current) => !current)}
            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
          >
            <AppIcon name={showConfirmPassword ? 'view-off' : 'view'} size={18} />
          </button>
        </div>
      </FormField>

      <Button type="submit" className="auth-submit" disabled={isSubmitting}>
        {isSubmitting ? 'Activating...' : 'Activate Account'}
      </Button>
    </form>
  );
}
