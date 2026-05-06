import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [completedExamIds, setCompletedExamIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchExams = async () => {
      try {
        console.log("1️⃣ userProfile:", userProfile);
        console.log("2️⃣ batchId:", userProfile?.batchId);

        // Step 1 — get batch document
        const batchRef = doc(db, "batches", userProfile.batchId);
        const batchSnap = await getDoc(batchRef);

        console.log("3️⃣ batch exists?", batchSnap.exists());
        console.log("4️⃣ batch data:", batchSnap.data());

        if (!batchSnap.exists()) {
          setError("Your batch was not found. Contact admin.");
          setLoading(false);
          return;
        }

        const batchData = batchSnap.data();
        const examIds = batchData.examIds || [];

        console.log("5️⃣ examIds from batch:", examIds);
        console.log("6️⃣ examIds length:", examIds.length);

        if (examIds.length === 0) {
          console.log("⚠️ No examIds in batch — stopping here");
          setLoading(false);
          return;
        }

        // Step 2 — fetch each exam
        const examPromises = examIds.map(id => {
          console.log("7️⃣ fetching exam id:", id);
          return getDoc(doc(db, "exams", id));
        });
        const examSnaps = await Promise.all(examPromises);

        console.log("8️⃣ examSnaps:", examSnaps.map(s => ({ id: s.id, exists: s.exists() })));

        const examList = examSnaps
          .filter(snap => snap.exists())
          .map(snap => ({ id: snap.id, ...snap.data() }));

        console.log("9️⃣ final examList:", examList);

        // ADD THIS
        examList.forEach(exam => {
          console.log("🔍 exam:", exam.title);
          console.log("   isActive:", exam.isActive);
          console.log("   scheduledAt:", exam.scheduledAt?.toDate());
          console.log("   windowEnd:", exam.windowEnd?.toDate());
          console.log("   now:", new Date());
        });

        setExams(examList);

        setExams(examList);

        // Step 3 — submissions
        const submissionsQuery = query(
          collection(db, "submissions"),
          where("userId", "==", currentUser.uid)
        );
        const submissionsSnap = await getDocs(submissionsQuery);
        const submittedIds = submissionsSnap.docs.map(d => d.data().examId);

        console.log("🔟 submittedIds:", submittedIds);
        setCompletedExamIds(submittedIds);

      } catch (err) {
        console.error("❌ fetchExams error:", err);
        setError("Failed to load exams. Try again.");
      } finally {
        setLoading(false);
      }
    };

    if (userProfile?.batchId) {
      fetchExams();
    } else {
      console.log("⚠️ No batchId on userProfile — skipping fetch");
      setLoading(false);
    }
  }, [userProfile]);

  // useEffect(() => {
  //   const fetchExams = async () => {
  //     try {
  //       // Step 1 — get batch document
  //       const batchRef = doc(db, "batches", userProfile.batchId);
  //       const batchSnap = await getDoc(batchRef);
        

  //       if (!batchSnap.exists()) {
  //         setError("Your batch was not found. Contact admin.");
  //         setLoading(false);
  //         return;
  //       }

  //       const batchData = batchSnap.data();
  //       console.log(batchData.examIds);
  //       const examIds = batchData.examIds || [];

  //       if (examIds.length === 0) {
  //         setLoading(false);
  //         return;
  //       }

  //       // Step 2 — fetch each exam
  //       const examPromises = examIds.map(id => getDoc(doc(db, "exams", id)));
  //       const examSnaps = await Promise.all(examPromises);
  //       const examList = examSnaps
  //         .filter(snap => snap.exists())
  //         .map(snap => ({ id: snap.id, ...snap.data() }));

  //       setExams(examList);

  //       // Step 3 — check which exams this student already submitted
  //       const submissionsQuery = query(
  //         collection(db, "submissions"),
  //         where("userId", "==", currentUser.uid)
  //       );
  //       const submissionsSnap = await getDocs(submissionsQuery);
  //       const submittedIds = submissionsSnap.docs.map(d => d.data().examId);
  //       setCompletedExamIds(submittedIds);

  //     } catch (err) {
  //       setError("Failed to load exams. Try again.");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   if (userProfile?.batchId) fetchExams();
  // }, [userProfile]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Categorize exams
  const now = new Date();

  // ✅ Fixed — undefined treated same as null (no restriction)
  const activeExams = exams.filter(exam => {
    const start = exam.scheduledAt?.toDate?.() ?? null;
    const end = exam.windowEnd?.toDate?.() ?? null;
    return (
      exam.isActive &&
      (start === null || start <= now) &&
      (end === null || end >= now) &&
      !completedExamIds.includes(exam.id)
    );
  });

  const upcomingExams = exams.filter(exam => {
    const start = exam.scheduledAt?.toDate?.() ?? null;
    return (
      !exam.isActive ||
      (start !== null && start > now)
    ) && !completedExamIds.includes(exam.id);
  });

  const completedExams = exams.filter(exam =>
    completedExamIds.includes(exam.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400">Loading your exams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <div className="bg-primary text-white px-4 md:px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold">Olympiad Maths</h1>
          <p className="text-xs text-blue-200 mt-0.5">
            {userProfile?.name} · Grade {userProfile?.grade}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-semibold bg-white text-primary px-4 py-2 rounded-xl hover:bg-accent hover:text-white transition"
        >
          Logout
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 md:p-8 flex flex-col gap-8">

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Active Exams */}
        <Section title="Available Now" color="text-accent">
          {activeExams.length === 0 ? (
            <EmptyState message="No active exams right now." />
          ) : (
            activeExams.map(exam => (
              <ExamCard
                key={exam.id}
                exam={exam}
                status="active"
                onEnter={() => navigate(`/exam/${exam.id}`)}
              />
            ))
          )}
        </Section>

        {/* Upcoming Exams */}
        <Section title="Upcoming" color="text-primary">
          {upcomingExams.length === 0 ? (
            <EmptyState message="No upcoming exams scheduled." />
          ) : (
            upcomingExams.map(exam => (
              <ExamCard
                key={exam.id}
                exam={exam}
                status="upcoming"
              />
            ))
          )}
        </Section>

        {/* Completed Exams */}
        <Section title="Completed" color="text-answered">
          {completedExams.length === 0 ? (
            <EmptyState message="No completed exams yet." />
          ) : (
            completedExams.map(exam => (
              <ExamCard
                key={exam.id}
                exam={exam}
                status="completed"
                onEnter={() => navigate(`/results/${exam.id}`)}
              />
            ))
          )}
        </Section>

      </div>
    </div>
  );
};

