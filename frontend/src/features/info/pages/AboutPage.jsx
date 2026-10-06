import { PageHero } from '../../../components/layout/PageHero.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { useAuth } from '../../auth/hooks/useAuth.js';

const problemItems = [
  'Manual or spreadsheet-based ICT equipment tracking that is hard to search and audit.',
  'Limited visibility into who is using each asset and when assets move between users or departments.',
  'Ad-hoc handling of staff ICT complaints without assignment, SLA, or accountability history.',
  'Weak operational visibility into technician workload, ticket progress, and resolution performance.',
  'Fragmented institutional knowledge for recurring ICT problems and fixes.',
];

const featureItems = [
  'Invitation-only authentication with user type, role, account status, and temporary-account controls.',
  'Role-aware dashboards, report filters, CSV export, and operational metrics.',
  'Service desk tickets with status workflow, assignment, comments, attachments, history, and SLA tracking.',
  'Dedicated technician workspace for assigned ticket and maintenance execution.',
  'Asset lifecycle management with assignment, return, maintenance, and history tracking.',
  'Knowledge base articles with visibility, revisions, relations, suggestions, and feedback.',
  'Read-only audit logs for authorized oversight users.',
];

const technologyItems = [
  'Frontend: React, React Router, Vite, and shared design-system components.',
  'Backend: Node.js with Express REST APIs.',
  'Authentication: JWT sessions with bcrypt password hashing and backend account revalidation.',
  'Database: PostgreSQL with versioned migrations, constraints, indexes, and seed data.',
  'Operations: health/readiness endpoints, scheduled job scripts, notifications, and audit logging.',
];

const limitationItems = [
  'Email delivery and scheduled infrastructure must be configured before external notifications are considered active.',
  'Legacy static pages remain available during migration and should not be removed until a separate cleanup phase.',
  'The frontend improves usability, but backend authorization remains the security boundary.',
  'Production deployment still requires correct environment variables, PostgreSQL connectivity, HTTPS termination, and backup procedures.',
];

function InfoList({ items }) {
  return (
    <ul className="about-list-react">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function AboutPage() {
  const auth = useAuth();
  const isAdmin = auth.user?.role === 'admin';

  return (
    <SecureWorkspaceLayout title="About the System" subtitle="ICT Service Hub">
      <div className="ui-stack-lg about-page-react">
        <PageHero
          eyebrow="System"
          title="About the System"
          description="The NSC ICT Service Desk centralizes internal ICT support, asset tracking, maintenance, knowledge sharing, and operational oversight."
          meta={['Internal system', 'Service desk', 'Asset registry', 'Audit trail']}
        />

      <Panel title="Purpose">
        <p className="react-copy">
          The NSC ICT Service Desk and Asset Management System helps ICT teams manage staff-reported
          technical issues, track organizational assets, coordinate maintenance, measure SLA performance,
          and preserve a reliable operational audit trail.
        </p>
      </Panel>

      <div className="about-grid-react">
        <Panel title="Problems Addressed">
          <InfoList items={problemItems} />
        </Panel>

        <Panel title="Main Features">
          <InfoList items={featureItems} />
        </Panel>

        {isAdmin ? (
          <>
            <Panel title="System Information">
              <InfoList items={technologyItems} />
            </Panel>

            <Panel title="Operations Notes">
              <InfoList items={limitationItems} />
            </Panel>
          </>
        ) : null}
      </div>

      {isAdmin ? (
        <Panel title="Deployment Notes">
          <p className="react-copy">
            Schema changes are handled through versioned migrations. Confirm environment variables,
            database connectivity, HTTPS termination, and backup procedures before production updates.
          </p>
        </Panel>
      ) : null}
      </div>
    </SecureWorkspaceLayout>
  );
}
