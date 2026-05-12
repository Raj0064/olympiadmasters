import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login.jsx";
import ExamRoom from "./pages/ExamRoom.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

import NotFound from "./pages/ErrorPages/NotFound.jsx";
import Unauthorized from "./pages/ErrorPages/Unauthorized.jsx";
import ServerError from "./pages/ErrorPages/ServerError.jsx";

import StudentLayout from "./components/student/StudentLayout.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import StudentExams from "./pages/student/StudentExams.jsx";
import StudentPerformance from "./pages/student/StudentPerformance.jsx";
import StudentProfile from "./pages/student/StudentProfile.jsx";
import StudentResultDetail from "./pages/student/StudentResultDetail.jsx";

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

const App = () => {
  return (
    <ErrorBoundary>
      <Routes>

        {/* ── Public ───────────────────────────────────────────────── */}
        <Route path="/login" element={<Login />} />

        {/* ── Error Pages ──────────────────────────────────────────── */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/error" element={<ServerError />} />

        {/* ── Student — full screen ─────────────────────────────────── */}
        <Route
          path="/exam/:examId"
          element={
            <ProtectedRoute role="student">
              <ExamRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/results/:examId"
          element={
            <ProtectedRoute role="student">
              <StudentResultDetail />
            </ProtectedRoute>
          }
        />

        {/* ── Leaderboard — both roles ──────────────────────────────── */}
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          }
        />

        {/* ── Student Layout ────────────────────────────────────────── */}
        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="exams" element={<StudentExams />} />
          <Route path="performance" element={<StudentPerformance />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        {/* ── Admin Layout ──────────────────────────────────────────── */}
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
          <Route path="exams/:examId/submissions" element={<ExamSubmissions />} />
          <Route path="exams/:examId/submissions/:submissionId" element={<SubmissionView />} />
          <Route path="results" element={<AdminResults />} />
        </Route>

        {/* ── 404 — must be last, only one wildcard ────────────────── */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </ErrorBoundary>
  );
};

export default App;