// --- Helper Components ---

const Section = ({ title, color, children }) => (
  <div className="flex flex-col gap-3">
    <h2 className={`text-base font-bold uppercase tracking-widest ${color}`}>{title}</h2>
    {children}
  </div>
);

const EmptyState = ({ message }) => (
  <div className="bg-surface rounded-2xl px-6 py-5 text-sm text-gray-400 font-medium">
    {message}
  </div>
);

const ExamCard = ({ exam, status, onEnter }) => {
  const start = exam.scheduledAt?.toDate();
  const end = exam.windowEnd?.toDate();

  const formatDate = (date) => date?.toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });

  return (
    <div className="bg-surface rounded-2xl shadow-sm px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">

      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-primary">{exam.title}</h3>
        <div className="flex flex-wrap gap-3 text-xs text-gray-400 font-medium">
          <span>⏱ {exam.duration} mins</span>
          {start && <span>📅 {formatDate(start)}</span>}
          {end && status === "active" && <span>🔚 Closes {formatDate(end)}</span>}
        </div>
      </div>

      {status === "active" && (
        <button
          onClick={onEnter}
          className="px-6 py-2 rounded-xl bg-accent text-white font-bold text-sm hover:bg-primary transition shrink-0"
        >
          Start Exam →
        </button>
      )}

      {status === "upcoming" && (
        <span className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-semibold text-xs shrink-0">
          Not Started Yet
        </span>
      )}

      {status === "completed" && (
        <button
          onClick={onEnter}
          className="px-6 py-2 rounded-xl bg-answered text-white font-bold text-sm hover:opacity-80 transition shrink-0"
        >
          View Results →
        </button>
      )}

    </div>
  );
};

export default Dashboard;