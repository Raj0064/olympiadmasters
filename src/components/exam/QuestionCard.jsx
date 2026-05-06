import React, { useContext, useState } from 'react';
import { ExamContext } from '../../context/ExamContext';

// ✅ imageSize → height class
const SIZE_CLASS = {
  small: 'h-32 md:h-40',
  medium: 'h-52 md:h-64',
  large: 'h-64 md:h-80',
  full: 'h-72 md:h-96 lg:h-[28rem]',
};

const QuestionCard = () => {
  const { exam, currentQuestionId } = useContext(ExamContext);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);

  const currentQuestion = exam.questions.find(q => q.id === currentQuestionId);
  const questionNumber = exam.questions.findIndex(q => q.id === currentQuestionId) + 1;

  React.useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setImageZoomed(false);
  }, [currentQuestionId]);

  if (!currentQuestion) {
    return <div className="text-red-500 font-medium">Question not found</div>;
  }

  const imageUrl = (currentQuestion.imageUrl || '').replace('http://', 'https://');
  const hasText = !!currentQuestion.text?.trim();
  const hasImage = !!imageUrl && !imageError;

  // ✅ Use imageSize field to drive height
  const heightClass = SIZE_CLASS[currentQuestion.imageSize || 'medium'];

  const layoutMode = !hasText && hasImage
    ? 'image-only'
    : hasText && !hasImage
      ? 'text-only'
      : hasText && hasImage && currentQuestion.text.trim().length <= 120
        ? 'text-top'
        : 'text-image';

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {questionNumber}
            </span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">
              of {exam.questions.length}
            </span>
          </div>
          <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
            +{currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
          </span>
        </div>

        {/* Body */}
        <div className="p-5 md:p-6">

          {/* IMAGE-ONLY */}
          {layoutMode === 'image-only' && (
            <QuestionImage
              imageUrl={imageUrl}
              questionNumber={questionNumber}
              imageLoaded={imageLoaded}
              imageError={imageError}
              setImageLoaded={setImageLoaded}
              setImageError={setImageError}
              setImageZoomed={setImageZoomed}
              heightClass={heightClass}
              maxWClass="max-w-full"
            />
          )}

          {/* TEXT-ONLY */}
          {layoutMode === 'text-only' && (
            <p className="text-gray-800 text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
              {currentQuestion.text}
            </p>
          )}

          {/* SHORT TEXT + image below */}
          {layoutMode === 'text-top' && (
            <div>
              <p className="text-gray-800 text-base md:text-lg font-semibold leading-relaxed whitespace-pre-line mb-5">
                {currentQuestion.text}
              </p>
              <QuestionImage
                imageUrl={imageUrl}
                questionNumber={questionNumber}
                imageLoaded={imageLoaded}
                imageError={imageError}
                setImageLoaded={setImageLoaded}
                setImageError={setImageError}
                setImageZoomed={setImageZoomed}
                heightClass={heightClass}
                maxWClass="max-w-full"
              />
            </div>
          )}

          {/* LONGER TEXT + image side-by-side */}
          {layoutMode === 'text-image' && (
            <div className="flex flex-col md:flex-row md:gap-6 gap-5">
              <div className="md:flex-1">
                <p className="text-gray-800 text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
                  {currentQuestion.text}
                </p>
              </div>
              <div className="md:w-72 lg:w-96 flex-shrink-0">
                <QuestionImage
                  imageUrl={imageUrl}
                  questionNumber={questionNumber}
                  imageLoaded={imageLoaded}
                  imageError={imageError}
                  setImageLoaded={setImageLoaded}
                  setImageError={setImageError}
                  setImageZoomed={setImageZoomed}
                  heightClass={heightClass}
                  maxWClass="w-full"
                  fill
                />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Fullscreen lightbox */}
      {imageZoomed && imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 md:p-8"
          onClick={() => setImageZoomed(false)}
        >
          <button
            onClick={() => setImageZoomed(false)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold z-10 transition-colors"
          >
            ✕
          </button>
          <img
            src={imageUrl}
            alt={`Question ${questionNumber} (zoomed)`}
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 text-white/50 text-xs">
            Click anywhere outside to close
          </p>
        </div>
      )}
    </>
  );
};

/* ── Reusable image block ─────────────────────────────────── */
const QuestionImage = ({
  imageUrl,
  questionNumber,
  imageLoaded,
  imageError,          // ✅ added
  setImageLoaded,
  setImageError,
  setImageZoomed,
  heightClass,
  maxWClass,
  fill = false,
}) => (
  <div className={`relative w-full ${maxWClass} mx-auto`}>

    {/* ✅ Skeleton only when not loaded AND no error */}
    {!imageLoaded && !imageError && (
      <div className={`${heightClass} w-full bg-gray-100 rounded-xl flex items-center justify-center`}>
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    )}

    {/* Actual image */}
    <div
      className={`
        group relative rounded-xl overflow-hidden border border-gray-100
        ${imageLoaded ? 'block' : 'hidden'}
        ${fill ? `${heightClass} w-full` : ''}
      `}
    >
      <img
        src={imageUrl}
        alt={`Question ${questionNumber}`}
        onClick={() => setImageZoomed(true)}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        className={`
          cursor-zoom-in
          ${fill
            ? 'w-full h-full object-contain'  // ✅ object-contain not object-cover
            : `block mx-auto object-contain ${heightClass} w-auto max-w-full`
          }
        `}
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none rounded-xl" />
      <button
        onClick={() => setImageZoomed(true)}
        className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zm0 0l4 4" />
        </svg>
        Zoom
      </button>
    </div>
  </div>
);

export default QuestionCard;