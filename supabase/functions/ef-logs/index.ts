import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, type PostgrestError as _PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Edge Function "ef-logs" started!');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with, x-request-id',
  'Access-Control-Max-Age': '86400',
};

interface AccessLogFilter {
  dateFrom?: string;
  dateTo?: string;
  selectedLogDecisionId?: string;
  selectedLogUserId?: string;
  selectedLogZoneId?: string;
  generalSearchTerm?: string;
}

interface DisplayLog {
  id: string;
  timestamp: string;
  userId?: string | null;
  userName: string;
  userEmail: string;
  userRole: string;
  userStatus: string;
  zoneName: string;
  status: string;
  profilePictureUrl: string | null;
}

const NA_VALUE = 'N/A';
const SELECT_ALL_VALUE = 'all';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const filter: AccessLogFilter = await req.json();

    // Query the view with filters
    let query = supabase.from('access_logs_view').select('*');

    // Apply date filters
    if (filter.dateFrom) {
      query = query.gte('timestamp', filter.dateFrom);
    }
    if (filter.dateTo) {
      query = query.lte('timestamp', filter.dateTo);
    }
    // Apply decision filter
    if (filter.selectedLogDecisionId && filter.selectedLogDecisionId !== SELECT_ALL_VALUE) {
      query = query.ilike('decision', `%${filter.selectedLogDecisionId}%`);
    }
    // Apply user filter
    if (filter.selectedLogUserId && filter.selectedLogUserId !== SELECT_ALL_VALUE) {
      query = query.eq('user_id', filter.selectedLogUserId);
    }
    // Apply zone filter
    if (filter.selectedLogZoneId && filter.selectedLogZoneId !== SELECT_ALL_VALUE) {
      query = query.eq('requested_zone_id', filter.selectedLogZoneId);
    }
    // Order by timestamp descending
    query = query.order('timestamp', { ascending: false });

    // Execute the single query
    const { data: rawLogs, error: logsError } = await query;
    if (logsError) {
      console.error('Database Query Error:', logsError);
      throw new Error(`Database error: ${logsError.message}`);
    }
    if (!rawLogs || rawLogs.length === 0) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    // Process the logs with all data available
    const lowerCaseSearchTerm = filter.generalSearchTerm?.toLowerCase() || '';
    const filterBySearch = (log: DisplayLog) => {
      if (!filter.generalSearchTerm) return true;
      return (
        (log.userName?.toLowerCase().includes(lowerCaseSearchTerm) ?? false) ||
        (log.userEmail?.toLowerCase().includes(lowerCaseSearchTerm) ?? false) ||
        (log.userRole?.toLowerCase().includes(lowerCaseSearchTerm) ?? false) ||
        (log.userStatus?.toLowerCase().includes(lowerCaseSearchTerm) ?? false) ||
        (log.zoneName?.toLowerCase().includes(lowerCaseSearchTerm) ?? false) ||
        (log.status?.toLowerCase().includes(lowerCaseSearchTerm) ?? false)
      );
    };
    const processedLogs: DisplayLog[] = rawLogs.map((log) => {
      const userName = log.full_name || log.user_id || NA_VALUE;
      const userEmail = log.email || NA_VALUE;
      const userRole = log.role_name || NA_VALUE;
      const userStatus = log.status_name || NA_VALUE;
      const zoneName = log.zone_name || NA_VALUE;
      const status = log.decision;
      const profilePictureUrl = log.profile_picture_url || null;
      return {
        id: log.id,
        timestamp: new Date(log.timestamp).toLocaleString(),
        userId: log.user_id,
        userName,
        userEmail,
        userRole,
        userStatus,
        zoneName,
        status,
        profilePictureUrl,
      };
    });
    // Apply search filter
    const filteredLogs = processedLogs.filter(filterBySearch);
    return new Response(
      JSON.stringify({
        success: true,
        data: filteredLogs,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error in ef-logs edge function:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
