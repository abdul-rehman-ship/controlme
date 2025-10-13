'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, push, set, onValue, remove, get ,child} from 'firebase/database';
import { db } from '../../../../firebase';
import { Button, Container, Modal, Form, Table } from 'react-bootstrap';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../../../components/navbar';

interface Question {
  questionId: string;
  customerId: string;
  question: string;
  options: string[];
  correctAnswer: string;
  customerAnswer?: string;
  isCorrect?: boolean;
}

export default function CustomerWorkflowPage() {
  const { id } = useParams();
  const router = useRouter();

  const [questions, setQuestions] = useState<Record<string, Question>>({});
  const [showModal, setShowModal] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
   const [username, setUsername] = useState<string>('');

  useEffect(() => {
    if (!id) return;

    const fetchCustomer = async () => {
      try {
        const snapshot = await get(child(ref(db), `Customers/${id}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          setUsername(data.username);
        } else {
          toast.error('Customer not found');
        }
      } catch (error) {
        console.error(error);
        toast.error('Error fetching customer data');
      }
    };

    fetchCustomer();
  }, [id]);

  // ✅ Fetch all questions for this customer
  useEffect(() => {
    if (!id) return;
    const questionsRef = ref(db, 'Questions');
    onValue(questionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allQuestions = snapshot.val();
        const customerQuestions:any = Object.fromEntries(
          Object.entries(allQuestions).filter(
            ([, q]: any) => q.customerId === id
          )
        );
        setQuestions(customerQuestions);
      } else {
        setQuestions({});
      }
    });
  }, [id]);

  // ✅ Save or update question
  const handleSaveQuestion = async () => {
    if (!question || options.some((opt) => !opt) || !correctAnswer) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      if (editId) {
        await set(ref(db, `Questions/${editId}`), {
          questionId: editId,
          customerId: id,
          question,
          options,
          correctAnswer,
        });
        toast.success('Question updated successfully');
      } else {
        const newQuestionRef = push(ref(db, 'Questions'));
        const questionId = newQuestionRef.key!;
        await set(newQuestionRef, {
          questionId,
          customerId: id,
          question,
          options,
          correctAnswer,
        });
        toast.success('Question added successfully');
      }

      setShowModal(false);
      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectAnswer('');
      setEditId(null);
    } catch (error) {
      console.error(error);
      toast.error('Error saving question');
    }
    setLoading(false);
  };

  // ✅ Edit question
  const handleEdit = (id: string, q: Question) => {
    setEditId(id);
    setQuestion(q.question);
    setOptions(q.options);
    setCorrectAnswer(q.correctAnswer);
    setShowModal(true);
  };

  // ✅ Delete question
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await remove(ref(db, `Questions/${id}`));
      toast.success('Question deleted successfully');
    } catch (error) {
      console.error(error);
      toast.error('Error deleting question');
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
          <h2 className="fw-bold">Questions for Customer: {username}</h2>
          <Button variant="light" onClick={() => setShowModal(true)}>
            + Add Question
          </Button>
        </div>

        {/* ✅ Questions Table */}
        <div className="table-responsive">
          <Table bordered hover variant="dark" className="rounded shadow">
            <thead>
              <tr>
                <th>Question</th>
                <th>Options</th>
                <th>Correct Answer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(questions).length > 0 ? (
                Object.entries(questions).map(([key, q]: any) => (
                  <tr key={key}>
                    <td>{q.question}</td>
                    <td>
                      <ul className="list-unstyled mb-0">
                        {q.options.map((opt: string, i: number) => (
                          <li key={i}>• {opt}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="fw-bold text-success">{q.correctAnswer}</td>
                    <td>
                      <Button
                        variant="warning"
                        size="sm"
                        className="me-2"
                        onClick={() => handleEdit(key, q)}
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
                  <td colSpan={4} className="text-center text-muted">
                    No questions added yet.
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
              {editId ? 'Edit Question' : 'Add New Question'}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="bg-dark text-white">
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Question</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
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

              <Form.Group className="mt-3">
                <Form.Label>Correct Answer</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter correct answer"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                />
              </Form.Group>
            </Form>
          </Modal.Body>

          <Modal.Footer className="bg-dark text-white">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="light" onClick={handleSaveQuestion} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
}
