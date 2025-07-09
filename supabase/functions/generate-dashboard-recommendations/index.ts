// Importar las dependencias necesarias para una Edge Function
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

console.log('Edge Function "generate-dashboard-recommendations" started!');

// Interfaz para la estructura de datos que esperamos del frontend
interface DashboardDataPayload {
  riskScore: { score: number; status: string };
  kpiData: {
    totalUsers: number;
    activeZones: number;
    accessesToday: number;
    activeAlerts: number;
    anomalousAttempts: number;
    successRate: number;
  };
  suspiciousUsers: { id: string; name: string; reason: string; photoUrl?: string | null }[]; // Incluir 'name' y 'photoUrl'
}

// Interfaz para la estructura de la recomendación que devolveremos
interface AIRecommendation {
  id: string;
  action: string;
  details: string;
}

// Función auxiliar para manejar errores de tipo
interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return typeof error === 'object' && error !== null && 'message' in error && typeof (error as ErrorWithMessage).message === 'string';
}

serve(async (req: Request): Promise<Response> => {
  // Manejar peticiones OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    console.log('DEBUG: Handling OPTIONS preflight request for generate-dashboard-recommendations');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, x-request-id',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    const { riskScore, kpiData, suspiciousUsers }: DashboardDataPayload = await req.json();

    // Validar que los datos esenciales estén presentes
    if (!riskScore || !kpiData) {
      return new Response(JSON.stringify({ error: 'Missing required dashboard data in request body.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables. AI suggestions will not be generated.');
      return new Response(JSON.stringify({ error: 'AI suggestion failed: API Key missing.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // ¡CAMBIO CLAVE! Usar 'const' en lugar de 'let'
    const prompt = `You are an AI security analyst. Based on the following access control system dashboard metrics and suspicious activities, generate 3 to 5 concise and actionable security recommendations. Focus on proactive measures and areas of concern.

Current Dashboard Metrics (Today):
- Overall Risk Score: ${riskScore.score} (${riskScore.status} risk)
- Total Users: ${kpiData.totalUsers}
- Active Zones: ${kpiData.activeZones}
- Accesses Today: ${kpiData.accessesToday}
- Active Alerts: ${kpiData.activeAlerts}
- Anomalous Attempts (AI): ${kpiData.anomalousAttempts}
- Success Rate: ${kpiData.successRate}%

Suspicious Activities Detected (Today):
${
  suspiciousUsers.length > 0
    ? suspiciousUsers.map((u) => `- User: ${u.name} (ID: ${u.id}), Reason: ${u.reason}`).join('\n')
    : '- No suspicious activities detected.'
}

Provide the recommendations in a JSON array format, where each item has an "id" (a unique string, e.g., a UUID), "action" (a concise title, max 10 words), and "details" (a brief explanation of the action, max 30 words). Example:
[
  { "id": "uuid1", "action": "Review User X Access", "details": "Investigate recent failed attempts by User X for unusual patterns." },
  { "id": "uuid2", "action": "Update Zone Y Policy", "details": "Consider tightening access rules for Zone Y due to high denial rates." }
]
`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json', // Solicitar respuesta en JSON
        responseSchema: {
          // Definir el esquema JSON esperado
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              id: { type: 'STRING' },
              action: { type: 'STRING' },
              details: { type: 'STRING' },
            },
            required: ['id', 'action', 'details'],
          },
        },
      },
    };

    console.log('DEBUG: Sending prompt to Gemini API...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log('DEBUG: Gemini API raw response:', JSON.stringify(result));

    if (
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
    ) {
      const jsonResponse = result.candidates[0].content.parts[0].text;
      const recommendations: AIRecommendation[] = JSON.parse(jsonResponse);
      console.log('DEBUG: AI Recommendations generated:', recommendations);

      const finalRecommendations = recommendations.map((rec) => ({
        ...rec,
        id: rec.id || crypto.randomUUID(),
      }));

      return new Response(JSON.stringify(finalRecommendations), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else {
      console.warn('AI did not return valid recommendations. Response:', JSON.stringify(result));
      return new Response(JSON.stringify({ error: 'No AI recommendations available or invalid format.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  } catch (catchError: unknown) {
    let errorMessage = 'An unexpected error occurred in the Edge Function.';

    if (isErrorWithMessage(catchError)) {
      errorMessage = catchError.message;
    } else if (typeof catchError === 'string') {
      errorMessage = catchError;
    }

    console.error('🔥 CRITICAL ERROR in generate-dashboard-recommendations Edge Function:', catchError);

    return new Response(JSON.stringify({ error: `Internal server error: ${errorMessage}` }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
