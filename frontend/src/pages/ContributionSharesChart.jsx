import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// const COLORS = ['#0088FE', '#ECEFF1'];
const COLORS = ['#0088FE', '#FF8042'];

const ContributionSharesChart = ({ userContribution, totalContributions }) => {
  // Calculate percentages safely
  const userPercentage = totalContributions > 0 ? (userContribution / totalContributions) * 100 : 0;
  const othersPercentage = 100 - userPercentage;
  
  const data = [
    { name: 'Your Shares', value: userPercentage },
    { name: 'Other Members', value: othersPercentage },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Your Contribution Shares</h2>
      <p className="text-gray-600 mb-4">
        Your contributions represent {userPercentage.toFixed(2)}% of the total fund
      </p>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(2)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => [`${value.toFixed(2)}%`, 'Percentage']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ContributionSharesChart;