import Groq from 'groq-sdk';

export type LLMProvider = 'groq';

interface LLMConfig {
    provider: LLMProvider;
    model: string;
    temperature: number;
    maxTokens?: number;
}

// Create Groq client only if API key is available
const groq = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

function getGroqClient(): Groq {
    if (!groq) {
        throw new Error('Groq API key not configured. Set GROQ_API_KEY environment variable.');
    }
    return groq;
}

export async function generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    config: LLMConfig
): Promise<string> {
    const client = getGroqClient();
    const response = await client.chat.completions.create({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens || 4096,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
    });

    return response.choices[0]?.message?.content || '';
}

export async function generateChatCompletion(
    systemPrompt: string,
    userPrompt: string,
    config: Partial<LLMConfig> = {}
): Promise<string> {
    const finalConfig: LLMConfig = {
        provider: 'groq',
        model: config.model || 'llama-3.1-8b-instant',
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens || 4096,
    };

    const client = getGroqClient();

    // Enhance system prompt to ensure JSON output
    const jsonSystemPrompt = systemPrompt + '\n\nIMPORTANT: You MUST respond ONLY with valid JSON. No additional text before or after the JSON object.';

    const response = await client.chat.completions.create({
        model: finalConfig.model,
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: jsonSystemPrompt },
            { role: 'user', content: userPrompt },
        ],
    });

    const content = response.choices[0]?.message?.content || '{}';

    // Validate it's parseable JSON
    try {
        JSON.parse(content);
        return content;
    } catch (e) {
        console.error('LLM returned invalid JSON:', content.substring(0, 200));
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return jsonMatch[0];
        }
        throw new Error('LLM did not return valid JSON');
    }
}

export function estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
}
