import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle, ArrowLeft, Check, RotateCcw } from 'lucide-react';
import { QUIZ_QUESTIONS } from '../../data/personaQuiz';
import { FieldTypeId, FIELD_TYPES } from '../../constants';
import { PERSONA_AVATAR_PRESETS } from '../../constants/avatarAssets';
import { useApp } from '../../context/AppContext';
import { assignFieldType, getScores } from '../../logic/fieldTypeLogic';

interface PersonaQuizProps {
  onComplete: () => void;
}

export const PersonaQuiz: React.FC<PersonaQuizProps> = ({ onComplete }) => {
  const { profile, updateProfile } = useApp();
  const prefersReducedMotion = useReducedMotion();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submissionStartedRef = useRef(false);
  const interactionLockedRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    questionHeadingRef.current?.focus({ preventScroll: true });
  }, [questionIndex]);

  useEffect(() => () => {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
  }, []);

  const processFinalResults = async (finalAnswers: Record<string, string>) => {
    if (submissionStartedRef.current) return;
    submissionStartedRef.current = true;
    setIsSaving(true);
    setError(null);

    try {
      if (!profile) throw new Error('Your profile is still loading. Please try again.');
      if (QUIZ_QUESTIONS.some(question => !finalAnswers[question.id])) {
        throw new Error('Answer all three questions before classification.');
      }

      const finalPersona = assignFieldType(finalAnswers);
      const scores = getScores(finalAnswers);
      if (finalPersona === 'unclassified') {
        throw new Error('Fieldtrip could not determine your Explorer Type. Please try again.');
      }

      const fieldTypeData = FIELD_TYPES[finalPersona as FieldTypeId];
      const avatarPreset = PERSONA_AVATAR_PRESETS[finalPersona] || null;
      await updateProfile(profile.id, {
        fieldType: finalPersona,
        fieldTypeName: fieldTypeData?.name || 'Unclassified',
        fieldClassificationComplete: true,
        fieldTypeQuizCompleted: true,
        fieldTypeScores: scores as any,
        fieldTypeAssignedAt: new Date().toISOString(),
        fieldTypeLastUpdatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(avatarPreset && { avatar: avatarPreset })
      });

      onComplete();
    } catch (err: any) {
      console.error('[PersonaQuiz] Classification save failed:', err);
      submissionStartedRef.current = false;
      interactionLockedRef.current = false;
      setIsSaving(false);
      setIsTransitioning(false);
      setError(err?.message || 'Classification could not be saved. Please try again.');
    }
  };

  const onSelectAnswer = (questionId: string, answerId: string) => {
    if (interactionLockedRef.current || isTransitioning || isSaving || submissionStartedRef.current) return;

    interactionLockedRef.current = true;
    const updatedAnswers = { ...answers, [questionId]: answerId };
    setAnswers(updatedAnswers);
    setSelectedAnswerId(answerId);
    setIsTransitioning(true);
    setError(null);

    const delay = prefersReducedMotion ? 0 : 220;
    transitionTimeoutRef.current = window.setTimeout(() => {
      transitionTimeoutRef.current = null;
      setSelectedAnswerId(null);

      if (questionIndex < QUIZ_QUESTIONS.length - 1) {
        setQuestionIndex(current => current + 1);
        interactionLockedRef.current = false;
        setIsTransitioning(false);
      } else {
        void processFinalResults(updatedAnswers);
      }
    }, delay);
  };

  const goBack = () => {
    if (questionIndex === 0 || interactionLockedRef.current || isTransitioning || isSaving) return;
    setSelectedAnswerId(null);
    setError(null);
    setQuestionIndex(current => current - 1);
  };

  if (isSaving) {
    return (
      <section className="min-h-[65dvh] flex flex-col items-center justify-center gap-7 text-center" aria-live="polite" aria-busy="true">
        <div className="w-20 h-20 border-8 border-brand-lime border-t-brand-orange animate-spin" aria-hidden="true" />
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-black uppercase italic">Finding your type</h1>
          <p className="font-mono text-xs uppercase tracking-widest text-on-surface/55">Saving your three signals</p>
        </div>
      </section>
    );
  }

  const question = QUIZ_QUESTIONS[questionIndex];
  if (!question) {
    return (
      <div className="bg-white border-4 border-on-surface p-8 shadow-[8px_8px_0px_black] text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-error mx-auto" />
        <p className="font-bold">Quiz data could not be loaded.</p>
        <button type="button" onClick={() => window.location.reload()} className="px-5 py-3 bg-on-surface text-white font-bold uppercase">
          Reload
        </button>
      </div>
    );
  }

  const progress = ((questionIndex + 1) / QUIZ_QUESTIONS.length) * 100;

  return (
    <section className="w-full" aria-labelledby={`question-${question.id}`} aria-busy={isTransitioning}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          disabled={questionIndex === 0 || isTransitioning}
          aria-label="Go back to the previous question"
          className="min-h-11 px-3 flex items-center gap-2 border-2 border-on-surface bg-white font-mono text-xs font-black uppercase disabled:opacity-25 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-orange"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
        <p className="font-mono text-xs font-black uppercase tracking-widest" aria-live="polite">
          {questionIndex + 1} of {QUIZ_QUESTIONS.length}
        </p>
      </div>

      <div className="h-3 bg-white border-2 border-on-surface overflow-hidden mb-7" aria-hidden="true">
        <motion.div
          className="h-full bg-brand-orange"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={question.id}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -18 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-brand-orange">Explorer Type Signal</p>
            <h1
              id={`question-${question.id}`}
              ref={questionHeadingRef}
              tabIndex={-1}
              className="font-display text-3xl sm:text-4xl font-black uppercase italic leading-tight outline-none"
            >
              {question.prompt}
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-3" role="group" aria-label={`Answers for question ${questionIndex + 1}`}>
            {question.answers.map((answer, answerIndex) => {
              const isSelected = selectedAnswerId === answer.id || (!selectedAnswerId && answers[question.id] === answer.id);
              return (
                <button
                  key={answer.id}
                  type="button"
                  onClick={() => onSelectAnswer(question.id, answer.id)}
                  disabled={isTransitioning || isSaving}
                  aria-label={`Answer ${answerIndex + 1} of 6: ${answer.text}`}
                  aria-pressed={isSelected}
                  className={`w-full min-h-16 p-4 sm:p-5 text-left border-[3px] border-on-surface shadow-[4px_4px_0px_black] transition-colors focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-wait ${
                    isSelected ? 'bg-brand-lime' : 'bg-white hover:bg-brand-lime/35'
                  }`}
                >
                  <span className="flex items-start gap-3 font-mono text-xs sm:text-sm font-bold leading-relaxed">
                    <span className="mt-0.5 w-6 h-6 shrink-0 border-2 border-on-surface flex items-center justify-center font-black bg-white" aria-hidden="true">
                      {isSelected ? <Check className="w-4 h-4" /> : answerIndex + 1}
                    </span>
                    {answer.text}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {error && (
        <div className="mt-6 p-4 border-2 border-error bg-error/5 text-error space-y-3" role="alert">
          <p className="text-sm font-bold">{error}</p>
          <button
            type="button"
            onClick={() => void processFinalResults(answers)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-error text-white font-bold uppercase text-xs"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Try saving again
          </button>
        </div>
      )}
    </section>
  );
};
