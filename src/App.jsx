import { Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import NavBar from './components/NavBar';
import DealsPage from './pages/DealsPage';
import ForecastPage from './pages/ForecastPage';
import HomePage from './pages/HomePage';
import PipelinePage from './pages/PipelinePage';
import RepsPage from './pages/RepsPage';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0D2338] text-white">
      <Header />
      <NavBar />
      <main className="mx-auto max-w-7xl px-6 pb-12">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/reps" element={<RepsPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/deals" element={<DealsPage />} />
        </Routes>
      </main>
    </div>
  );
}
