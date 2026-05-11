// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ExamRoom from "./pages/ExamRoom.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Results from "./pages/Results.jsx";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminBatches from "./pages/admin/AdminBatches";
import AdminExams from "./pages/admin/AdminExams";
import AdminResults from "./pages/admin/AdminResults";
import AdminCreateExam from "./pages/admin/Admincreateexam.jsx";
import ViewBatch from "./pages/admin/AdminViewBatch.jsx";
import ViewStudent from "./pages/admin/AdminViewStudent.jsx";
import ExamSubmissions from "./pages/admin/AdminExamSubmissions.jsx";
import SubmissionView from "./pages/admin/AdminSubmissionView.jsx";
import MyPerformance from "./pages/MyPerformance.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";

const App = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Student routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam/:examId"
        element={
          <ProtectedRoute>
            <ExamRoom />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results/:examId"
        element={
          <ProtectedRoute>
            <Results />
          </ProtectedRoute>
        }
      />
      <Route path="/my-performance" element={<ProtectedRoute>
        <MyPerformance />
        </ProtectedRoute>} />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute roles={["admin", "student"]}>
            <Leaderboard />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="students/:uid" element={<ViewStudent />} />
        <Route path="batches" element={<AdminBatches />} />
        <Route path="batches/:batchId" element={<ViewBatch />} />
        <Route path="exams" element={<AdminExams />} />
        <Route path="exams/create" element={<AdminCreateExam />} />
        <Route path="exams/:examId/edit" element={<AdminCreateExam />} />
        {/* ── New submission routes ── */}
        <Route path="exams/:examId/submissions" element={<ExamSubmissions />} />
        <Route path="exams/:examId/submissions/:submissionId" element={<SubmissionView />} />
        <Route path="results" element={<AdminResults />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;