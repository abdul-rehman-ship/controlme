'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { db } from '../../../firebase';
import { Table, Container, Form, Button } from 'react-bootstrap';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Navbar from '../../components/navbar';
import { useCookies } from 'react-cookie';
import { useRouter } from 'next/navigation';

interface Order {
  orderId: string;
  customerId: string;
  staffId?: string;
  staffName?: string;
  status: string;
  timestamp: number;
  selectedOptions?: Record<string, string>;
  workflows?: Record<string, Workflow> | Workflow[];
}

interface Workflow {
  workflowId?: string;
  customerId?: string;
  screenTitle: string;
  options?: string[] | Record<string, string>;
}

interface User {
  userId?: string;
  username?: string;
  userType?: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const router = useRouter();
  const [cookies] = useCookies(['adminAuth']);

  // ✅ Check admin authentication
  useEffect(() => {
    toast.dismiss();
    if (!cookies.adminAuth) {
      toast.error('Please login first');
      router.push('/');
    }
  }, [cookies, router]);

  // ✅ Fetch all users
  useEffect(() => {
    const usersRef = ref(db, 'Users');
    onValue(usersRef, (snap) => {
      setUsers(snap.exists() ? snap.val() : {});
    });
  }, []);

  // ✅ Fetch all orders
  useEffect(() => {
    const ordersRef = ref(db, 'Orders');
    onValue(ordersRef, (snapshot) => {
      setOrders(snapshot.exists() ? snapshot.val() : {});
    });
  }, []);

  // ✅ Automatically reject pending orders older than 1 minute
  useEffect(() => {
    if (!orders || Object.keys(orders).length === 0) return;

    const checkAndReject = async () => {
      const now = Date.now();
      const updates: Record<string, any> = {};

      Object.entries(orders).forEach(([key, order]) => {
        if (
          order.status === 'Pending' &&
          order.timestamp &&
          now - order.timestamp > 60 * 1000 // older than 1 min
        ) {
          updates[`Orders/${key}/status`] = 'Rejected';
        }
      });

      if (Object.keys(updates).length > 0) {
        try {
          await update(ref(db), updates);
          toast('Some pending orders were auto-rejected ⏰', { icon: '⚠️' });
        } catch (error) {
          console.error('Auto-reject error:', error);
        }
      }
    };

    checkAndReject();
    const interval = setInterval(checkAndReject, 10 * 1000);
    return () => clearInterval(interval);
  }, [orders]);

