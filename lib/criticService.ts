import OpenAI from 'openai';

interface UserSettings {
  gear?: {
    guitar?: string[];
    pedals?: string[];
    interface?: string;
    monitors?: string;
    plugins?: string[];
    daw?: string;
  };
}

export interface CriticRequest {
  originalPrompt: string;
  assistantResponse: string;
  userSettings?: UserSettings;
  context: string;
  lessonMode: boolean;
}

export interface CriticResponse {
  finalResponse: string;
  wasCriticAdjusted: boolean;
  criticReason?: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const CRITIC_PROMPT = `You are an internal critic for StudioBrain, an AI assistant for musicians. Your job is to evaluate every assistant response before the user sees it.

✅ Your goals:
- Ensure accuracy and usefulness for all skill levels and setups.
- Never assume gear, DAW, or plugins unless the user explicitly provides them.
- If a suggestion is potentially wrong or specific, reword it to be safe, general, or optionally ask for more user info.
- In educational mode, add a short explanation of *why* something was chosen or adjusted.

🔒 Rules:
1. If the assistant is confidently wrong or too specific, rewrite it or generalize it.
2. Avoid naming brand plugins or hardware unless user confirmed availability.
3. If unsure, say so. Default to broader advice like "a clean amp platform" or "a soft compressor."
4. NEVER hallucinate. It's better to say "it depends on your setup" than to guess wrong.
5. Maintain a helpful and approachable tone.

If the assistant's response is already correct, return it unchanged.
Otherwise, rewrite and tag with: \`(Critic-adjusted)\`

CRITICAL: Only return the final response text. Do not add commentary, explanations, or meta-text about your evaluation process.`;

export async function reviewResponse({
  originalPrompt,
  assistantResponse,
  userSettings,
  context,
  lessonMode,
}: CriticRequest): Promise<CriticResponse> {
  try {
    // Build context about user's gear for the critic
    const userGearContext = userSettings?.gear
      ? [
          userSettings.gear.daw ? `DAW: ${userSettings.gear.daw}` : null,
          userSettings.gear.plugins?.length
            ? `Plugins: ${userSettings.gear.plugins.join(', ')}`
            : null,
          userSettings.gear.guitar?.length
            ? `Guitars: ${userSettings.gear.guitar.join(', ')}`
            : null,
          userSettings.gear.pedals?.length
            ? `Pedals: ${userSettings.gear.pedals.join(', ')}`
            : null,
          userSettings.gear.interface
            ? `Interface: ${userSettings.gear.interface}`
            : null,
          userSettings.gear.monitors
            ? `Monitors: ${userSettings.gear.monitors}`
            : null,
        ]
          .filter(Boolean)
          .join('\n')
      : 'No specific gear information provided';

    const contextInfo = lessonMode
      ? 'Educational mode is ON - explanations should include "why"'
      : 'Quick mode - keep responses concise';

    const criticPrompt = `${CRITIC_PROMPT}

USER CONTEXT:
- Tab: ${context}
- Mode: ${contextInfo}
- User's available gear:
${userGearContext}

ORIGINAL USER QUESTION:
${originalPrompt}

ASSISTANT'S RESPONSE TO REVIEW:
${assistantResponse}

Evaluate the response and return the final version (either unchanged or critic-adjusted):`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: criticPrompt }],
      max_tokens: 800,
      temperature: 0.1, // Low temperature for consistent, conservative criticism
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    const criticResponse =
      completion.choices[0]?.message?.content || assistantResponse;
    const wasCriticAdjusted = criticResponse.includes('(Critic-adjusted)');

    return {
      finalResponse: criticResponse,
      wasCriticAdjusted,
      criticReason: wasCriticAdjusted
        ? 'Response adjusted for accuracy and safety'
        : undefined,
    };
  } catch (error) {
    console.error('Critic service error:', error);
    // If critic fails, return original response to avoid breaking the flow
    return {
      finalResponse: assistantResponse,
      wasCriticAdjusted: false,
      criticReason: 'Critic service unavailable, returned original response',
    };
  }
}

export async function shouldSkipCritic(
  originalPrompt: string,
  assistantResponse: string
): Promise<boolean> {
  // Skip critic for very short responses or simple acknowledgments
  if (assistantResponse.length < 50) return true;

  // Skip critic for responses that are already conservative/general
  const conservativeIndicators = [
    'depends on your setup',
    'it varies',
    'without knowing your gear',
    'generally speaking',
    'in most cases',
  ];

  const hasConservativeLanguage = conservativeIndicators.some(indicator =>
    assistantResponse.toLowerCase().includes(indicator)
  );

  if (hasConservativeLanguage) return true;

  // Skip critic for theory responses that don't mention gear
  const mentionsGear =
    /\b(plugin|pedal|amp|daw|interface|compressor|eq|reverb|delay)\b/i.test(
      assistantResponse
    );
  if (!mentionsGear) return true;

  return false;
}
