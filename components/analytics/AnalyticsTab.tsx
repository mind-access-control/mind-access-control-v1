'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import SecurityTrendsChart from './SecurityTrendsChart';
import FailureCauseChart from './FailureCauseChart';
import { EMPTY_STRING } from '@/lib/constants';
import { DailyTrendEntry } from '@/lib/api/types';
import { AnalyticService } from '@/lib/api/services';

const AnalyticsTab: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>(EMPTY_STRING);
  const [dateTo, setDateTo] = useState<string>(EMPTY_STRING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [trendData, setTrendData] = useState<DailyTrendEntry[]>([]);
  const [failureCauseData, setFailureCauseData] = useState<{ name: string; value: number }[]>([]);

  // Función para calcular la fecha de hace 7 días y la fecha actual en formato YYYY-MM-DD (UTC)
  const getDatesForLastWeek = useCallback(() => {
    const today = new Date(); // Fecha actual en zona horaria local
    // Convertir a UTC medianoche del día actual local, para asegurar un rango de 7 días UTC completos.
    const todayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    todayUTC.setUTCHours(0, 0, 0, 0); // Establecer la hora a medianoche UTC

    const lastWeekUTC = new Date(todayUTC);
    lastWeekUTC.setUTCDate(todayUTC.getUTCDate() - 6); // Últimos 7 días incluyendo hoy, en UTC

    const formatDateUTC = (date: Date) => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setDateFrom(formatDateUTC(lastWeekUTC));
    setDateTo(formatDateUTC(todayUTC));
  }, []);

  // Efecto para establecer las fechas por defecto al montar el componente
  useEffect(() => {
    getDatesForLastWeek();
  }, [getDatesForLastWeek]);

  // Función para obtener y procesar los datos de los logs
  const fetchAndProcessLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTrendData([]);
    setFailureCauseData([]);

    if (!dateFrom || !dateTo) {
      console.log('DEBUG: fetchAndProcessLogs skipped, dates not set.');
      setLoading(false);
      return;
    }

    console.log(`DEBUG: Fetching logs for range: ${dateFrom} to ${dateTo}`); // Log para confirmar el rango de fechas

    try {
        const result = await AnalyticService.getAnalytics(dateFrom, dateTo);
        setTrendData(result.dailyTrendData);
        console.log('DEBUG: Trend Data (final):', JSON.stringify(result.dailyTrendData));
        setFailureCauseData(result.failureCauseData);
        console.log('DEBUG: Failure Cause Data (final):', JSON.stringify(result.failureCauseData));
    } catch (err: any) {
      console.error('Error fetching or processing analytics logs:', err);
      setError(err.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  // Efecto para volver a cargar los datos cuando cambian las fechas
  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchAndProcessLogs();
    } else {
      setLoading(false);
    }
  }, [fetchAndProcessLogs, dateFrom, dateTo]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h2>
        <p className="text-indigo-200">Visual insights into access trends and security incidents.</p>
      </div>

      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle>Filter Analytics Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-slate-50" />
            </div>
            <div className="flex items-end gap-2">
              {/* ¡CAMBIO CLAVE! Eliminar el botón "Apply Filters" */}
              {/* <Button onClick={fetchAndProcessLogs} disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Apply Filters
              </Button> */}
              <Button onClick={getDatesForLastWeek} variant="outline">
                <RefreshCcw className="w-4 h-4 mr-2" /> {/* Mantener el icono de refresh si se quiere */}
                Reset to Last 7 Days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && <div className="text-center py-8 text-gray-500">Loading analytics data...</div>}
      {error && <div className="text-center py-8 text-red-500">Error: {error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SecurityTrendsChart data={trendData} />
          {/* ¡CAMBIO CLAVE! Añadir una prop 'key' que cambie con las fechas */}
          <FailureCauseChart key={`${dateFrom}-${dateTo}`} data={failureCauseData} />
        </div>
      )}
    </div>
  );
};

export default AnalyticsTab;
