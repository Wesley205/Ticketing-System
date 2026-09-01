export function EmptyState({ title = 'Nothing to show yet.', description = 'Try again after more records are available.' }) {
  return (
    <section className="ui-feedback ui-feedback-empty">
      <h3>{title}</h3>
      <p>{description}</p>
    </section>
  );
}
