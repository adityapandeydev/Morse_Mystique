import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MorseCodePuzzle from './components/MorseCodePuzzle';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/set/:setId" element={<MorseCodePuzzle />} />
        <Route path="*" element={<Navigate to="/set/A" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
