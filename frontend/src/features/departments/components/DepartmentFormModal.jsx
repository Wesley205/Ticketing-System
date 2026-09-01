import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';

function buildInitialForm(department) {
  return {
    name: department?.name || '',
    description: department?.description || '',
  };
}

export function DepartmentFormModal({
  open,
  department = null,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [form, setForm] = useState(buildInitialForm(department));
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(department));
      setError('');
    }
  }, [open, department?.department_id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Department name is required.');
      return;
    }

    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save department.');
    }
  }

  return (
    <Modal
      open={open}
      title={department ? `Edit Department - ${department.name}` : 'Add Department'}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => document.getElementById('department-form-submit')?.click()} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Department'}
          </Button>
        </>
      )}
    >
      <form className="ui-stack-md" onSubmit={handleSubmit}>
        <FormField label="Name *" htmlFor="department-name" error={error}>
          <input
            id="department-name"
            className="ui-input"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </FormField>

        <FormField label="Description" htmlFor="department-description">
          <textarea
            id="department-description"
            className="ui-input"
            rows={4}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </FormField>

        <button id="department-form-submit" type="submit" hidden />
      </form>
    </Modal>
  );
}
