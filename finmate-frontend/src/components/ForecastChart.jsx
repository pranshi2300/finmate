import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function ForecastChart({ dataPoints }) {
  const labels = (dataPoints || []).map(p => new Date(p.date).toLocaleDateString());
  const data = {
    labels,
    datasets: [{ label: 'Predicted net', data: (dataPoints || []).map(p => p.predictedNet), borderColor: '#60a5fa', backgroundColor: '#60a5fa33', tension: 0.3 }],
  };
  const options = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } } };
  return <div className="h-56"><Line data={data} options={options} /></div>;
}
