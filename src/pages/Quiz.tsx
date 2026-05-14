import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function QuizStub() {
  const navigate = useNavigate();
  return (
    <div className="p-10 text-center space-y-4">
      <h1 className="text-2xl font-bold">Quiz Terminal</h1>
      <p>System update in progress. Please use the shortcut to continue.</p>
      <button onClick={() => navigate('/onboarding/result')} className="px-4 py-2 bg-brand-orange text-white">
        Skip to Result
      </button>
    </div>
  );
}
