import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PracticeModule, PracticeQuestion } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, Award } from 'lucide-react';
import { cn } from '../lib/utils';

interface PracticePlayerProps {
  module: PracticeModule;
  studentId: string;
  onClose: () => void;
  onComplete: (score: number) => void;
}

export default function PracticePlayer({ module, studentId, onClose, onComplete }: PracticePlayerProps) {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [module.id]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('practice_questions')
        .select('*')
        .eq('module_id', module.id);
      
      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  const handleSubmit = (selectedAnswer?: string) => {
    const finalAnswer = selectedAnswer || answer;
    if (!finalAnswer) return;

    const isCorrect = finalAnswer.trim().toLowerCase() === currentQuestion.correct_answer.trim().toLowerCase();
    
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) setScore(prev => prev + 1);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnswer('');
      setFeedback(null);
    } else {
      // Finish module
      const finalScore = Math.round((score / questions.length) * 100);
      try {
        await supabase.from('student_module_progress').insert([{
          student_id: studentId,
          module_id: module.id,
          score: finalScore
        }]);
        setIsFinished(true);
        onComplete(finalScore);
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No questions available for this module yet.</p>
        <button onClick={onClose} className="mt-4 text-indigo-600 font-medium hover:underline">Go Back</button>
      </div>
    );
  }

  if (isFinished) {
    const finalScore = Math.round((score / questions.length) * 100);
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-xl p-12 text-center max-w-lg mx-auto border border-slate-100"
      >
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Award className="w-12 h-12 text-indigo-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Module Completed!</h2>
        <p className="text-slate-500 mb-8">You finished "{module.title}"</p>
        
        <div className="text-5xl font-black text-indigo-600 mb-8">
          {finalScore}%
        </div>
        
        <button 
          onClick={onClose}
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Return to Practice
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button 
        onClick={onClose}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Modules
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-2 bg-slate-100 w-full">
          <motion.div 
            className="h-full bg-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex) / questions.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-slate-500">
              Score: {score}
            </span>
          </div>

          <h3 className="text-2xl font-bold text-slate-800 mb-8 leading-relaxed">
            {currentQuestion.question}
          </h3>

          <div className="space-y-4">
            {currentQuestion.type === 'multiple-choice' && currentQuestion.options ? (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!feedback) {
                        setAnswer(opt);
                        handleSubmit(opt);
                      }
                    }}
                    disabled={feedback !== null}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left font-medium transition-all",
                      feedback === null 
                        ? "border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 text-slate-700" 
                        : opt === currentQuestion.correct_answer 
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : answer === opt
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-slate-200 opacity-50"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={feedback !== null}
                  placeholder="Type your answer here..."
                  className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-0 outline-none text-lg font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !feedback) handleSubmit();
                  }}
                />
                {!feedback && (
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!answer.trim()}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    Check
                  </button>
                )}
              </div>
            )}
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                className={cn(
                  "mt-8 p-6 rounded-2xl border",
                  feedback === 'correct' ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                )}
              >
                <div className="flex items-start gap-4">
                  {feedback === 'correct' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className={cn(
                      "text-lg font-bold mb-2",
                      feedback === 'correct' ? "text-emerald-800" : "text-red-800"
                    )}>
                      {feedback === 'correct' ? 'Excellent!' : 'Not quite right.'}
                    </h4>
                    <p className={cn(
                      "text-sm leading-relaxed",
                      feedback === 'correct' ? "text-emerald-700" : "text-red-700"
                    )}>
                      {currentQuestion.explanation}
                    </p>
                  </div>
                  <button
                    onClick={handleNext}
                    className={cn(
                      "px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors",
                      feedback === 'correct' 
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                        : "bg-red-600 hover:bg-red-700 text-white"
                    )}
                  >
                    {currentIndex < questions.length - 1 ? 'Next' : 'Finish'} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
