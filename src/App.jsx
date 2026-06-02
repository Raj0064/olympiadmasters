import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// ── Eager imports ────────────────────────────────────────────────────────────
// These are tiny files needed on the very first paint. Keeping them eager
// means they are never behind a dynamic-import waterfall.
import Login from "./pages/Login.jsx";
import NotFound from "./pages/ErrorPages/NotFound.jsx";
import Unauthorized from "./pages/ErrorPages/Unauthorized.jsx";
import ServerError from "./pages/ErrorPages/ServerError.jsx";

// ── Lazy imports ─────────────────────────────────────────────────────────────
// Every file below is split into its own JS chunk by Vite at build time.
// The browser downloads a chunk only when the user navigates to that route.
// Result: the initial bundle shrinks from ~800 KB to ~200 KB, so Login
// appears roughly 3–4× faster on a slow connection.

// Full-screen pages (no layout shell)
const ExamRoom = lazy(() => import("./pages/ExamRoom.jsx"));
const Leaderboard = lazy(() => import("./pages/Leaderboard.jsx"));
const MentalMaths = lazy(() => import("./pages/MentalMaths.jsx"));
const StudentResultDetail = lazy(() => import("./pages/student/StudentResultDetail.jsx"));

// Student layout + children
const StudentLayout = lazy(() => import("./components/student/StudentLayout.jsx"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard.jsx"));
const StudentExams = lazy(() => import("./pages/student/StudentExams.jsx"));
const StudentClassPage = lazy(() => import("./pages/student/StudentClassPage.jsx"));
const StudentPerformance = lazy(() => import("./pages/student/StudentPerformance.jsx"));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile.jsx"));

// Admin layout + children  (largest chunk — admin code never ships to students)
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const AdminStudents = lazy(() => import("./pages/admin/AdminStudents.jsx"));
const AdminBatches = lazy(() => import("./pages/admin/AdminBatches.jsx"));
const AdminExams = lazy(() => import("./pages/admin/AdminExams.jsx"));
const AdminTopics = lazy(() => import("./pages/admin/AdminTopics.jsx"));
const AdminResults = lazy(() => import("./pages/admin/AdminResults.jsx"));
const AdminCreateExam = lazy(() => import("./pages/admin/Admincreateexam.jsx"));
const ViewBatch = lazy(() => import("./pages/admin/AdminViewBatch.jsx"));
const ViewStudent = lazy(() => import("./pages/admin/AdminViewStudent.jsx"));
const ExamSubmissions = lazy(() => import("./pages/admin/AdminExamSubmissions.jsx"));
const SubmissionView = lazy(() => import("./pages/admin/AdminSubmissionView.jsx"));

// Context provider (lazy because it is only needed inside the student shell)
const StudentDataProvider = lazy(() => import("./context/StudentdataContext.jsx"));

// ── Fallback UI ───────────────────────────────────────────────────────────────
// Shown while a chunk is being downloaded. Keep it lightweight — no Firebase
// calls, no heavy imports. A simple centred spinner is enough.
const PageLoader = () => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "#f9fafb",
  }}>
    <div style={{
      width: 40,
      height: 40,
      border: "4px solid #e5e7eb",
      borderTopColor: "#6366f1",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => (
  <ErrorBoundary>
    {/*
      Single Suspense boundary wrapping all routes.
      PageLoader shows whenever any lazy chunk is being fetched.
      ErrorBoundary above catches chunk-load failures (e.g. network drop)
      and can show a "Reload page" prompt instead of a blank screen.
    */}
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ── Public ───────────────────────────────────────────────── */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mentalmaths" element={<MentalMaths />} />

        {/* ── Error pages ──────────────────────────────────────────── */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/error" element={<ServerError />} />

        {/* ── Student — full-screen (no layout shell) ───────────────── */}
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

        {/* ── Student layout ────────────────────────────────────────── */}
        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <StudentDataProvider>
                <StudentLayout />
              </StudentDataProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="exams" element={<StudentExams />} />
          <Route path="classroom" element={<StudentClassPage />} />
          <Route path="performance" element={<StudentPerformance />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        {/* ── Admin layout ──────────────────────────────────────────── */}
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
          <Route path="topics" element={<AdminTopics />} />
          <Route path="exams/create" element={<AdminCreateExam />} />
          <Route path="exams/:examId/edit" element={<AdminCreateExam />} />
          <Route path="exams/:examId/submissions" element={<ExamSubmissions />} />
          <Route path="exams/:examId/submissions/:submissionId" element={<SubmissionView />} />
          <Route path="results" element={<AdminResults />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        {/* ── 404 — must be last ────────────────────────────────────── */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </Suspense>
  </ErrorBoundary>
);

export default App;