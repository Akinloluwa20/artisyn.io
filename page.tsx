'use client';
import React, { useState } from 'react';

interface Feedback {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  date: string;
}

// Mock data representing feedback from clients. 
// In a production environment, this would be fetched from an API endpoint.
const mockFeedback: Feedback[] = [
  {
    id: '1',
    clientName: 'Sarah Jenkins',
    rating: 5,
    comment: 'The handcrafted table is beautiful! Exceptional attention to detail.',
    date: '2023-11-12',
  },
  {
    id: '2',
    clientName: 'Michael Chen',
    rating: 4,
    comment: 'Great quality work, although the delivery was a couple of days late.',
    date: '2023-11-05',
  },
  {
    id: '3',
    clientName: 'Elena Rodriguez',
    rating: 5,
    comment: 'Professional service and the custom shelving fits perfectly. Highly recommended artisan!',
    date: '2023-10-28',
  },
];

export default function ArtisanFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(mockFeedback);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newName, setNewName] = useState('');

  const feedbackCount = feedbacks.length;
  const totalRating = feedbacks.reduce((acc, curr) => acc + curr.rating, 0);
  const averageRatingValue = feedbackCount > 0 ? totalRating / feedbackCount : 0;
  const averageRating = averageRatingValue.toFixed(1);

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden="true">{i < Math.round(rating) ? '★' : '☆'}</span>
      ))}
    </div>
  );

  const handleAddFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !newName.trim()) return;

    const feedback: Feedback = {
      id: Date.now().toString(),
      clientName: newName,
      rating: newRating,
      comment: newComment,
      date: new Date().toISOString().split('T')[0],
    };

    // Pushing the new feedback into state
    setFeedbacks([feedback, ...feedbacks]);
    
    // Reset form
    setNewName('');
    setNewComment('');
    setNewRating(5);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Client Feedback</h1>
        <p className="text-gray-600">Review your performance and client satisfaction.</p>
      </header>

      {/* Rating Summary Section */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 flex items-center gap-8">
        <div className="text-center">
          <div className="text-5xl font-extrabold text-blue-600">{averageRating}</div>
          <div className="text-sm font-medium text-gray-500 mt-1 uppercase tracking-wider">Average Rating</div>
        </div>
        <div className="h-16 w-px bg-gray-200 hidden sm:block"></div>
        <div>
          <div className="text-yellow-400 text-2xl">{renderStars(averageRatingValue)}</div>
          <p className="text-gray-600 mt-1">Based on {feedbackCount} verified reviews</p>
        </div>
      </section>

      {/* Add Feedback Form */}
      <section className="bg-gray-50 rounded-xl p-6 mb-8 border border-dashed border-gray-300">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Add New Feedback</h2>
        <form onSubmit={handleAddFeedback} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Your Name"
              className="p-2 border rounded-md"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <select 
              className="p-2 border rounded-md"
              value={newRating}
              onChange={(e) => setNewRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
            </select>
          </div>
          <textarea
            placeholder="Share your experience..."
            className="w-full p-2 border rounded-md"
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            required
          />
          <button 
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Post Review
          </button>
        </form>
      </section>

      {/* Feedback List Section */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Latest Reviews</h2>
        {feedbacks.length > 0 ? (
          feedbacks.map((feedback) => (
            <div key={feedback.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">{feedback.clientName}</h3>
                  <div className="text-yellow-400 mt-1">{renderStars(feedback.rating)}</div>
                </div>
                <time className="text-sm text-gray-500">{feedback.date}</time>
              </div>
              <p className="text-gray-700 leading-relaxed">{feedback.comment}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500 italic">No feedback received yet.</p>
        )}
      </section>
    </div>
  );
}
