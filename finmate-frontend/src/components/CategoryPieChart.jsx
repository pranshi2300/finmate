import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryPieChart({ categories, onSliceClick }) {
  // categories: [{ category, amount }]
  const labels = categories.map(c => c.category);
  const data = {
    labels,
    datasets: [{ data: categories.map(c => c.amount), backgroundColor: ['#f97316', '#60a5fa', '#f472b6', '#34d399', '#f87171'] }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { tooltip: { enabled: true } },
    onClick: (evt, elems, chart) => {
      if (!elems.length) return;
      const idx = elems[0].index;
      const category = labels[idx];
      onSliceClick?.(category);
    }
  };
  return (
    <div className="h-56">
      <Pie data={data} options={options} />
    </div>
  );
}
