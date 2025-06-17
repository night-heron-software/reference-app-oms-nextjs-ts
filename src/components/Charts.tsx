// /Users/jeffromine/src/learning/temporal/reference-app-oms-nextjs-ts/components/Charts.tsx
'use client';

import React, { useEffect, useRef } from 'react';
// Assuming Card.tsx is in lib/components, adjust path if necessary
import Card from '@/components/Card';
import ChartJS from 'chart.js/auto';
import type { ChartData, ChartDataset, Chart as ChartJSInstance } from 'chart.js';

// Define placeholder props for Card component for type safety
// Actual props might differ based on your Card component implementation
interface CardProps {
  children: React.ReactNode;
  actionButtons?: React.ReactNode;
}

// Types for Chart.js data (can also be imported from 'chart.js')
interface CustomChartDataset extends ChartDataset<'line', number[]> {
  tension: number;
}

interface CustomChartData extends ChartData<'line', number[], string> {
  datasets: CustomChartDataset[];
}

const initialWorkerCountChartData: CustomChartData = {
  labels: [],
  datasets: [
    { label: 'Order', data: [], borderColor: 'green', tension: 0.1, fill: false },
    { label: 'Shipment', data: [], borderColor: 'blue', tension: 0.1, fill: false },
    { label: 'Charge', data: [], borderColor: 'orange', tension: 0.1, fill: false }
  ]
};

const initialCompleteChartData: CustomChartData = {
  labels: [],
  datasets: [{ label: 'Order', data: [], borderColor: 'green', tension: 0.1, fill: false }]
};

const initialBacklogChartData: CustomChartData = {
  labels: [],
  datasets: [
    { label: 'Order', data: [], borderColor: 'green', tension: 0.1, fill: false },
    { label: 'Shipment', data: [], borderColor: 'blue', tension: 0.1, fill: false },
    { label: 'Charge', data: [], borderColor: 'orange', tension: 0.1, fill: false }
  ]
};

interface Stats {
  workerCount?: number;
  completeRate?: number;
  backlog?: number;
}

export default function Charts() {
  const completionsCanvasRef = useRef<HTMLCanvasElement>(null);
  const workerCountCanvasRef = useRef<HTMLCanvasElement>(null);
  const backlogCanvasRef = useRef<HTMLCanvasElement>(null);

  const completionsChartRef = useRef<ChartJSInstance<'line', number[], string> | null>(null);
  const workerCountChartRef = useRef<ChartJSInstance<'line', number[], string> | null>(null);
  const backlogChartRef = useRef<ChartJSInstance<'line', number[], string> | null>(null);

  const updateChartData = async () => {
    const now = new Date().toLocaleTimeString();

    try {
      const responses = await Promise.all([
        fetch('/api/order/stats'),
        fetch('/api/shipment/stats'),
        fetch('/api/charge/stats')
      ]);

      const allStats: Stats[] = await Promise.all(
        responses.map((response) => {
          if (!response.ok) {
            console.error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
            return {}; // Return empty object or handle error appropriately
          }
          return response.json();
        })
      );

      // Update Completions Chart (assumed for 'Order' stats, i.e., allStats[0])
      if (completionsChartRef.current && allStats[0]?.completeRate !== undefined) {
        const chart = completionsChartRef.current;
        chart.data.labels = [...(chart.data.labels?.slice(-20) || []), now];
        if (chart.data.datasets[0]) {
          chart.data.datasets[0].data = [
            ...(chart.data.datasets[0].data.slice(-20) || []),
            allStats[0].completeRate
          ];
        }
        chart.update('none'); // 'none' for no animation
      }

      // Update Worker Count Chart
      if (workerCountChartRef.current) {
        const chart = workerCountChartRef.current;
        chart.data.labels = [...(chart.data.labels?.slice(-20) || []), now];
        allStats.forEach((stats, i) => {
          if (chart.data.datasets[i] && stats?.workerCount !== undefined) {
            chart.data.datasets[i].data = [
              ...(chart.data.datasets[i].data.slice(-20) || []),
              stats.workerCount
            ];
          }
        });
        chart.update('none');
      }

      // Update Backlog Chart
      if (backlogChartRef.current) {
        const chart = backlogChartRef.current;
        chart.data.labels = [...(chart.data.labels?.slice(-20) || []), now];
        allStats.forEach((stats, i) => {
          if (chart.data.datasets[i] && stats?.backlog !== undefined) {
            chart.data.datasets[i].data = [
              ...(chart.data.datasets[i].data.slice(-20) || []),
              stats.backlog
            ];
          }
        });
        chart.update('none');
      }
    } catch (error) {
      console.error('Error updating chart data:', error);
    }
  };

  useEffect(() => {
    if (completionsCanvasRef.current) {
      completionsChartRef.current = new ChartJS(completionsCanvasRef.current, {
        type: 'line',
        data: JSON.parse(JSON.stringify(initialCompleteChartData)) // Deep clone
      });
    }
    if (workerCountCanvasRef.current) {
      workerCountChartRef.current = new ChartJS(workerCountCanvasRef.current, {
        type: 'line',
        data: JSON.parse(JSON.stringify(initialWorkerCountChartData)) // Deep clone
      });
    }
    if (backlogCanvasRef.current) {
      backlogChartRef.current = new ChartJS(backlogCanvasRef.current, {
        type: 'line',
        data: JSON.parse(JSON.stringify(initialBacklogChartData)) // Deep clone
      });
    }

    updateChartData(); // Initial data fetch
    const refreshIntervalId = setInterval(updateChartData, 10000);

    return () => {
      clearInterval(refreshIntervalId);
      completionsChartRef.current?.destroy();
      workerCountChartRef.current?.destroy();
      backlogChartRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  return (
    <>
      <Card>
        <div className="w-full p-4 flex flex-col gap-4">
          <h3 className="text-xl font-bold">Completions</h3>
          <div className="w-full">
            <canvas ref={completionsCanvasRef}></canvas>
          </div>
        </div>
      </Card>
      <Card>
        <div className="w-full p-4 flex flex-col gap-4">
          <h3 className="text-xl font-bold">Workers</h3>
          <div className="w-full">
            <canvas ref={workerCountCanvasRef}></canvas>
          </div>
        </div>
        <div className="w-full p-4 flex flex-col gap-4">
          <h3 className="text-xl font-bold">Backlog</h3>
          <div className="w-full">
            <canvas ref={backlogCanvasRef}></canvas>
          </div>
        </div>
      </Card>
    </>
  );
}
