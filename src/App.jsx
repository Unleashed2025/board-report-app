import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import OverviewPage from './pages/OverviewPage';
import PipelinePage from './pages/PipelinePage';
import RepsPage from './pages/RepsPage';
import ForecastPage from './pages/ForecastPage';
import DealsPage from './pages/DealsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/overview" element={<OverviewPage />} />
      <Route path="/pipeline" element={<PipelinePage />} />
      <Route path="/reps" element={<RepsPage />} />
      <Route path="/forecast" element={<ForecastPage />} />
      <Route path="/deals" element={<DealsPage />} />
    </Routes>
  );
}
