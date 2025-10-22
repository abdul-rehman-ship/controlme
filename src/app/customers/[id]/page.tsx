'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, push, set, onValue, remove, get, child } from 'firebase/database';
import { db } from '../../../../firebase';
import { Button, Container, Modal, Form, Table } from 'react-bootstrap';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../../../components/navbar';

interface Workflow {
  workflowId: string;
  customerId: string;
  screenTitle: string;
  options: string[];
}

export default function CustomerWorkflowPage() {
  const { id } = useParams();
  const router = useRouter();

  const [workflows, setWorkflows] = useState<Record<string, Workflow>>({});
  const [showModal, setShowModal] = useState(false);
  const [screenTitle, setScreenTitle] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState<string>('');

  // ✅ Fetch customer name from Users node
  useEffect(() => {
    if (!id) return;

    const fetchCustomer = async () => {
      try {
        const snapshot = await get(child(ref(db), `Users/${id}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          setUsername(data.username || 'Unknown');
        } else {
          toast.error('User not found');
        }
      } catch (error) {
        console.error(error);
        toast.error('Error fetching user data');
      }
    };

    fetchCustomer();
  }, [id]);

  // ✅ Fetch all workflows for this customer
  useEffect(() => {
    if (!id) return;
    const workflowsRef = ref(db, 'Workflows');
    onValue(workflowsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allWorkflows = snapshot.val();
        const customerWorkflows: any = Object.fromEntries(
          Object.entries(allWorkflows).filter(
            ([, wf]: any) => wf.customerId === id
          )
        );
        setWorkflows(customerWorkflows);
      } else {
        setWorkflows({});
      }
    });
  }, [id]);

  // ✅ Save or update workflow
  const handleSaveWorkflow = async () => {
    if (!screenTitle || options.some((opt) => !opt)) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      if (editId) {
        await set(ref(db, `Workflows/${editId}`), {
          workflowId: editId,
          customerId: id,
          screenTitle,
          options,
        });
        toast.success('Workflow updated successfully');
      } else {
        const newWorkflowRef = push(ref(db, 'Workflows'));
        const workflowId = newWorkflowRef.key!;
        await set(newWorkflowRef, {
          workflowId,
          customerId: id,
          screenTitle,
          options,
        });
        toast.success('Workflow added successfully');
      }

      setShowModal(false);
      setScreenTitle('');
      setOptions(['', '', '', '']);
      setEditId(null);
    } catch (error) {
      console.error(error);
      toast.error('Error saving workflow');
    }
    setLoading(false);
  };

  // ✅ Edit workflow
  const handleEdit = (id: string, wf: Workflow) => {
    setEditId(id);
    setScreenTitle(wf.screenTitle);
    setOptions(wf.options);
    setShowModal(true);
  };

  // ✅ Delete workflow
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await remove(ref(db, `Workflows/${id}`));
      toast.success('Workflow deleted successfully');
    } catch (error) {
      console.error(error);
      toast.error('Error deleting workflow');
    }
  };

  return (
    <div className="min-h-screen bg-dark text-white">
      <Toaster position="top-center" />
      <Navbar />

      <Container className="py-5">
        <Button variant="secondary" onClick={() => router.back()} className="mb-4">
          ← Back
        </Button>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-semi-bold">Workflows for Customer: {username}</h2>
          <Button variant="light" onClick={() => setShowModal(true)}>
            + Add Workflow
          </Button>
        </div>

        {/* ✅ Workflows Table */}
        <div className="table-responsive">
          <Table bordered hover variant="dark" className="rounded shadow">
            <thead>
              <tr>
                <th>Screen Title</th>
                <th>Options</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(workflows).length > 0 ? (
                Object.entries(workflows).map(([key, wf]: any) => (
                  <tr key={key}>
                    <td>{wf.screenTitle}</td>
                    <td>
                      <ul className="list-unstyled mb-0">
                        {wf.options.map((opt: string, i: number) => (
                          <li key={i}>• {opt}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <Button
                        variant="warning"
                        size="sm"
                        className="me-2"
                        onClick={() => handleEdit(key, wf)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(key)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center text-muted">
                    No workflows added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* ✅ Modal for Add/Edit */}
        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
          <Modal.Header closeButton className="bg-dark text-white">
            <Modal.Title>
              {editId ? 'Edit Workflow' : 'Add New Workflow'}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="bg-dark text-white">
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Screen Title</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter screen title"
                  value={screenTitle}
                  onChange={(e) => setScreenTitle(e.target.value)}
                />
              </Form.Group>

              {options.map((opt, i) => (
                <Form.Group key={i} className="mb-2">
                  <Form.Label>Option {i + 1}</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder={`Enter option ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...options];
                      updated[i] = e.target.value;
                      setOptions(updated);
                    }}
                  />
                </Form.Group>
              ))}
            </Form>
          </Modal.Body>

          <Modal.Footer className="bg-dark text-white">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="light" onClick={handleSaveWorkflow} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
}
