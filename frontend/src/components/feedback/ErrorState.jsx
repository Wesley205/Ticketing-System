import { Button } from '../forms/Button.jsx';

export function ErrorState({ title = 'Something went wrong.', description, onRetry }) {
  return (
    <section className="ui-feedback ui-feedback-error" role="alert">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {onRetry ? (
        <div className="ui-feedback-actions">
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </section>
  );
}
