import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getFullExam } from "../services/exam.service";
import { fetchSubmission } from "../services/submission.service";

const Results = () => {
  const { examId } = useParams();
  const { state } = useLocation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResults = async () => {
      try {
        // If coming directly from submit → state has result
        // If coming from dashboard → fetch from Firestore
        const [fullExam, sub] = await Promise.all([
          getFullExam(examId),
          fetchSubmission(currentUser.uid, examId)
        ]);

        setExam(fullExam);
        setSubmission(sub);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [examId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-surface rounded-2xl shadow p-8 text-center flex flex-col gap-4 max-w-md w-full">
          <p className="text-red-500 font-medium">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-primary transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalMarks = exam.questions.reduce((sum, q) => sum + q.marks, 0);
  const percentage = Math.round((submission.score / totalMarks) * 100);

  const getScoreColor = () => {
    if (percentage >= 75) return "text-answered";
    if (percentage >= 50) return "text-skipped";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <div className="bg-primary text-white px-4 md:px-8 py-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{exam.title}</h1>
          <p className="text-xs text-blue-200 mt-0.5">Results</p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-xs font-semibold bg-white text-primary px-4 py-2 rounded-xl hover:bg-accent hover:text-white transition"
        >
          Dashboard
        </button>
      </div>

      <div className="flex-1 p-4 md:p-8 flex flex-col gap-6 max-w-4xl mx-auto w-full">

        {/* Score Summary Card */}
        <div className="bg-surface rounded-2xl shadow-md p-6 flex flex-col gap-6">

          {/* Big Score */}
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Your Score
            </p>
            <p className={`text-6xl font-black ${getScoreColor()}`}>
              {submission.score}
              <span className="text-2xl text-gray-400 font-semibold">/{totalMarks}</span>
            </p>
            <p className={`text-lg font-bold mt-1 ${getScoreColor()}`}>
              {percentage}%
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-answered/10 border border-answered rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-answered">{submission.correct}</p>
              <p className="text-xs font-semibold text-answered mt-1">Correct</p>
            </div>
            <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-red-500">{submission.wrong}</p>
              <p className="text-xs font-semibold text-red-500 mt-1">Wrong</p>
            </div>
            <div className="bg-skipped/10 border border-skipped rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-skipped">{submission.skipped}</p>
              <p className="text-xs font-semibold text-skipped mt-1">Skipped</p>
            </div>
          </div>

          {/* Time Taken */}
          <div className="text-center text-xs text-gray-400 font-medium">
            ⏱ Time taken —{" "}
            {Math.floor(submission.timeTaken / 60)}m {submission.timeTaken % 60}s
          </div>

        </div>

        {/* Question wise Review */}
        <h2 className="text-sm font-bold text-primary uppercase tracking-widest">
          Question Review
        </h2>

        {exam.questions.map((question, index) => {
          const studentAnswer = submission.answers?.[question.id];
          const isCorrect = studentAnswer === question.correctAnswer;
          const isSkipped = !studentAnswer;

          const getBorderColor = () => {
            if (isSkipped) return "border-skipped";
            if (isCorrect) return "border-answered";
            return "border-red-400";
          };

          const getTag = () => {
            if (isSkipped) return (
              <span className="text-xs font-bold bg-skipped/10 text-skipped px-3 py-1 rounded-full">
                Skipped
              </span>
            );
            if (isCorrect) return (
              <span className="text-xs font-bold bg-answered/10 text-answered px-3 py-1 rounded-full">
                Correct
              </span>
            );
            return (
              <span className="text-xs font-bold bg-red-50 text-red-500 px-3 py-1 rounded-full">
                Wrong
              </span>
            );
          };

          return (
            <div
              key={question.id}
              className={`bg-surface rounded-2xl shadow-sm border-l-4 ${getBorderColor()} p-5 flex flex-col gap-4`}
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                  Q{index + 1}
                </p>
                {getTag()}
              </div>

              {/* Question Text */}
              <p className="text-base font-semibold text-text-dark leading-relaxed">
                {question.text}
              </p>

              {/* Question Image */}
              {question.imageUrl && (
                <img
                  src={question.imageUrl}
                  alt={`Q${index + 1}`}
                  className="rounded-xl max-h-48 object-contain"
                />
              )}

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(question.options).map(([key, val]) => {
                  const isStudentAnswer = studentAnswer === key;
                  const isCorrectAnswer = question.correctAnswer === key;

                  let optionStyle = "bg-gray-50 border-gray-200 text-gray-600";
                  if (isCorrectAnswer) optionStyle = "bg-answered/10 border-answered text-answered font-bold";
                  if (isStudentAnswer && !isCorrect) optionStyle = "bg-red-50 border-red-400 text-red-500 font-bold";

                  return (
                    <div
                      key={key}
                      className={`px-4 py-2 rounded-xl border-2 text-sm transition ${optionStyle}`}
                    >
                      <span className="font-bold mr-2">{key}.</span>{val}
                      {isCorrectAnswer && <span className="ml-2">✓</span>}
                      {isStudentAnswer && !isCorrect && <span className="ml-2">✗</span>}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {question.explanation && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                    Explanation
                  </p>
                  <p className="text-sm text-text-dark leading-relaxed">
                    {question.explanation}
                  </p>
                </div>
              )}

            </div>
          );
        })}

        {/* Bottom Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-accent transition"
        >
          Back to Dashboard
        </button>

      </div>
    </div>
  );
};

export default Results;