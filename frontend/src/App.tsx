import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MorseCodePuzzle from "./components/MorseCodePuzzle";
import AdminDashboard from "./components/AdminDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MorseCodePuzzle />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
