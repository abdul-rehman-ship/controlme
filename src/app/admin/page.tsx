'use client';

import { useState, useEffect } from 'react';
import { ref, set, get, child, onValue, remove, push } from 'firebase/database';
import { db } from '../../../firebase';
import { Button, Container, Table, Modal, Form } from 'react-bootstrap';
import Navbar from '../../components/navbar';
import { useCookies } from 'react-cookie';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminHome() {
  const [cookies] = useCookies(['adminAuth']);
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<Record<string, any>>({});
  const [staffs, setStaffs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [allocatedStaffs, setAllocatedStaffs] = useState<string[]>([]);

  // 🔹 Auth check
  useEffect(() => {
    toast.dismiss();
    if (!cookies.adminAuth) {
      toast.error('Please login first');
      router.push('/');
    }
  }, [cookies, router]);

  // 🔹 Fetch Users (Customers)
  useEffect(() => {
    toast.dismiss();
    const usersRef = ref(db, 'Users');
    onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const allUsers = snapshot.val();
        const customers = Object.fromEntries(
          Object.entries(allUsers).filter(
            ([, user]: any) => user.userType === 'customer'
          )
        );
        const staffList = Object.fromEntries(
          Object.entries(allUsers).filter(
            ([, user]: any) => user.userType === 'staff'
          )
        );
        setUsers(customers);
        setStaffs(staffList);
      } else {
        setUsers({});
        setStaffs({});
      }
    });
  }, []);

  // 🔹 Open Staff Assignment Modal
  const handleAddStaffClick = (userId: string, user: any) => {
    setSelectedUserId(userId);
    setAllocatedStaffs(user.allocatedStaffs || []);
    setShowStaffModal(true);
  };

  // 🔹 Add Staff to Customer
  const handleAddStaff = async (staffId: string) => {
    if (!selectedUserId) return;

    const updatedStaffs = [...allocatedStaffs, staffId];
    setAllocatedStaffs(updatedStaffs);
    await set(ref(db, `Users/${selectedUserId}/allocatedStaffs`), updatedStaffs);

    toast.success('Staff added to customer');
  };

  // 🔹 Remove Staff
  const handleRemoveStaff = async (staffId: string) => {
    if (!selectedUserId) return;

    const updatedStaffs = allocatedStaffs.filter((id) => id !== staffId);
    setAllocatedStaffs(updatedStaffs);
    await set(ref(db, `Users/${selectedUserId}/allocatedStaffs`), updatedStaffs);

    toast.success('Staff removed from customer');
  };

  // 🔹 Add or Update Customer
  const handleSaveUser = async () => {
     if(password.length<6){
          toast.error("Password must be at least 6 characters long");
          return;
        }
    if (!username || !password) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);

    try {
      const dbRef = ref(db);
      const usersSnapshot = await get(child(dbRef, 'Users'));
      const allUsers = usersSnapshot.exists() ? usersSnapshot.val() : {};

      if (!editId) {
        // ✅ Check username duplicate
        const usernameExists = Object.values(allUsers).some(
          (u: any) => u.username === username
        );
        if (usernameExists) {
          toast.error('Username already exists');
          setLoading(false);
          return;
        }

        // ✅ Create new user
        const newUserRef = push(ref(db, 'Users'));
        const userId = newUserRef.key;

        await set(newUserRef, {
          userId,
          username,
          password,
          userType: 'customer',
          allocatedStaffs: [],
           allocatedMachine: "",
          fcmToken: '',
        });

        toast.success('Customer added successfully');
      } else {
        // ✅ Update existing user
        const userRef = ref(db, `Users/${editId}`);
        const oldDataSnapshot = await get(userRef);
        const oldData = oldDataSnapshot.val() || {};

        await set(userRef, {
          userId: editId,
          username,
          password,
          userType: oldData.userType || 'customer',
          allocatedStaffs: oldData.allocatedStaffs || [],
          allocatedMachine: oldData.allocatedMachine || "", // 🆕 added

          fcmToken: oldData.fcmToken || '',
        });

        toast.success('Customer updated successfully');
      }

      setShowModal(false);
      setUsername('');
      setPassword('');
      setEditId(null);
    } catch (error) {
      console.error(error);
      toast.error('Error saving customer');
    }

    setLoading(false);
  };

  // 🔹 Delete Customer
  const handleDeleteUser = async () => {
    if (!editId) return;

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this customer?'
    );
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await remove(ref(db, `Users/${editId}`));
      toast.success('Customer deleted successfully');
      setShowModal(false);
      setEditId(null);
      setUsername('');
      setPassword('');
    } catch (error) {
      console.error(error);
      toast.error('Error deleting customer');
    }
    setLoading(false);
  };

  // 🔹 Edit Customer
  const handleEdit = (userId: string, user: any) => {
    setUsername(user.username);
    setPassword(user.password);
    setEditId(userId);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-dark text-white">
      <Toaster position="top-center" />
      <Navbar />
      <Container className="py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-semi-bold">Customer Management</h2>
          <Button variant="light" onClick={() => setShowModal(true)}>
            + Add New Customer
          </Button>
        </div>

        {/* ✅ Customers Table */}
        <div className="table-responsive">
          <Table striped bordered hover variant="dark" className="fw-light">
            <thead>
              <tr>
                <th>Username</th>
                <th>Password</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(users).length > 0 ? (
                Object.entries(users).map(([key, user]) => (
                  <tr key={key}>
                    <td>{user.username}</td>
                    <td>{user.password}</td>
                    <td className="d-flex gap-2">
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => handleEdit(key, user)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleAddStaffClick(key, user)}
                      >
                        Staffs
                      </Button>
                      <Button
                        variant="info"
                        size="sm"
                        onClick={() => router.push(`/customers/${key}`)}
                      >
                        Workflow
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center text-muted">
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* ✅ Add/Edit Modal */}
        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
          <Modal.Header closeButton className="bg-dark text-white">
            <Modal.Title>
              {editId ? 'Edit Customer' : 'Add New Customer'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-dark text-white">
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Username</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!!editId}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer className="bg-dark text-white">
            {editId && (
              <Button
                variant="danger"
                onClick={handleDeleteUser}
                disabled={loading}
                className="me-auto"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            <div className="d-flex">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                className="me-2"
              >
                Cancel
              </Button>
              <Button
                variant="light"
                onClick={handleSaveUser}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </Modal.Footer>
        </Modal>

        {/* ✅ Staff Modal */}
        <Modal show={showStaffModal} onHide={() => setShowStaffModal(false)} centered>
          <Modal.Header closeButton className="bg-dark text-white">
            <Modal.Title>Manage Allocated Staffs</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-dark text-white">
            <h6 className="mb-2">Allocated Staffs</h6>
            {allocatedStaffs.length > 0 ? (
              allocatedStaffs.map((id) => (
                <div key={id} className="d-flex justify-content-between py-1">
                  <span>{staffs[id]?.username || 'Unknown Staff'}</span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveStaff(id)}
                  >
                    ❌
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-muted">No staff allocated.</p>
            )}
            <hr className="text-white" />
            <h6 className="mb-2">Unallocated Staffs</h6>
            {Object.entries(staffs)
              .filter(([id]) => !allocatedStaffs.includes(id))
              .map(([id, staff]) => (
                <div
                  key={id}
                  className="d-flex justify-content-between py-1"
                >
                  <span>{staff.username}</span>
                  <Button variant="success" size="sm" onClick={() => handleAddStaff(id)}>
                    +
                  </Button>
                </div>
              ))}
          </Modal.Body>
          <Modal.Footer className="bg-dark text-white">
            <Button variant="secondary" onClick={() => setShowStaffModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
}
