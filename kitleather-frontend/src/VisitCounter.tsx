import React, { useEffect, useState } from 'react';

const VisitCounter: React.FC = () => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    // Get the current count from local storage
    let currentCount = localStorage.getItem('website_visits');
    let newCount = 1;

    if (currentCount) {
      newCount = parseInt(currentCount, 10) + 1;
    }

    // Update the count in local storage
    localStorage.setItem('website_visits', newCount.toString());
    setCount(newCount);
  }, []); // Run only once on component mount

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Website Visits for kitleather.vn</h1>
        <p className="text-6xl font-extrabold text-indigo-600">{count}</p>
        <p className="text-gray-600 mt-4">Total visits recorded.</p>
      </div>
    </div>
  );
};

export default VisitCounter;
