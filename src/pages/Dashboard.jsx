import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

import Button from "../components/ui/Button.jsx";
import Loader from "../components/ui/Loader.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";

export default function Dashboard() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [submissionsMap, setSubmissionsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const batchRef = doc(db, "batches", userProfile.batchId);
        const batchSnap = await getDoc(batchRef);

        if (!batchSnap.exists()) {
          setError("Batch not found.");
          return;
        }

        const batchData = batchSnap.data();
        const examIds = batchData.examIds || [];

        if (examIds.length > 0) {
          const examPromises = examIds.map((id) =>
            getDoc(doc(db, "exams", id))
          );

          const examSnaps = await Promise.all(examPromises);

          const examList = examSnaps
            .filter((snap) => snap.exists())
            .map((snap) => ({
              id: snap.id,
              ...snap.data(),
            }));

          setExams(examList);
        }

        const submissionsQuery = query(
          collection(db, "submissions"),
          where("userId", "==", currentUser.uid)
        );

        const submissionsSnap = await getDocs(submissionsQuery);
        const map = {};

        submissionsSnap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          map[data.examId] = {
            id: docSnap.id,
            ...data,
          };
        });

        setSubmissionsMap(map);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    if (userProfile?.batchId) {
      fetchDashboard();
    } else {
      setLoading(false);
    }
  }, [userProfile, currentUser.uid]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const now = new Date();
  const completedExamIds = Object.keys(submissionsMap);

  const activeExams = exams.filter((exam) => {
    const start = exam.scheduledAt?.toDate?.() ?? null;
    const end = exam.windowEnd?.toDate?.() ?? null;

    return (
      exam.isActive &&
      (start === null || start <= now) &&
      (end === null || end >= now) &&
      !completedExamIds.includes(exam.id)
    );
  });

  const upcomingExams = exams.filter((exam) => {
    const start = exam.scheduledAt?.toDate?.() ?? null;

    return (
      (!exam.isActive || (start !== null && start > now)) &&
      !completedExamIds.includes(exam.id)
    );
  });

  const completedExams = exams.filter((exam) =>
    completedExamIds.includes(exam.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center bg-background">
        <Loader text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-primary">
              Olympiad Maths
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              {userProfile?.name} • Grade {userProfile?.grade}
            </p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => navigate("/my-performance")}>
            Performance
          </Button>

          <Button variant="secondary" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl space-y-10 px-5 py-8">
        {/* Welcome Banner */}
        <Card className="overflow-hidden border-0 bg-linear-to-r from-primary to-accent p-8 text-white shadow-lg">
          <h2 className="text-2xl font-bold">
            Welcome back, {userProfile?.name} 👋
          </h2>
          <p className="mt-2 text-sm text-white/75">
            Continue your Olympiad preparation and improve your scores.
          </p>
        </Card>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-danger/15 bg-danger-bg px-5 py-4 text-danger">
            {error}
          </div>
        )}

        {/* Active Exams */}

        {activeExams.length === 0 ? <></> :
        <DashboardSection title="Available Now">
          {activeExams.length === 0 ? (
            <EmptyState title="No active exams right now" />
          ) : (
            activeExams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                type="active"
                onAction={() => navigate(`/exam/${exam.id}`)}
              />
            ))
          )}
        </DashboardSection>
}

        {/* Upcoming Exams */}
        
        {upcomingExams.length === 0 ? <></>:

        <DashboardSection title="Upcoming Exams">
          {upcomingExams.length === 0 ? (
            <EmptyState title="No upcoming exams" />
          ) : (
            upcomingExams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} type="upcoming" />
            ))
          )}
        </DashboardSection>
         }
        

        {/* Completed Exams */}
        <DashboardSection title="Completed Exams">
          {completedExams.length === 0 ? (
            <EmptyState title="No completed exams yet" />
          ) : (
            completedExams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                type="completed"
                submission={submissionsMap[exam.id]}
                onAction={() => navigate(`/results/${exam.id}`)}
              />
            ))
          )}
        </DashboardSection>
      </main>
    </div>
  );
}

function DashboardSection({ title, children }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-text-dark">
          {title}
        </h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ExamCard({ exam, type, submission, onAction }) {
  const start = exam.scheduledAt?.toDate?.();

  const score = submission?.score;
  const totalMarks = submission?.totalMarks || exam.totalMarks;
  const percentage = submission?.percentage;

  const formatDate = (date) =>
    date?.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const configMap = {
    active: {
      badge: "success",
      border: "border-success/20",
      label: "Live",
    },
    upcoming: {
      badge: "info",
      border: "border-border",
      label: "Upcoming",
    },
    completed: {
      badge: "success",
      border: "border-accent/15",
      label: "Completed",
    },
  };

  const config = configMap[type];

  return (
    <Card
      className={`py-3 px-6 transition-all duration-200 hover:shadow-md hover:border-l-accent ${config.border}`}
    >
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        {/* Left */}
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-start gap-3">
            <h3 className="min-w-0 flex-1 text-lg font-bold leading-snug text-text-dark">
              {exam.title}
            </h3>
            <Badge variant={config.badge}>{config.label}</Badge>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-1">
            
            <Badge variant="sky" >
              {exam.duration === 0
                ? "Unlimited Time"
                : `${exam.duration} Minutes`}
            </Badge>

            {exam.totalQuestions && (
              <Badge variant="indigo">
                {exam.totalQuestions} Questions
              </Badge>
            )}

            {totalMarks && (
              <Badge variant="emerald">
                {totalMarks} Marks
              </Badge>
            )}

            {start && type !== "completed" && (
              <Badge variant="success">
                {formatDate(start)}
              </Badge>
            )}
            

          </div>
        </div>

        {/* Right */}
        <div className="flex shrink-0 items-center gap-4">
          {type === "completed" && score !== undefined && (
            <div className="rounded-2xl border border-accent/10 bg-accent/5 px-6 py-4 text-center">
              <p className="text-lg font-bold text-primary">
                {score}/{totalMarks}
              </p>
              {percentage !== undefined && (
                <p className="mt-1 text-xs text-text-muted">
                  {percentage.toFixed(1)}%
                </p>
              )}
            </div>
          )}

          {type === "active" && (
            <Button variant="accent" size="lg" onClick={onAction}>
              Start Exam →
            </Button>
          )}

          {type === "upcoming" && (
            <Button variant="secondary" size="lg" disabled>
              Scheduled
            </Button>
          )}

          {type === "completed" && (
            <Button variant="primary" size="lg" onClick={onAction}>
              View Results
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}