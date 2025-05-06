import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import Card from '../common/Card';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ContributionChart = ({ contributions, title = 'Contribution History For Last 6 Months' }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });
  
  const [chartType, setChartType] = useState('line');
  
  useEffect(() => {
    if (contributions && contributions.length > 0) {
      // Sort contributions by month
      const sortedContributions = [...contributions].sort((a, b) => 
        new Date(a.month) - new Date(b.month)
      );
      
      // Extract labels (months) and data (amounts)
      const labels = sortedContributions.map(contribution => {
        const date = new Date(contribution.month);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      });
      
      const amounts = sortedContributions.map(contribution => contribution.amount);
      
      // Create cumulative sum for total contribution over time
      const cumulativeSums = sortedContributions.reduce((acc, contribution, index) => {
        const previousSum = index > 0 ? acc[index - 1] : 0;
        acc.push(previousSum + contribution.amount);
        return acc;
      }, []);
      
      setChartData({
        labels,
        datasets: [
          {
            label: 'Monthly Contribution',
            data: amounts,
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
          },
          {
            label: 'Cumulative Contribution',
            data: cumulativeSums,
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 2,
            yAxisID: 'y1',
            type: 'line'
          }
        ]
      });
    }
  }, [contributions]);
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: (value) => `KSh ${value.toLocaleString()}`
        }
      },
      y1: {
        position: 'right',
        beginAtZero: true,
        grid: {
          display: false
        },
        ticks: {
          callback: (value) => `KSh ${value.toLocaleString()}`
        }
      }
    }
  };
  
  const renderChart = () => {
    if (chartType === 'line') {
      return <Line data={chartData} options={options} height={300} />;
    } else {
      return <Bar data={{
        labels: chartData.labels,
        datasets: [chartData.datasets[0]]
      }} options={options} height={300} />;
    }
  };
  
  return (
    <Card title={title}>
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-l-md ${
              chartType === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
            onClick={() => setChartType('line')}
          >
            Line
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-r-md ${
              chartType === 'bar'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
            onClick={() => setChartType('bar')}
          >
            Bar
          </button>
        </div>
      </div>
      
      <div className="h-80">
        {contributions && contributions.length > 0 ? (
          renderChart()
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">No contribution data available</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ContributionChart;