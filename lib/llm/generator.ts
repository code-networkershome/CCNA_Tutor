import { generateCompletion, LLMProvider } from './provider';
import { llmBatchResponseSchema, LLMKnowledgeNode } from './schemas';
import { createKnowledgeNode, updateGenerationJob, saveKnowledgeVersion } from '@/lib/db/queries';
import { createAuditLog } from '@/lib/db/queries';

const SYSTEM_PROMPT = `You are an expert CCNA instructor creating structured educational content.

TEACHING FRAMEWORK (MANDATORY ORDER):
1. Concept definition - Clear, precise definition
2. Mental model - Visual or conceptual framework for understanding
3. On-the-wire logic - What actually happens at the packet/frame level
4. Configuration/CLI relevance - Practical commands when applicable

PEDAGOGY RULES:
- CCNA scope only - Do not include CCNP-level depth
- No production shortcuts - Teach best practices
- No memorization-only content - Focus on understanding
- Explain failures before successes
- Use device-thinking perspective (switch/router POV)

OUTPUT RULES:
- Return valid JSON only
- Be precise and technically accurate
- Include common mistakes students make
- Add exam-specific notes where relevant

You must return a JSON object with this exact structure:
{
  "nodes": [
    {
      "topic": "string",
      "subtopic": "string (optional)",
      "intent": "string - what question this answers",
      "difficulty": "beginner|intermediate|advanced",
      "prerequisites": ["array of prerequisite topics"],
      "coreExplanation": "string - main explanation following the teaching framework",
      "mentalModel": "string - conceptual framework for understanding",
      "wireLogic": "string - what happens at packet/frame level",
      "cliExample": "string (optional) - relevant CLI commands",
      "commonMistakes": ["array of common mistakes"],
      "examNote": "string (optional) - exam-specific information"
    }
  ],
  "metadata": {
    "generatedAt": "ISO date string",
    "model": "model name",
    "tokensUsed": number
  }
}`;

interface GenerationOptions {
    jobId: string;
    module: 'ccna' | 'netsec' | 'ccnp' | 'aws';
    topics: string[];
    provider: LLMProvider;
    model: string;
    temperature: number;
    userId: string;
}

export async function runGenerationJob(options: GenerationOptions): Promise<void> {
    const { jobId, module, topics, provider, model, temperature, userId } = options;

    // Mark job as running
    await updateGenerationJob(jobId, {
        status: 'running',
        startedAt: new Date(),
    });

    const errors: Array<{ topic: string; error: string }> = [];
    let completedNodes = 0;
    let failedNodes = 0;

    for (const topic of topics) {
        try {
            const userPrompt = `Generate comprehensive CCNA knowledge nodes for the topic: "${topic}"

For this topic, create multiple knowledge nodes covering:
- Core concepts and definitions
- How it works (protocol behavior, packet flow)
- Configuration examples
- Troubleshooting common issues
- Key exam points

Each node should answer a specific question a student might ask.
Generate 3-5 nodes for this topic.`;

            const response = await generateCompletion(
                SYSTEM_PROMPT,
                userPrompt,
                { provider, model, temperature }
            );

            const parsed = JSON.parse(response);
            const validated = llmBatchResponseSchema.parse(parsed);

            for (const node of validated.nodes) {
                const created = await createKnowledgeNode({
                    module,
                    topic: node.topic,
                    subtopic: node.subtopic,
                    intent: node.intent,
                    difficulty: node.difficulty,
                    prerequisites: node.prerequisites,
                    coreExplanation: node.coreExplanation,
                    mentalModel: node.mentalModel,
                    wireLogic: node.wireLogic,
                    cliExample: node.cliExample,
                    commonMistakes: node.commonMistakes,
                    examNote: node.examNote,
                    status: 'draft',
                    generatedBy: 'llm',
                });

                // Save initial version
                await saveKnowledgeVersion(created.id, 1, node, userId, 'Initial LLM generation');

                completedNodes++;
            }

            // Update progress
            await updateGenerationJob(jobId, {
                completedNodes,
                failedNodes,
            });

        } catch (error) {
            console.error(`Error generating nodes for topic ${topic}:`, error);
            errors.push({
                topic,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            failedNodes++;

            await updateGenerationJob(jobId, {
                completedNodes,
                failedNodes,
                errorLog: errors,
            });
        }
    }

    // Mark job as completed
    await updateGenerationJob(jobId, {
        status: errors.length === topics.length ? 'failed' : 'completed',
        completedAt: new Date(),
        completedNodes,
        failedNodes,
        errorLog: errors,
    });

    // Audit log
    await createAuditLog({
        userId,
        action: 'generation_completed',
        entityType: 'generation_job',
        entityId: jobId,
        newData: { completedNodes, failedNodes, topics },
    });
}

export async function estimateJobCost(
    topics: string[],
    model: string = 'llama-3.1-8b-instant'
): Promise<{ estimatedCost: number; estimatedTokens: number }> {
    // Estimate ~2000 tokens per topic (input + output)
    const tokensPerTopic = 2000;
    const estimatedTokens = topics.length * tokensPerTopic;
    // Groq is essentially free, so cost is minimal
    const estimatedCost = estimatedTokens * 0.0001; // $0.0001 per 1K tokens estimate

    return { estimatedCost, estimatedTokens };
}
