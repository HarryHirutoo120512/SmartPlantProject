import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function HistoryChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="empty">Chưa có dữ liệu lịch sử</div>;
  }

  const labels = data.map((d) =>
    new Date(d.createdAt || d.timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Độ ẩm đất (%)',
        data: data.map((d) => d.soilMoisture),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'Nhiệt độ (°C)',
        data: data.map((d) => d.temperature),
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        tension: 0.3,
        yAxisID: 'y1',
      },
      {
        label: 'Độ ẩm KK (%)',
        data: data.map((d) => d.humidity),
        borderColor: '#06b6d4',
        backgroundColor: 'transparent',
        tension: 0.3,
        yAxisID: 'y',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#8b9cb3' } },
      title: { display: false },
    },
    scales: {
      x: { ticks: { color: '#8b9cb3', maxTicksLimit: 12 }, grid: { color: '#2d3f56' } },
      y: {
        type: 'linear',
        position: 'left',
        min: 0,
        max: 100,
        ticks: { color: '#8b9cb3' },
        grid: { color: '#2d3f56' },
        title: { display: true, text: '%', color: '#8b9cb3' },
      },
      y1: {
        type: 'linear',
        position: 'right',
        min: 0,
        max: 50,
        ticks: { color: '#8b9cb3' },
        grid: { drawOnChartArea: false },
        title: { display: true, text: '°C', color: '#8b9cb3' },
      },
    },
  };

  return (
    <div className="chart-wrap">
      <Line data={chartData} options={options} />
    </div>
  );
}
