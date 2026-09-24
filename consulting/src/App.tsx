import { Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home.tsx'
import { Assess } from './pages/Assess.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/assess" element={<Assess />} />
    </Routes>
  )
}
