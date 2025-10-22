'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../../../firebase';
import { Table, Container, Form } from 'react-bootstrap';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../../components/navbar';

interface Order {
  orderId: string;
  customerId: string;
  staffId?: string;
  staffName?: string;
  status: string;
  timestamp: number;
  selectedOptions?: string[]; // selected options by customer
  workflows?: Record<string, Workflow> | Workflow[]; // could be object or array depending on how you store
}

interface Workflow {
  workflowId?: string;
  customerId?: string;
  screenTitle: string;
  options: string[];
}

interface User {
  userId?: string;
  username?: string;
  userType?: string;
  // other fields...
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(false);

  // Load all users once (to map customer/staff IDs to names)
  useEffect(() => {
    const usersRef = ref(db, 'Users');
    onValue(usersRef, (snap) => {
      if (snap.exists()) {
        setUsers(snap.val());
      } else {
        setUsers({});
      }
    });
  }, []);

  // Load all orders
  useEffect(() => {
    const ordersRef = ref(db, 'Orders');
    onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        setOrders(snapshot.val());
      } else {
        setOrders({});
      }
    });
  }, []);

  // Update order status
  const handleStatusChange = async (orderKey: string, newStatus: string) => {
    setLoading(true);
    try {
      await update(ref(db, `Orders/${orderKey}`), { status: newStatus });
      toast.success('Order status updated');
    } catch (error) {
      console.error(error);
      toast.error('Error updating status');
    }
    setLoading(false);
  };

  const formatDate = (ts?: number) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  // Helper to render workflows that may be saved as array or object
  const renderWorkflows = (wfData: any) => {
    if (!wfData) return <div className="text-muted">No workflows</div>;

    // If it's an array
    if (Array.isArray(wfData)) {
      return wfData.map((wf: Workflow, idx: number) => (
        <div key={wf.workflowId ?? idx} className="mb-2">
          <div className="fw-bold">{wf.screenTitle}</div>
          <ul className="mb-1">
            {wf.options?.map((opt, i) => (
              <li key={i}>{opt}</li>
            )) ?? null}
          </ul>
        </div>
      ));
    }

    // If it's an object keyed by workflowId
    return Object.entries(wfData).map(([k, wf]: any) => (
      <div key={k} className="mb-2">
        <div className="fw-bold">{wf.screenTitle}</div>
        <ul className="mb-1">
          {wf.options?.map((opt: string, i: number) => (
            <li key={i}>{opt}</li>
          )) ?? null}
        </ul>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-dark text-white">
      <Toaster position="top-center" />
      <Navbar />

      <Container className="py-5">
        <h2 className="mb-4 fw-bold">All Orders (Admin)</h2>

        <div className="table-responsive">
          <Table bordered hover variant="dark" className="rounded shadow">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Staff</th>
                <th>Selected Options</th>
                <th>Workflows</th>
                <th>Status</th>
                <th>Timestamp</th>
                <th>Change Status</th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(orders).length > 0 ? (
                Object.entries(orders).map(([key, order]: any) => {
                  // order keys in DB might be same as order.orderId or different; use key to update path
                  const customer = users[order.customerId] ?? null;
                  const staff = (order.staffId && users[order.staffId]) ? users[order.staffId] : null;

                  return (
                    <tr key={key}>
                      <td style={{ maxWidth: 220, wordBreak: 'break-all' }}>
                        {order.orderId ?? key}
                      </td>

                      <td>
                        {customer?.username ? (
                          <div>
                            <div className="fw-bold">{customer.username}</div>
                            <div className="text-muted small">{order.customerId}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="fw-bold">{order.customerId}</div>
                            <div className="text-muted small">Unknown user</div>
                          </div>
                        )}
                      </td>

                      <td>
                        {order.staffName || staff?.username ? (
                          <div>
                            <div className="fw-bold">{order.staffName ?? staff?.username}</div>
                            <div className="text-muted small">{order.staffId}</div>
                          </div>
                        ) : (
                          <div className="text-muted">N/A</div>
                        )}
                      </td>

                      <td style={{ minWidth: 200 }}>
                        {order.selectedOptions && order.selectedOptions.length > 0 ? (
                          <ul className="mb-0">
                            {order.selectedOptions.map((so: string, i: number) => (
                              <li key={i}>{so}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-muted">No selection</div>
                        )}
                      </td>

                      <td style={{ minWidth: 240 }}>
                        {order.workflows ? (
                          renderWorkflows(order.workflows)
                        ) : (
                          <div className="text-muted">No workflows</div>
                        )}
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            order.status === 'Completed'
                              ? 'bg-success'
                              : order.status === 'In Progress'
                              ? 'bg-warning text-dark'
                              : order.status === 'Pending'
                              ? 'bg-secondary'
                              : 'bg-light text-dark'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td>{formatDate(order.timestamp)}</td>

                      <td style={{ minWidth: 170 }}>
                        <Form.Select
                          size="sm"
                          value={order.status}
                          onChange={(e) => handleStatusChange(key, e.target.value)}
                          disabled={loading}
                        >
                          {/* adjust status options to suit your workflow */}
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </Form.Select>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center text-muted">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Container>
    </div>
  );
}
