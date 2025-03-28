import React from 'react';

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  color = 'blue',
  onClick
}) => {
  // Color variants
  const colorVariants = {
    blue: 'bg-blue-50 text-blue-500 border-blue-200',
    green: 'bg-green-50 text-green-500 border-green-200',
    red: 'bg-red-50 text-red-500 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-500 border-yellow-200',
    purple: 'bg-purple-50 text-purple-500 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-500 border-indigo-200'
  };
  
  // Trend indicators
  const trendIcons = {
    up: (
      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
    down: (
      <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    neutral: (
      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    )
  };
  
  return (
    <div 
      className={`
        p-6 bg-white rounded-lg border shadow-sm
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        
        {icon && (
          <div className={`p-3 rounded-full ${colorVariants[color]}`}>
            {icon}
          </div>
        )}
      </div>
      
      {trend && trendLabel && (
        <div className="mt-4 flex items-center text-sm">
          {trendIcons[trend]}
          <span className={`ml-1 ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
            {trendLabel}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatCard;