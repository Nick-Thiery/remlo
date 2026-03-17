import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Savings from './pages/Savings.jsx'
import Budget from './pages/Budget.jsx'
import Remittance from './pages/Remittance.jsx'
import Login from './pages/Login.jsx'

function App() {
  return (
    <BrowserRouter>
      <nav className="bg-blue-600 p-4 flex gap-4">
        <Link to="/" className="text-white font-medium">Home</Link>
        <Link to="/savings" className="text-white font-medium">Savings</Link>
        <Link to="/budget" className="text-white font-medium">Budget</Link>
        <Link to="/remittance" className="text-white font-medium">Remittance</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/savings" element={<Savings />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/remittance" element={<Remittance />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App