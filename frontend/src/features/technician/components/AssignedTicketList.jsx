import { TicketList } from '../../service-requests/components/TicketList.jsx';

export function AssignedTicketList({ tickets = [] }) {
  return <TicketList tickets={tickets} canManageAssignments={false} detailBasePath="/technician/work/ticket" />;
}
