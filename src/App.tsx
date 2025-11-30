import { Routes, Route, Navigate } from "react-router-dom";
import SharesPage from "./pages/SharesPage";

export default function App() {
  return (
    <Routes>
      {/* единственный маршрут */}
      <Route path="/shares" element={<SharesPage />} />

      {/* редирект с корня на /shares */}
      <Route path="*" element={<Navigate to="/shares" replace />} />
    </Routes>
  );
}