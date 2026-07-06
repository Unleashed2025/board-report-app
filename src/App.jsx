import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import OverviewPage from './pages/OverviewPage';
import PipelinePage from './pages/PipelinePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/overview" element={<OverviewPage />} />
      <Route path="/pipeline" element={<PipelinePage />} />
    </Routes>
  );
}
