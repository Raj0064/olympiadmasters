import React, { useContext, useEffect, useState } from "react";
import { ExamContext } from "../../context/ExamContext";

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

  const currentQuestion = exam.questions.find(
    (q) => q.id === currentQuestionId
  );

  const questionNumber =
    exam.questions.findIndex((q) => q.id === currentQuestionId) + 1;

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setZoomed(false);
  }, [currentQuestionId]);

  if (!currentQuestion) return null;

  const imageUrl = (currentQuestion.imageUrl || "").replace(
    "http://",
    "https://"
  );

  const hasText = !!currentQuestion.text?.trim();
  const hasImage = !!imageUrl && !imageError;

  const heightClass =
    SIZE_CLASS[currentQuestion.imageSize || "medium"];

  const layoutMode = !hasText && hasImage
    ? "image-only"
    : hasText && !hasImage
      ? "text-only"
      : hasText &&
        hasImage &&
        currentQuestion.text.trim().length <= 120
        ? "text-top"
        : "split";

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">

        {/* Minimal Header */}
        <div className="flex items-center justify-between px-4 pt-3">

          <h2 className="text-sm font-semibold text-text-dark">
            Question {questionNumber}
          </h2>

          <div className="rounded-full bg-emerald-bg px-2 py-0.5 text-[10px] font-semibold text-emerald">
            +{currentQuestion.marks}
          </div>

        </div>

        {/* Body */}
        <div className="px-4 pb-4 pt-2">

          {/* IMAGE ONLY */}
          {layoutMode === "image-only" && (
            <QuestionImage
              imageUrl={imageUrl}
              imageLoaded={imageLoaded}
              imageError={imageError}
              setImageLoaded={setImageLoaded}
              setImageError={setImageError}
              setZoomed={setZoomed}
              heightClass={heightClass}
            />
          )}

          {/* TEXT ONLY */}
          {layoutMode === "text-only" && (
            <div className="max-w-5xl">
              <p className="whitespace-pre-line text-[15px] leading-7 text-text-dark md:text-base">
                {currentQuestion.text}
              </p>
            </div>
          )}

          {/* TEXT TOP */}
          {layoutMode === "text-top" && (
            <div className="space-y-4">

              <p className="whitespace-pre-line text-[15px] leading-7 text-text-dark md:text-base">
                {currentQuestion.text}
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

          {/* SPLIT LAYOUT */}
          {layoutMode === "split" && (
            <div className="flex flex-col gap-5 lg:flex-row">

              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-line text-[15px] leading-7 text-text-dark md:text-base">
                  {currentQuestion.text}
                </p>
              </div>

              <div className="lg:w-[340px] shrink-0">
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

      {/* Zoom Modal */}
      {zoomed && imageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomed(false)}
        >

          <button
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white backdrop-blur hover:bg-white/20"
          >
            ✕
          </button>

          <img
            src={imageUrl}
            alt="Zoomed"
            className="max-h-full max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

        </div>
      )}
    </>
  );
};

function QuestionImage({
  imageUrl,
  imageLoaded,
  imageError,
  setImageLoaded,
  setImageError,
  setZoomed,
  heightClass,
  fill = false,
}) {
  return (
    <div className="relative w-full">

      {/* Loader */}
      {!imageLoaded && !imageError && (
        <div
          className={`${heightClass} flex w-full items-center justify-center rounded-xl bg-background`}
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent" />
        </div>
      )}

      {/* Image */}
      <div
        className={`
          group relative overflow-hidden rounded-xl border border-border
          ${imageLoaded ? "block" : "hidden"}
          ${fill ? `${heightClass} w-full` : ""}
        `}
      >

        <img
          src={imageUrl}
          alt="Question"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          onClick={() => setZoomed(true)}
          className={`
            cursor-zoom-in object-contain

            ${fill
              ? "h-full w-full"
              : `${heightClass} mx-auto block max-w-full`
            }
          `}
        />

        {/* Hover */}
        <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/5" />

        {/* Zoom Button */}
        <button
          onClick={() => setZoomed(true)}
          className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
        >
          Zoom
        </button>
      </div>
    </div>
  );
}

export default QuestionCard;