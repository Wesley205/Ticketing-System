import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

export function AppShell({ title, subtitle, children, eyebrow = 'ICT Service Hub' }) {
  return (
    <div className="react-shell">
      <Sidebar />
      <div className="react-main">
        <Topbar title={title} subtitle={subtitle} eyebrow={eyebrow} />
        <main className="react-content">{children}</main>
      </div>
    </div>
  );
}
