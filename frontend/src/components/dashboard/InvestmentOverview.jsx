import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import Card from '../common/Card';
import { formatCurrency } from '../../utils/formatters';

ChartJS.register(ArcElement, Tooltip, Legend);

const InvestmentOverview = ({ totalInvestment, investments }) => {
  // Prepare chart data
  const chartData = {
    labels: investments ? investments.map(inv => inv.description.slice(0, 15) + (inv.description.length > 15 ? '...' : '')) : [],
    datasets: [
      {
        data: investments ? investments.map(inv => inv.amount) : [],
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 205, 86, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
  };
  
  return (
    <Card title="External Investments">
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/2">
          <div className="text-center mb-4">
            <p className="text-gray-600 text-sm">Total External Investment</p>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalInvestment || 0)}</p>
          </div>
          
          <div className="h-64">
            {investments && investments.length > 0 ? (
              <Doughnut data={chartData} options={options} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">No investment data available</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="md:w-1/2 md:pl-6 mt-6 md:mt-0">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Active Investments</h4>
          
          {investments && investments.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {investments.map((investment, index) => (
                <div 
                  key={investment.id || index}
                  className="bg-white border border-gray-200 p-3 rounded shadow-sm"
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{investment.description}</p>
                      <p className="text-sm text-gray-500">
                        Invested on {new Date(investment.investment_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(investment.amount)}</p>
                      {investment.expected_return && (
                        <p className="text-xs text-green-600">
                          Expected return: {formatCurrency(investment.expected_return)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>No active investments</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default InvestmentOverview;