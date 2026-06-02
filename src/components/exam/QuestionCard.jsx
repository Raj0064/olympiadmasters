import React, { useContext, useEffect, useRef, useState } from "react";
import { ExamContext } from "../../context/ExamContext";
import { MdOutlineZoomOutMap } from "react-icons/md";

const SIZE_CLASS = {
  small: "h-28 md:h-36",
  medium: "h-44 md:h-56",
  large: "h-56 md:h-72",
  full: "h-72 md:h-[28rem]",
};

const QuestionCard = () => {
  const { exam, currentQuestionId } = useContext(ExamContext);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const currentQuestion = exam.questions.find((q) => q.id === currentQuestionId);
  const questionNumber = exam.questions.findIndex((q) => q.id === currentQuestionId) + 1;

  useEffect(() => {
    setZoomed(false);
  }, [currentQuestionId]);

  if (!currentQuestion) return null;

  const imageUrl = (currentQuestion.imageUrl || "").replace("http://", "https://");
  const hasText = !!currentQuestion.text?.trim();
  const hasImage = !!imageUrl && !imageError;
  const heightClass = SIZE_CLASS[currentQuestion.imageSize || "medium"];

  const layoutMode =
    !hasText && hasImage ? "image-only"
      : hasText && !hasImage ? "text-only"
        : hasText && hasImage && currentQuestion.text.trim().length <= 120 ? "text-top"
          : "split";

  function renderText(text) {
    // Match either:
    // - newline + letter + . or ) + space   (e.g., "\nA) ", "\na. ")
    // - newline + (letter) + space          (e.g., "\n(a) ", "\n(A) ")
    const match = text?.match(/\n((?:[A-Da-d][.)]|\([A-Da-d]\))\s)/);
    if (!match) return <span className="font-semibold">{text}</span>;
    const idx = text.indexOf('\n' + match[1]);
    const question = text.slice(0, idx).trim();
    const rest = text.slice(idx).trim();
    return (
      <>
        <span className="font-semibold">{question}</span>
        {'\n'}{rest}
      </>
    );
  }
  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-0">
          <h2 className="text-sm font-semibold text-text-dark">
            Question {questionNumber}
          </h2>
          <span className="rounded-full bg-emerald-bg px-2.5 py-0.5 text-[10px] font-bold text-emerald">
            +{currentQuestion.marks} marks
          </span>
        </div>

        {/* ── Body ── */}
        <div className="px-4 pb-4 pt-3">

          {layoutMode === "image-only" && (
            <QuestionImage
              imageUrl={imageUrl}
             
         
            
      
              setZoomed={setZoomed}
              heightClass={heightClass}
            />
          )}

          {layoutMode === "text-only" && (
            <p className="whitespace-pre-line text-[16px] md:text-[17px] leading-7 text-text-dark">
               {renderText(currentQuestion.text)}
            </p>
          )}

          {layoutMode === "text-top" && (
            <div className="space-y-4">
              <p className="whitespace-pre-line text-[17px] leading-7 text-text-dark">
                 {renderText(currentQuestion.text)}
              </p>
              <QuestionImage
                imageUrl={imageUrl}
                imageLoaded={imageLoaded}
                imageError={imageError}
                setImageLoaded={setImageLoaded}
                setImageError={setImageError}
                setZoomed={setZoomed}
                heightClass={heightClass}
              />
            </div>
          )}

          {layoutMode === "split" && (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-line text-[17px] leading-7 text-text-dark">
                   {renderText(currentQuestion.text)}
                </p>
              </div>
              <div className="w-full lg:w-[340px] shrink-0">
                <QuestionImage
                  imageUrl={imageUrl}
                  imageLoaded={imageLoaded}
                  imageError={imageError}
                  setImageLoaded={setImageLoaded}
                  setImageError={setImageError}
                  setZoomed={setZoomed}
                  heightClass={heightClass}
                  fill
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Zoom Modal ── */}
      {zoomed && imageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white backdrop-blur hover:bg-white/20 transition-colors"
          >
            ✕
          </button>
          <img
            src={imageUrl}
            alt="Zoomed question"
            className="max-h-full max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

function QuestionImage({ imageUrl, setZoomed, heightClass, fill = false }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef(null);

  // Reset when URL changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [imageUrl]);

  // Catch already-cached images (complete before onLoad fires)
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, [imageUrl]);

  if (!imageUrl || imageError) return null;

  // ... rest unchanged, remove imageLoaded/imageError/setImageLoaded/setImageError from props

  return (
    <div className="relative w-full">
      {!imageLoaded && (
        <div className={`${heightClass} flex w-full items-center justify-center rounded-xl bg-background`}>
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-border border-t-accent" />
        </div>
      )}
      <div
        className={`
          group relative overflow-hidden rounded-xl border border-border
          ${imageLoaded ? "inline-block" : "hidden"}
          ${fill ? `${heightClass} w-full` : ""}
        `}
      >
        <img
          ref={imgRef}          
          src={imageUrl}
          alt="Question"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          onClick={() => setZoomed(true)}
          className={`cursor-zoom-in object-contain transition-transform duration-200 group-hover:scale-[1.01]
            ${fill ? "h-full w-full" : `${heightClass} block max-w-full`}`}
        />
        <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/5 pointer-events-none" />
        <button
          onClick={() => setZoomed(true)}
          className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
        >
          <MdOutlineZoomOutMap />
        </button>
      </div>
    </div>
  );
}

export default QuestionCard;