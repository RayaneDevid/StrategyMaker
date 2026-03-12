import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import HomePage from '@/routes/index'
import LoginPage from '@/routes/login'
import CreatePage from '@/routes/create'
import SessionPage from '@/routes/session'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create" element={<CreatePage />} />
      </Route>
      <Route path="/session/:id" element={<SessionPage />} />
    </Routes>
  )
}
