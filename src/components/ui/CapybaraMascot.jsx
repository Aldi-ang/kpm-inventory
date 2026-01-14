import React, { useState, useEffect } from 'react';

const CapybaraMascot = ({ mood = 'happy', message, onClick, customImage }) => {
  const [isBouncing, setIsBouncing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 500);
    }, 5000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end cursor-pointer group"
      onClick={onClick}
    >
      {message && (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-t-xl rounded-bl-xl shadow-lg border-2 border-orange-400 mb-2 max-w-xs animate-fade-in-up">
          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{message}</p>
        </div>
      )}
      <div className={`transition-transform duration-300 ${isBouncing ? '-translate-y-2' : ''} hover:scale-110 drop-shadow-xl`}>
         <img 
            src={customImage || "/capybara.jpg"} 
            alt="Mascot" 
            className="w-24 h-24 rounded-full border-4 border-orange-500 object-cover shadow-lg bg-orange-100"
            onError={(e) => {e.target.onerror = null; e.target.src="https://api.dicebear.com/7.x/avataaars/svg?seed=Capy"}}
         />
      </div>
    </div>
  );
};

export default CapybaraMascot;