import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';

export function InvitationForm({ onSubmit, errorMessage, isSubmitting = false, initialToken = '' }) {
  const [token, setToken] = useState(initialToken);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({
      token: token.trim(),
      username: username.trim(),
      phone: phone.trim(),
      password,
    });
  }

  return (
    <form className="ui-stack-md" onSubmit={handleSubmit}>
      <FormField label="Invitation Token" htmlFor="activation-token">
        <input
          id="activation-token"
          className="ui-input"
          type="text"
          required
          placeholder="Paste the invitation token or open your invitation link"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
      </FormField>

      <FormField label="Username" htmlFor="activation-username">
        <input
          id="activation-username"
          className="ui-input"
          type="text"
          autoComplete="username"
          minLength={3}
          required
          placeholder="e.g. jane.doe"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </FormField>

      <FormField label="Phone" htmlFor="activation-phone" hint="Optional">
        <input
          id="activation-phone"
          className="ui-input"
          type="text"
          autoComplete="tel"
          placeholder="Optional"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </FormField>

      <FormField label="Password" htmlFor="activation-password" error={errorMessage}>
        <input
          id="activation-password"
          className="ui-input"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          placeholder="At least 6 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </FormField>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Activating...' : 'Activate Account'}
      </Button>
    </form>
  );
}
