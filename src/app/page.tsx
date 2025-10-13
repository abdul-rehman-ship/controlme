'use client';

import { useState } from 'react';
import { Container, Form, Button, Card } from 'react-bootstrap';
import toast, { Toaster } from 'react-hot-toast';
import { db } from '../../firebase';
import { ref, get } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { useCookies } from 'react-cookie';
export default function AdminLogin() {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [cookies, setCookie] = useCookies(['adminAuth']);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const snapshot = await get(ref(db, 'adminKey'));
      if (snapshot.exists()) {
        const adminKey = snapshot.val();
        if (key === adminKey) {
          toast.success('Login successful!');
          // redirect to admin dashboard or save session
               // ✅ Set cookie for 1 hour (3600 seconds)
          setCookie('adminAuth', 'true', {
            path: '/',
            maxAge: 3600, // 1 hour
            secure: true,
            sameSite: 'strict',
          });
          
           router.push('/admin');
           toast.dismiss();
        } else {
          toast.error('Invalid Admin Key');
        }
      } else {
        toast.error('Admin key not found in database');
      }
    } catch (error) {
      toast.error('Error connecting to Firebase');
      console.error(error);
    }

    setLoading(false);
    toast.dismiss();
  };

  return (
    <div className="min-h-screen d-flex align-items-center justify-content-center bg-dark text-white">
      <Toaster position="top-center" />
      <Container className="d-flex justify-content-center">
        <Card className="p-4 shadow-lg w-100" style={{ maxWidth: '400px', backgroundColor: '#000', border: '1px solid #fff' }}>
          <h3 className="text-center mb-4 text-white">Admin Login</h3>
          <Form onSubmit={handleLogin}>
            <Form.Group controlId="adminKey">
              <Form.Label className="text-white">Enter Admin Key</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="bg-dark text-white border-white"
                required
              />
            </Form.Group>
            <Button
              type="submit"
              className="w-100 mt-3 "
              variant="light"
              disabled={loading}
            >
              {loading ? 'Checking...' : 'Login'}
            </Button>
          </Form>
        </Card>
      </Container>
    </div>
  );
}