  // ✅ Handle single checkbox toggle
  const handleCheckboxChange = (orderKey: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderKey)
        ? prev.filter((id) => id !== orderKey)
        : [...prev, orderKey]
    );
  };

  // ✅ Handle “Select All” checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(Object.keys(orders));
    } else {
      setSelectedOrders([]);
    }
  };

  // ✅ Delete selected orders
  const handleDeleteSelected = async () => {
    if (selectedOrders.length === 0) {
      toast.error('No orders selected!');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedOrders.length} order(s)?`)) return;

    setLoading(true);
    try {
      const deletes = selectedOrders.map((key) => remove(ref(db, `Orders/${key}`)));
      await Promise.all(deletes);
      toast.success(`${selectedOrders.length} order(s) deleted`);
      setSelectedOrders([]);
    } catch (error) {
      console.error(error);
      toast.error('Error deleting selected orders');
    }
    setLoading(false);
  };

  // ✅ Delete single order
  const handleDeleteSingle = async (key: string) => {
    if (!confirm('Delete this order?')) return;
    try {
      await remove(ref(db, `Orders/${key}`));
      toast.success('Order deleted');
    } catch (error) {
      toast.error('Error deleting order');
    }
  };

  // ✅ Update order status manually
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

  // ✅ Format date
  const formatDate = (ts?: number) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  // ✅ Render workflows (handle both object and array)
  const renderWorkflows = (wfData: any) => {
    if (!wfData) return <div className="text-muted">No workflows</div>;
    const workflowsArray = Array.isArray(wfData)
      ? wfData
      : Object.values(wfData);

    return workflowsArray.map((wf: Workflow, idx: number) => {
      const optionsArray = Array.isArray(wf.options)
        ? wf.options
        : wf.options
        ? Object.values(wf.options)
        : [];

      return (
        <div key={wf.workflowId ?? idx} className="mb-2">
          <div className="fw-bold">{wf.screenTitle}</div>
          {optionsArray.length > 0 ? (
            <ul className="mb-1">
              {optionsArray.map((opt: string, i: number) => (
                <li key={i}>• {opt}</li>
              ))}
            </ul>
          ) : (
            <div className="text-muted small">No options</div>
          )}
        </div>
      );
    });
  };

  // ✅ Export to Excel
  const handleExport = () => {
    const data = Object.entries(orders).map(([key, order]) => {
      const customer = users[order.customerId];
      const staff =
        order.staffId && users[order.staffId] ? users[order.staffId] : null;

      const selectedOptionsList = order.selectedOptions
        ? Object.values(order.selectedOptions).join(', ')
        : 'No selection';

      const wfList = order.workflows
        ? Object.values(order.workflows).map((wf: any) => {
            const opts = wf.options
              ? Array.isArray(wf.options)
                ? wf.options.join(', ')
                : Object.values(wf.options).join(', ')
              : '';
            return `${wf.screenTitle}: ${opts}`;
          })
        : [];

      return {
        Order_ID: order.orderId ?? key,
        Customer: customer?.username ?? order.customerId ?? 'Unknown',
        Staff: order.staffName ?? staff?.username ?? 'N/A',
        Selected_Options: selectedOptionsList,
        Workflows: wfList.join(' | '),
        Status: order.status,
        Timestamp: formatDate(order.timestamp),
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, 'orders_export.xlsx');
    toast.success('Excel file exported!');
  };

  // ✅ UI
  return (
    <div className="min-h-screen bg-dark text-white">
      <Toaster position="top-center" />
      <Navbar />

      <Container className="py-5">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <h2 className="fw-bold">All Orders (Admin)</h2>
          <div className="d-flex gap-2">
            <Button variant="danger" onClick={handleDeleteSelected} disabled={loading}>
              🗑️ Delete Selected
            </Button>
            <Button variant="success" onClick={handleExport}>
              📤 Export to Excel
            </Button>
          </div>
        </div>

        <div className="table-responsive">
          <Table bordered hover variant="dark" className="rounded shadow align-middle">
            <thead>
              <tr>
                <th>
                  <Form.Check
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={
                      selectedOrders.length > 0 &&
                      selectedOrders.length === Object.keys(orders).length
                    }
                  />
                </th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Staff</th>
                <th>Selected Options</th>
                <th>Workflows</th>
                <th>Status</th>
                <th>Timestamp</th>
                <th>Change Status</th>
                {/* <th>Delete</th> */}
              </tr>
            </thead>

            <tbody>
              {Object.entries(orders).length > 0 ? (
                Object.entries(orders).map(([key, order]) => {
                  const customer = users[order.customerId] ?? null;
                  const staff =
                    order.staffId && users[order.staffId]
                      ? users[order.staffId]
                      : null;

                  return (
                    <tr key={key}>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={selectedOrders.includes(key)}
                          onChange={() => handleCheckboxChange(key)}
                        />
                      </td>

                      <td style={{ maxWidth: 220, wordBreak: 'break-all' }}>
                        {order.orderId ?? key}
                      </td>

                      <td>
                        {customer?.username ? (
                          <div className="fw-bold">{customer.username}</div>
                        ) : (
                          <div>{order.customerId ?? 'Unknown'}</div>
                        )}
                      </td>

                      <td>
                        {order.staffName || staff?.username ? (
                          <div className="fw-bold">
                            {order.staffName ?? staff?.username}
                          </div>
                        ) : (
                          <div className="text-muted">N/A</div>
                        )}
                      </td>

                      <td style={{ minWidth: 200 }}>
                        {order.selectedOptions ? (
                          <ul className="mb-0">
                            {Object.values(order.selectedOptions).map(
                              (value, i) => (
                                <li key={i}>{value}</li>
                              )
                            )}
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
                            order.status === 'Accepted'
                              ? 'bg-success'
                              : order.status === 'Rejected'
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

                      <td style={{ minWidth: 150 }}>
                        <Form.Select
                          size="sm"
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(key, e.target.value)
                          }
                          disabled={loading}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Rejected">Rejected</option>
                        </Form.Select>
                      </td>

                      {/* <td>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDeleteSingle(key)}
                        >
                          Delete
                        </Button>
                      </td> */}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="text-center text-muted">
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
