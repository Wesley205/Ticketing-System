export function LoadingState({ title = 'Loading...', description = 'Content is being prepared.' }) {
  return (
    <section className="ui-feedback ui-feedback-loading" aria-live="polite">
      <div className="ui-feedback-pulse" />
      <h3>{title}</h3>
      <p>{description}</p>
    </section>
  );
}
