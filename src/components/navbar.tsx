"use client";

import { Navbar, Nav, Container } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { useCookies } from "react-cookie";
import toast from "react-hot-toast";
import Image from "next/image";

export default function AdminNavbar() {
  const router = useRouter();
  const [, , removeCookie] = useCookies(["adminAuth"]);

  const handleLogout = () => {
    removeCookie("adminAuth");
    toast.success("Logged out successfully");
    router.push("/");
  };

  return (
    <Navbar
      expand="lg"
      bg="black"
      variant="dark"
      className="py-3 border-b border-white lg:h-[6.5rem]"
       // ensures navbar stays same height
    >
      <Container className="d-flex justify-content-between align-items-center">
        {/* ✅ Larger logo image - no border, no round shape */}
        <Navbar.Brand href="#" className="flex items-center">
          <Image
            src="/controlme.jpeg"
            alt="Admin Logo"
            width={100}   // Increased size
            height={100}  // Increased size
            className="object-contain"
            priority
          />
        </Navbar.Brand>

        <Navbar.Toggle
          aria-controls="admin-navbar"
          className="border-white text-white"
        />
        <Navbar.Collapse id="admin-navbar">
          <Nav className="ms-auto">
            <Nav.Link
              href="/admin"
              className="text-white mx-2 hover:text-gray-300 transition-colors"
            >
              Customers
            </Nav.Link>
            <Nav.Link
              href="/sttafs"
              className="text-white mx-2 hover:text-gray-300 transition-colors"
            >
              Staff
            </Nav.Link>
            <Nav.Link
              href="#"
              className="text-white mx-2 hover:text-gray-300 transition-colors"
            >
              Orders
            </Nav.Link>
            <Nav.Link
              onClick={handleLogout}
              className="text-white mx-2 cursor-pointer hover:text-gray-300 transition-colors"
            >
              Logout
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
