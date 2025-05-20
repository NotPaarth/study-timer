'use client';

import { useState } from 'react';

export default function TestForm() {
  const [subject, setSubject] = useState('Physics');
  const [score, setScore] = useState('');
  const [attempted, setAttempted] = useState('');
  const [correct, setCorrect] = useState('');
  const [incorrect, setIncorrect] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const testData = {
      subject,
      score: Number(score),
      attempted: Number(attempted),
      correct: Number(correct),
      incorrect: Number(incorrect),
      date: new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem('testData') || '[]');
    existing.push(testData);
    localStorage.setItem('testData', JSON.stringify(existing));

    // Reset
    setScore('');
    setAttempted('');
    setCorrect('');
    setIncorrect('');
    alert('Test saved!');
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4 border rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-center">Add Test Record</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Subject</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Maths">Maths</option>
          </select>
        </div>

        <div>
          <label className="block font-medium">Score</label>
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block font-medium">Questions Attempted</label>
          <input
            type="number"
            value={attempted}
            onChange={(e) => setAttempted(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block font-medium">Correct Answers</label>
          <input
            type="number"
            value={correct}
            onChange={(e) => setCorrect(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block font-medium">Incorrect Answers</label>
          <input
            type="number"
            value={incorrect}
            onChange={(e) => setIncorrect(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Save Test
        </button>
      </form>
    </div>
  );
}