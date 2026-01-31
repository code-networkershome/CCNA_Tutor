import { searchKnowledgeByIntent, getKnowledgeNodeByIntent } from '@/lib/db/queries';
import { getCachedTutorResponse, setCachedTutorResponse } from '@/lib/cache';
import { generateChatCompletion } from '@/lib/llm/provider';
import type { TutorResponse } from '@/types';

// Teaching style configurations
const TEACHING_STYLES = {
    direct: `Provide clear, direct explanations. Answer questions comprehensively.`,
    socratic: `Use the Socratic method. Instead of giving direct answers:
- Ask guiding questions to lead the student to discover the answer
- Use "What do you think would happen if...?" type questions
- Give hints rather than solutions
- Encourage critical thinking
- Only reveal the answer if the student specifically asks for it`
};

const DIFFICULTY_LEVELS = {
    eli5: `Explain like I'm 5 years old:
- Use simple everyday analogies (mail delivery, roads, buildings)
- Avoid technical jargon completely
- Break down concepts into very simple terms
- Use visual/relatable examples`,
    beginner: `Beginner-friendly explanation:
- Start with the basics
- Define technical terms when first used
- Use analogies to help understanding
- Be patient and thorough`,
    intermediate: `Intermediate level explanation:
- Assume basic networking knowledge
- Can use technical terms with brief clarification
- Focus on practical applications
- Include CLI examples`,
    expert: `Expert level explanation:
- Assume strong networking background
- Use technical terminology freely
- Focus on edge cases and advanced scenarios
- Include detailed technical specifications`
};

function getTutorSystemPrompt(style: 'direct' | 'socratic' = 'direct', difficulty: string = 'intermediate'): string {
    const styleInstructions = TEACHING_STYLES[style] || TEACHING_STYLES.direct;
    const difficultyInstructions = DIFFICULTY_LEVELS[difficulty as keyof typeof DIFFICULTY_LEVELS] || DIFFICULTY_LEVELS.intermediate;

    return `You are an expert CCNA tutor with deep knowledge of Cisco networking technologies.

CRITICAL INSTRUCTION - READ CAREFULLY:
1. You MUST directly and COMPLETELY answer the user's specific question
2. Provide ACCURATE, DETAILED technical information
3. If a question involves advanced concepts (like router subinterfaces, inter-VLAN routing, etc.), explain them thoroughly
4. DO NOT give vague or incomplete answers - be specific and comprehensive
5. If the question asks about something specific (like "can we create VLANs on a router"), explain:
   - The direct answer (yes/no and why)
   - How it actually works (e.g., router subinterfaces, router-on-a-stick)
   - Specific CLI commands and configuration examples

TEACHING STYLE:
${styleInstructions}

DIFFICULTY LEVEL:
${difficultyInstructions}

RESPONSE GUIDELINES:
- FIRST: Directly answer the user's specific question with complete, accurate information
- Be technically precise - this is for CCNA certification preparation
- Use real-world analogies to explain complex concepts
- Always explain the "why" behind concepts
- Include COMPLETE CLI examples with proper syntax
- For configuration questions, show step-by-step commands

LEARN MODE:
- Provide comprehensive explanations with full technical details
- Include mental models and analogies
- Give COMPLETE CLI examples (not just partial commands)
- Explain each command's purpose
- Mention common mistakes and how to avoid them

EXAM MODE:
- Keep answers concise but still accurate and complete
- Highlight what Cisco typically tests
- Mention common wrong answer traps

IMPORTANT - CLI EXAMPLES:
When providing CLI examples, include COMPLETE configurations like:
- Full command syntax
- Required and optional parameters
- Example values that make sense
- Step-by-step configuration flow

RESPONSE FORMAT (JSON):
{
  "answer": "A COMPLETE, DIRECT answer to the user's question - this is the most important field. Be thorough!",
  "concept": "Core concept title",
  "mentalModel": "Visual/conceptual framework to help understand",
  "wireLogic": "Detailed technical explanation of how it works at the network level",
  "cliExample": "COMPLETE CLI commands with proper syntax and realistic values - show full configuration flow",
  "commonMistakes": ["Array of common mistakes to avoid - be specific"],
  "examNote": "Exam-specific tips (optional)",
  "relatedTopics": ["Related topics to explore"],
  "followUpQuestions": ["Questions to deepen understanding"]
}`;
}

