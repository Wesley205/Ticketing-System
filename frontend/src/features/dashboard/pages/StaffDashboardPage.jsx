import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { fetchArticles } from '../../knowledge-base/services/knowledge-base-api.js';
import { fetchTickets } from '../../service-requests/services/service-requests-api.js';
import { fallbackDashboardTickets } from '../services/dashboard-api.js';
import { KnowledgeArticleCards, SecureRequestTable } from '../components/SecureDashboardTables.jsx';
import { SecureDashboardActionCard } from '../components/SecureDashboardCards.jsx';

export function StaffDashboardPage({ user }) {
  const [tickets, setTickets] = useState([]);
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError('');
      try {
        const [ticketRows, articleRows] = await Promise.all([
          fetchTickets({ mine: true }).catch(() => []),
          fetchArticles({}, false).catch(() => []),
        ]);
        if (!mounted) return;
        setTickets(Array.isArray(ticketRows) && ticketRows.length ? ticketRows : fallbackDashboardTickets('staff'));
        setArticles(Array.isArray(articleRows) ? articleRows : []);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || 'Failed to load staff dashboard.');
        setTickets(fallbackDashboardTickets('staff'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const confirmationCount = tickets.filter((ticket) => ticket.closure_confirmation_required && ['Resolved'].includes(ticket.status)).length;

  return (
    <div className="secure-dashboard-page">
      <section className="secure-dashboard-head">
        <div>
          <h2>Welcome back, {user?.full_name?.split(' ')[0] || user?.username || 'Staff'}</h2>
          <p>Request help, track your requests, and confirm required actions.</p>
        </div>
        <Link to="/service-requests"><Button>Request help</Button></Link>
      </section>

      {error ? <ErrorState title="Dashboard unavailable" description={error} /> : null}
      {isLoading ? <LoadingState variant="table" description="Loading staff dashboard..." /> : null}

      <section className="secure-dashboard-action-grid responsive-grid-4">
        <SecureDashboardActionCard title="Track requests" description="See the status of your open and recent requests." actionLabel="View requests" to="/service-requests?mine=1" />
        <SecureDashboardActionCard title={`Confirmations - ${confirmationCount}`} description="Respond to required actions and approvals." actionLabel="Review" to="/service-requests?mine=1" tone="warning" />
        <SecureDashboardActionCard title="Knowledge" description="Find guides and policies for common tasks." actionLabel="Browse guides" to="/knowledge-base" />
      </section>

      <SecureRequestTable rows={tickets} title="Your recent requests" mode="staff" />
      <KnowledgeArticleCards articles={articles} />
    </div>
  );
}
