import { BrowserRouter, Routes, Route } from "react-router-dom"
import Register from "./pages/Register"
import RegisterFace from "./pages/RegisterFace"
import LoginFace from "./pages/LoginFace"
import Dashboard from "./pages/Dashboard"
import Prescription from "./pages/Prescription"
import Profile from "./pages/Profile"
import Records from "./pages/Records"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/register-face" element={<RegisterFace />} />
        <Route path="/login-face" element={<LoginFace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/prescription" element={<Prescription />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/records" element={<Records />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App