export interface TutorQueryOptions {
    style?: 'direct' | 'socratic';
    difficulty?: 'eli5' | 'beginner' | 'intermediate' | 'expert';
}

export async function answerQuery(
    query: string,
    module: string = 'ccna',
    mode: 'learn' | 'exam' = 'learn',
    options: TutorQueryOptions = {}
): Promise<TutorResponse> {
    const startTime = Date.now();
    const { style = 'direct', difficulty = 'intermediate' } = options;

    // 1. Check cache first (skip cache for socratic mode as responses should be unique)
    if (style !== 'socratic') {
        const cached = await getCachedTutorResponse(query, module);
        if (cached) {
            return {
                ...(cached as TutorResponse),
                source: 'cache',
                latency: Date.now() - startTime,
            };
        }
    }

    // 2. For socratic mode, always use LLM
    if (style === 'socratic') {
        return await generateSocraticResponse(query, module, mode, difficulty, startTime);
    }

    // 3. Search database for matching knowledge nodes
    const nodes = await searchKnowledgeByIntent(query, module);

    if (nodes.length > 0) {
        const bestMatch = nodes[0];
        const response: TutorResponse = {
            topic: bestMatch.topic,
            intent: bestMatch.intent,
            explanation: {
                concept: bestMatch.coreExplanation,
                mentalModel: bestMatch.mentalModel,
                wireLogic: bestMatch.wireLogic,
                cliExample: difficulty === 'eli5' ? undefined : bestMatch.cliExample || undefined,
            },
            commonMistakes: bestMatch.commonMistakes || [],
            examNote: mode === 'exam' ? bestMatch.examNote || undefined : undefined,
            mode,
            source: 'database',
            latency: Date.now() - startTime,
        };

        // Cache the response
        await setCachedTutorResponse(query, module, response);

        return response;
    }

    // 4. Try to find by exact intent match
    const exactMatch = await getKnowledgeNodeByIntent(query, module);
    if (exactMatch) {
        const response: TutorResponse = {
            topic: exactMatch.topic,
            intent: exactMatch.intent,
            explanation: {
                concept: exactMatch.coreExplanation,
                mentalModel: exactMatch.mentalModel,
                wireLogic: exactMatch.wireLogic,
                cliExample: difficulty === 'eli5' ? undefined : exactMatch.cliExample || undefined,
            },
            commonMistakes: exactMatch.commonMistakes || [],
            examNote: mode === 'exam' ? exactMatch.examNote || undefined : undefined,
            mode,
            source: 'database',
            latency: Date.now() - startTime,
        };

        await setCachedTutorResponse(query, module, response);

        return response;
    }

    // 5. Fall back to LLM
    return await generateLLMResponse(query, module, mode, style, difficulty, startTime);
}

async function generateSocraticResponse(
    query: string,
    module: string,
    mode: 'learn' | 'exam',
    difficulty: string,
    startTime: number
): Promise<TutorResponse> {
    try {
        const systemPrompt = getTutorSystemPrompt('socratic', difficulty);
        const userPrompt = `Student's question: ${query}

Use the Socratic method to guide the student to discover the answer themselves.
Ask thought-provoking questions rather than giving direct answers.
Mode: ${mode.toUpperCase()}`;

        const llmResponse = await generateChatCompletion(systemPrompt, userPrompt, { temperature: 0.8 });
        const parsed = JSON.parse(llmResponse);

        return {
            topic: parsed.concept || 'General',
            intent: query,
            explanation: {
                concept: parsed.answer || parsed.concept,
                mentalModel: parsed.mentalModel || '',
                wireLogic: parsed.wireLogic || '',
                cliExample: difficulty === 'eli5' ? undefined : parsed.cliExample,
            },
            commonMistakes: parsed.commonMistakes || [],
            examNote: mode === 'exam' ? parsed.examNote : undefined,
            followUpQuestions: parsed.followUpQuestions || [],
            mode,
            source: 'llm',
            latency: Date.now() - startTime,
        };
    } catch (error) {
        console.error('Socratic response error:', error);
        return getFallbackResponse(query, mode, startTime);
    }
}

