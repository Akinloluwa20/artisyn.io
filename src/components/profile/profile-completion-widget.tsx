'use client';

import { useProfileCompletion } from '@/lib/hooks';

export function ProfileCompletionWidget() {
  const { data, isLoading, error } = useProfileCompletion();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Profile Completion
          </h2>
        </div>
        <div className="p-4 space-y-3 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-2 bg-gray-100 rounded-full w-full" />
          <div className="space-y-2 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-gray-100 rounded w-3/4" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { percentage, fields } = data;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Profile Completion
        </h2>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm font-semibold text-[#605DEC]">
            {percentage}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-[#605DEC] h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <ul className="space-y-2 mt-2">
          {fields.map((field) => (
            <li key={field.label} className="flex items-center gap-2 text-sm">
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                  field.done
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {field.done ? '✓' : '○'}
              </span>
              <span className={field.done ? 'text-gray-700' : 'text-gray-400'}>
                {field.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
