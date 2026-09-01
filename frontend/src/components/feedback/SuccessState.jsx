export function SuccessState({ title = 'Completed.', description }) {
  return (
    <section className="ui-feedback ui-feedback-success">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </section>
  );
}
