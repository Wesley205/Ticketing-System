import { Link } from 'react-router-dom';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/formatting.js';

export function SecureRequestTable({ rows = [], title = 'Recent requests', detailBasePath = '/service-requests', mode = 'staff' }) {
  if (!rows.length) {
    return (
      <section className="secure-dashboard-panel">
        <div className="secure-dashboard-panel-head"><h3>{title}</h3></div>
        <EmptyState variant="search" title="No requests found." description="Requests matching this dashboard scope will appear here." />
      </section>
    );
  }

  return (
    <section className="secure-dashboard-panel">
      <div className="secure-dashboard-panel-head">
        <h3>{title}</h3>
        {mode === 'staff' ? <Link to="/service-requests?mine=1">Secure logs</Link> : <span>Sorted by urgency</span>}
      </div>
      <div className="secure-dashboard-table-wrap">
        <table className="secure-dashboard-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Priority</th>
              {mode !== 'staff' ? <th>Requester</th> : null}
              <th>{mode === 'staff' ? 'Last Updated' : 'SLA Target'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 6).map((ticket) => (
              <tr key={ticket.request_id || ticket.ticket_number}>
                <td>
                  <Link to={`${detailBasePath}/${ticket.request_id}`}>
                    {ticket.ticket_number || `#${ticket.request_id}`}
                  </Link>
                </td>
                <td>{ticket.subject || 'Service request'}</td>
                <td><StatusBadge value={ticket.status} /></td>
                <td><PriorityBadge value={ticket.priority} /></td>
                {mode !== 'staff' ? <td>{ticket.requester_name || '-'}</td> : null}
                <td>{mode === 'staff' ? formatDateTime(ticket.updated_at || ticket.date_submitted) : (ticket.sla?.resolutionOverdue ? 'Warning' : 'On track')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function KnowledgeArticleCards({ articles = [] }) {
  const rows = articles.length ? articles : [
    { article_id: 'fallback-1', title: 'Level 4 Security Credentials & MFA Token Reset Protocols', category: 'Security policy', summary: '4 min read' },
    { article_id: 'fallback-2', title: 'Configuring Encrypted SIP Terminals for Remote Briefings', category: 'Communications', summary: '6 min read' },
    { article_id: 'fallback-3', title: 'Emergency Secure Network Offline Access Standards', category: 'Infrastructure', summary: '3 min read' },
  ];

  return (
    <section className="secure-dashboard-panel secure-dashboard-panel-plain">
      <div className="secure-dashboard-panel-head">
        <h3>Suggested knowledge articles</h3>
        <Link to="/knowledge-base">Browse all guides</Link>
      </div>
      <div className="secure-dashboard-article-grid">
        {rows.slice(0, 3).map((article) => (
          <Link className="secure-dashboard-article-card" to="/knowledge-base" key={article.article_id || article.title}>
            <span>{article.category || 'Knowledge base'}</span>
            <small>{article.summary || 'Quick read'}</small>
            <strong>{article.title}</strong>
            <b>Read Article</b>
          </Link>
        ))}
      </div>
    </section>
  );
}
