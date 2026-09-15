import { formatSla } from './service-request-formatters.js';

export function SlaIndicator({ ticket }) {
  const sla = formatSla(ticket);

  return (
    <div className={`service-request-sla service-request-sla-${sla.tone}`}>
      <span>SLA</span>
      <strong>{sla.label}</strong>
      <small>
        {sla.deadline ? `${sla.detail} - ${sla.deadline}` : sla.detail}
      </small>
    </div>
  );
}
