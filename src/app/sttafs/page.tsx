"use client";

import { useState, useEffect } from "react";
import { ref, set, get, child, onValue, remove, push } from "firebase/database";
import { db } from "../../../firebase";
import { Button, Container, Table, Modal, Form } from "react-bootstrap";
import Navbar from "../../components/navbar";
import { useCookies } from "react-cookie";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function StaffHome() {
  const [cookies, , removeCookie] = useCookies(["adminAuth"]);
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [staffs, setStaffs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // ✅ Check if admin is logged in
  useEffect(() => {
    toast.dismiss();
    if (!cookies.adminAuth) {
      toast.error("Please login first");
      router.push("/");
    }
  }, [cookies, router]);

  // ✅ Fetch all staff
  useEffect(() => {
    toast.dismiss();
    const staffRef = ref(db, "Staffs");
    onValue(staffRef, (snapshot) => {
      if (snapshot.exists()) setStaffs(snapshot.val());
      else setStaffs({});
    });
  }, []);

  // ✅ Add or Update Staff
  const handleSaveStaff = async () => {
    if (!username || !password) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const dbRef = ref(db);

      if (!editId) {
        // Check if username already exists
        const snapshot = await get(child(dbRef, `Staffs/${username}`));
        if (snapshot.exists()) {
          toast.error("Username already exists");
          setLoading(false);
          return;
        }

        // Generate Firebase ID
        const newStaffRef = push(ref(db, "Staffs"));
        const staffId = newStaffRef.key;

        await set(newStaffRef, {
          staffId,
          username,
          password,
          allocatedCustomers: [], // array of customer IDs later
        });

        toast.success("Staff added successfully");
      } else {
        // Update staff data
        const existingStaffRef = ref(db, `Staffs/${editId}`);
        await set(existingStaffRef, {
            'staffId': editId,
          username,
          password,
          allocatedCustomers: [], // optional
        });

        toast.success("Staff updated successfully");
      }

      setShowModal(false);
      setUsername("");
      setPassword("");
      setEditId(null);
    } catch (error) {
      console.error(error);
      toast.error("Error saving staff");
    }
    setLoading(false);
  };

  // ✅ Delete Staff
  const handleDeleteStaff = async () => {
    if (!editId) return;

    const confirmDelete = window.confirm("Are you sure you want to delete this staff?");
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await remove(ref(db, `Staffs/${editId}`));
      toast.success("Staff deleted successfully");
      setShowModal(false);
      setEditId(null);
      setUsername("");
      setPassword("");
    } catch (error) {
      console.error(error);
      toast.error("Error deleting staff");
    }
    setLoading(false);
  };

  // ✅ Edit Staff
  const handleEdit = (staffId: string, staff: any) => {
    setUsername(staff.username);
    setPassword(staff.password);
    setEditId(staffId);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-dark text-white">
      <Toaster position="top-center" />
      <Navbar />

      <Container className="py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-semi-bold">Staff Management</h2>
          <Button variant="light" onClick={() => setShowModal(true)}>
            + Add New Staff
          </Button>
        </div>

        {/* ✅ Staff Table */}
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
              {Object.entries(staffs).length > 0 ? (
                Object.entries(staffs).map(([key, staff]) => (
                  <tr key={key}>
                    <td>{staff.username}</td>
                    <td>{staff.password}</td>
                    <td>
                      <Button
                        variant="warning"
                        size="sm"
                        className="me-2 m-1"
                        onClick={() => handleEdit(key, staff)}
                      >
                        Edit
                      </Button>
                      <Button variant="info" size="sm">
                        Workflow
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center text-muted">
                    No staff found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* ✅ Add/Edit Modal */}
        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
          <Modal.Header closeButton className="bg-dark text-white">
            <Modal.Title>{editId ? "Edit Staff" : "Add New Staff"}</Modal.Title>
          </Modal.Header>

          <Modal.Body className="bg-dark text-white">
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semi-bold">Username</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!!editId}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label className="fw-semi-bold">Password</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Form.Group>
            </Form>
          </Modal.Body>

          <Modal.Footer className="bg-dark text-white flex justify-between">
            <div>
              {editId && (
                <Button
                  variant="danger"
                  onClick={handleDeleteStaff}
                  disabled={loading}
                  className="me-2"
                >
                  {loading ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>

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
                onClick={handleSaveStaff}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
}
