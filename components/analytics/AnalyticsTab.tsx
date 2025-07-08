'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import SecurityTrendsChart from './SecurityTrendsChart';
import FailureCauseChart from './FailureCauseChart';

// Supabase Client Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

// Definir un tipo para los datos brutos de logs que necesitamos
type LogData = {
  timestamp: string;
  decision: 'access_granted' | 'access_denied' | 'error' | 'unknown';
  reason: string | null;
};

// ¡CAMBIO CLAVE! Nuevo tipo para los datos de tendencia diarios
type DailyTrendEntry = {
  name: string;
  success: number;
  failed: number;
};

const AnalyticsTab: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [trendData, setTrendData] = useState<DailyTrendEntry[]>([]); // Usar el nuevo tipo aquí
  const [failureCauseData, setFailureCauseData] = useState<{ name: string; value: number }[]>([]);

  // Función para calcular la fecha de hace 7 días y la fecha actual en formato YYYY-MM-DD
  const getDatesForLastWeek = useCallback(() => {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 6); // Últimos 7 días incluyendo hoy

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setDateFrom(formatDate(lastWeek));
    setDateTo(formatDate(today));
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
      console.log('DEBUG: Dates not set, skipping fetch.');
      setLoading(false);
      return;
    }

    try {
      const { data: logs, error: logsError } = await supabase
        .from('logs')
        .select(`timestamp, decision, reason`)
        .gte('timestamp', `${dateFrom}T00:00:00.000Z`) // Incluir el inicio del día
        .lte('timestamp', `${dateTo}T23:59:59.999Z`) // Incluir el final del día
        .order('timestamp', { ascending: true });

      if (logsError) throw logsError;

      console.log('DEBUG: Raw logs fetched:', logs);

      // --- Procesar datos para Security Trends Chart ---
      // ¡CAMBIO CLAVE! Usar el nuevo tipo DailyTrendEntry para el Record
      const dailyData: Record<string, DailyTrendEntry> = {};
      const datesInRange: Date[] = [];
      let currentDate = new Date(dateFrom);
      const endDate = new Date(dateTo);

      while (currentDate <= endDate) {
        const dayName = currentDate.toLocaleString('en-US', { weekday: 'short' });
        const dateKey = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
        dailyData[dateKey] = { success: 0, failed: 0, name: dayName }; // Ahora 'name' es una propiedad conocida
        datesInRange.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      logs.forEach((log) => {
        const logDate = new Date(log.timestamp);
        const dateKey = logDate.toISOString().split('T')[0];
        const dayName = logDate.toLocaleString('en-US', { weekday: 'short' });

        if (dailyData[dateKey]) {
          if (log.decision === 'access_granted') {
            dailyData[dateKey].success++;
          } else if (log.decision === 'access_denied' || log.decision === 'error') {
            dailyData[dateKey].failed++;
          }
        } else {
          // Esto puede ocurrir si un log está fuera del rango de fechas inicial,
          // o si hay un día sin logs y no fue inicializado correctamente.
          // En este caso, lo inicializamos.
          dailyData[dateKey] = { success: 0, failed: 0, name: dayName };
          if (log.decision === 'access_granted') {
            dailyData[dateKey].success++;
          } else if (log.decision === 'access_denied' || log.decision === 'error') {
            dailyData[dateKey].failed++;
          }
        }
      });

      // Asegurarse de que el orden sea correcto y que todos los días estén presentes
      const finalTrendData = datesInRange.map((date) => {
        const dateKey = date.toISOString().split('T')[0];
        const dayName = date.toLocaleString('en-US', { weekday: 'short' });
        return {
          name: dayName,
          success: dailyData[dateKey]?.success || 0,
          failed: dailyData[dateKey]?.failed || 0,
        };
      });
      setTrendData(finalTrendData);
      console.log('DEBUG: Trend Data:', finalTrendData);

      // --- Procesar datos para Failure Cause Chart ---
      const failureCauses: { [key: string]: number } = {};
      logs.forEach((log) => {
        if ((log.decision === 'access_denied' || log.decision === 'error') && log.reason) {
          const reason = log.reason.split(':')[0].trim(); // Tomar solo la primera parte de la razón
          failureCauses[reason] = (failureCauses[reason] || 0) + 1;
        }
      });

      const finalFailureCauseData = Object.entries(failureCauses)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Ordenar de mayor a menor
      setFailureCauseData(finalFailureCauseData);
      console.log('DEBUG: Failure Cause Data:', finalFailureCauseData);
    } catch (err: any) {
      console.error('Error fetching or processing analytics logs:', err);
      setError(err.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, supabase]);

  // Efecto para volver a cargar los datos cuando cambian las fechas
  useEffect(() => {
    fetchAndProcessLogs();
  }, [fetchAndProcessLogs]);

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
              <Button onClick={fetchAndProcessLogs} disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
              <Button onClick={getDatesForLastWeek} variant="outline">
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
          <FailureCauseChart data={failureCauseData} />
        </div>
      )}
    </div>
  );
};

export default AnalyticsTab;
