import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { AppIcon } from '../../../components/icons/AppIcon.jsx';

export function LoginForm({ onSubmit, errorMessage, isSubmitting = false, defaultValues = {} }) {
  const [identifier, setIdentifier] = useState(defaultValues.identifier || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const hasError = Boolean(errorMessage);

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({
      identifier: identifier.trim(),
      password,
    });
  }

  return (
    <form className="ui-stack-md auth-form" onSubmit={handleSubmit}>
      {hasError ? (
        <div className="auth-inline-error" role="alert">
          <span aria-hidden="true">!</span>
          <strong>Invalid credentials. Please verify your email and password.</strong>
        </div>
      ) : null}

      <FormField label="Email or Username" htmlFor="login-identifier">
        <input
          id="login-identifier"
          className={`ui-input auth-input ${hasError ? 'auth-input-error' : ''}`}
          type="text"
          autoComplete="username"
          placeholder="e.g. m.andrew@nsc.gov"
          aria-invalid={hasError ? 'true' : undefined}
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
      </FormField>

      <FormField label="Password" htmlFor="login-password">
        <div className="auth-password-wrap">
          <input
            id="login-password"
            className={`ui-input auth-input ${hasError ? 'auth-input-error' : ''}`}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter password"
            aria-invalid={hasError ? 'true' : undefined}
            required
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

      <Button type="submit" className="auth-submit" loading={isSubmitting} loadingLabel="Signing in...">
        Sign In
      </Button>
    </form>
  );
}