async function generateLLMResponse(
    query: string,
    module: string,
    mode: 'learn' | 'exam',
    style: 'direct' | 'socratic',
    difficulty: string,
    startTime: number
): Promise<TutorResponse> {
    try {
        const systemPrompt = getTutorSystemPrompt(style, difficulty);
        const modeInstruction = mode === 'exam'
            ? 'Focus on exam-relevant points. Be concise and highlight what Cisco tests.'
            : 'Provide a comprehensive explanation with examples and analogies.';

        const userPrompt = `USER'S QUESTION: "${query}"

IMPORTANT INSTRUCTIONS:
1. Answer THIS specific question DIRECTLY and COMPLETELY
2. Do NOT give vague or incomplete answers
3. If the question involves configuration, provide FULL CLI examples with real values
4. If the question asks "can we do X" - explain YES or NO, WHY, and HOW to do it
5. For advanced topics, explain the underlying concepts fully

Mode: ${mode.toUpperCase()}
Difficulty: ${difficulty.toUpperCase()}
${modeInstruction}

Provide a thorough, technically accurate answer that completely addresses what the user asked.
Include specific examples and commands where relevant.`;

        const llmResponse = await generateChatCompletion(systemPrompt, userPrompt, { temperature: 0.7 });
        const parsed = JSON.parse(llmResponse);

        const response: TutorResponse = {
            topic: parsed.concept || 'General',
            intent: query,
            explanation: {
                concept: parsed.answer || parsed.concept,
                mentalModel: parsed.mentalModel || '',
                wireLogic: parsed.wireLogic || '',
                cliExample: difficulty === 'eli5' ? undefined : parsed.cliExample,
            },
            commonMistakes: parsed.commonMistakes || [],
            examNote: mode === 'exam' ? parsed.examNote : undefined,
            followUpQuestions: parsed.followUpQuestions || [],
            mode,
            source: 'llm',
            latency: Date.now() - startTime,
        };

        // Cache LLM response (shorter TTL)
        await setCachedTutorResponse(query, module, response);

        return response;
    } catch (error) {
        console.error('LLM fallback error:', error);
        return getFallbackResponse(query, mode, startTime);
    }
}

function getFallbackResponse(query: string, mode: 'learn' | 'exam', startTime: number): TutorResponse {
    return {
        topic: 'Unknown',
        intent: query,
        explanation: {
            concept: 'I apologize, but I could not find information about this topic in the current knowledge base. Please try rephrasing your question or check the topic list for available content.',
            mentalModel: '',
            wireLogic: '',
        },
        commonMistakes: [],
        mode,
        source: 'database',
        latency: Date.now() - startTime,
    };
}

export async function classifyIntent(query: string): Promise<{
    topic: string;
    subtopic?: string;
    type: 'definition' | 'how_it_works' | 'configuration' | 'troubleshooting' | 'comparison' | 'exam';
}> {
    // Simple keyword-based classification
    const lowerQuery = query.toLowerCase();

    let type: 'definition' | 'how_it_works' | 'configuration' | 'troubleshooting' | 'comparison' | 'exam' = 'definition';

    if (lowerQuery.includes('how') || lowerQuery.includes('why') || lowerQuery.includes('work')) {
        type = 'how_it_works';
    } else if (lowerQuery.includes('configure') || lowerQuery.includes('setup') || lowerQuery.includes('command')) {
        type = 'configuration';
    } else if (lowerQuery.includes('troubleshoot') || lowerQuery.includes('problem') || lowerQuery.includes('fix')) {
        type = 'troubleshooting';
    } else if (lowerQuery.includes('vs') || lowerQuery.includes('versus') || lowerQuery.includes('difference')) {
        type = 'comparison';
    } else if (lowerQuery.includes('exam') || lowerQuery.includes('test') || lowerQuery.includes('certification')) {
        type = 'exam';
    }

    // Extract topic from query
    const topic = extractTopic(query);

    return { topic, type };
}

function extractTopic(query: string): string {
    // Common CCNA topics
    const topics = [
        'VLAN', 'STP', 'OSPF', 'EIGRP', 'BGP', 'ACL', 'NAT', 'DHCP', 'DNS',
        'Subnetting', 'IPv4', 'IPv6', 'Routing', 'Switching', 'ARP', 'MAC',
        'TCP', 'UDP', 'OSI', 'Ethernet', 'Wireless', 'Security', 'VPN',
        'QoS', 'SDN', 'Automation', 'Cloud', 'WAN', 'LAN'
    ];

    const lowerQuery = query.toLowerCase();

    for (const topic of topics) {
        if (lowerQuery.includes(topic.toLowerCase())) {
            return topic;
        }
    }

    return 'General Networking';
}
