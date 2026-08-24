import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function SpendingChart({ weekly, onPointClick }) {
  // weekly: [{ start, end, income, expenses }, ...]
  const labels = weekly.map(w => new Date(w.start).toLocaleDateString());
  const incomeData = weekly.map(w => Number(w.income || 0));
  const expensesData = weekly.map(w => Number(w.expenses || 0));

  const data = {
    labels,
    datasets: [
      { label: 'Income', data: incomeData, borderColor: '#10b981', backgroundColor: '#10b98133', tension: 0.3 },
      { label: 'Expenses', data: expensesData, borderColor: '#ef4444', backgroundColor: '#ef444433', tension: 0.3 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' }, tooltip: { enabled: true } },
    scales: { y: { beginAtZero: true } },
    onClick: (evt, elements) => {
      if (!elements.length) return;
      const el = elements[0];
      const datasetIndex = el.datasetIndex;
      const idx = el.index;
      const point = { datasetIndex, idx, label: labels[idx] };
      onPointClick?.(point);
    }
  };

  return (
    <div className="h-64">
      <Line data={data} options={options} />
    </div>
  );
}
