export function PageHero({ eyebrow, title, description, meta = [] }) {
  return (
    <section className="ui-page-hero">
      <div>
        {eyebrow ? <p className="react-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {meta.length ? (
        <div className="ui-page-hero-meta">
          {meta.map((item, index) => (
            <span key={`${item}-${index}`} className="ui-chip">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
