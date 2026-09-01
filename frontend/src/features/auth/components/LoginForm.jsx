import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';

export function LoginForm({ onSubmit, errorMessage, isSubmitting = false, defaultValues = {} }) {
  const [identifier, setIdentifier] = useState(defaultValues.identifier || '');
  const [password, setPassword] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({
      identifier: identifier.trim(),
      password,
    });
  }

  return (
    <form className="ui-stack-md" onSubmit={handleSubmit}>
      <FormField label="Email or Username" htmlFor="login-identifier">
        <input
          id="login-identifier"
          className="ui-input"
          type="text"
          autoComplete="username"
          placeholder="e.g. admin or admin@nscict.local"
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
      </FormField>

      <FormField label="Password" htmlFor="login-password" error={errorMessage}>
        <input
          id="login-password"
          className="ui-input"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </FormField>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Log In'}
      </Button>
    </form>
  );
}
