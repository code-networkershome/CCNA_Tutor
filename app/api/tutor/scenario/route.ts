import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Available scenario topics
const scenarioTopics = [
    'VLAN Misconfiguration',
    'OSPF Neighbor Issues',
    'STP Loop Prevention',
    'ACL Blocking Traffic',
    'NAT Translation Failure',
    'DHCP Not Working',
    'Trunk Port Issues',
    'Routing Table Problems',
    'DNS Resolution Failure',
    'IP Addressing Conflict',
];

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Return available scenario topics
        return NextResponse.json({
            success: true,
            data: {
                topics: scenarioTopics,
                difficulties: ['beginner', 'intermediate', 'advanced'],
            },
        });
    } catch (error) {
        console.error('Scenario GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch scenarios' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { topic, difficulty = 'intermediate', action, userAnswer, scenarioId, step } = body;

        // If action is 'check', validate the user's answer
        if (action === 'check' && userAnswer) {
            return await checkAnswer(topic, userAnswer, step);
        }

        // If action is 'hint', provide a hint
        if (action === 'hint') {
            return await getHint(topic, step);
        }

        // Generate new scenario
        const scenario = await generateScenario(topic, difficulty);

        return NextResponse.json({
            success: true,
            data: scenario,
        });
    } catch (error) {
        console.error('Scenario POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate scenario' }, { status: 500 });
    }
}

async function generateScenario(topic: string, difficulty: string) {
    const prompt = `Generate a realistic CCNA-level network troubleshooting scenario about "${topic}" at ${difficulty} difficulty.

Return a JSON object with this exact structure:
{
    "id": "unique-id",
    "title": "Brief problem title",
    "difficulty": "${difficulty}",
    "topic": "${topic}",
    "situation": "Detailed description of the network situation and what the user/admin reported as the problem. Include specific symptoms, device names, and IP addresses.",
    "topology": "Brief text description of the network topology (e.g., '2 switches, 1 router, 3 PCs on VLAN 10 and 20')",
    "initialInfo": [
        "List of initial information the technician knows",
        "IP addresses, device names, error messages, etc."
    ],
    "steps": [
        {
            "stepNumber": 1,
            "question": "What would you check first?",
            "options": [
                {"id": "a", "text": "Option A - correct approach", "correct": true, "feedback": "Correct! This is the right first step because..."},
                {"id": "b", "text": "Option B - incorrect approach", "correct": false, "feedback": "Not the best choice. While this might help, you should first..."},
                {"id": "c", "text": "Option C - incorrect approach", "correct": false, "feedback": "This wouldn't help because..."},
                {"id": "d", "text": "Option D - incorrect approach", "correct": false, "feedback": "This is not relevant to this issue because..."}
            ],
            "cliOutput": "show command output that would be seen after correct choice",
            "explanation": "Detailed explanation of what this step reveals"
        },
        {
            "stepNumber": 2,
            "question": "Based on the output, what is the likely issue?",
            "options": [
                {"id": "a", "text": "Option A", "correct": false, "feedback": "Feedback..."},
                {"id": "b", "text": "Option B - correct", "correct": true, "feedback": "Correct! The output shows..."},
                {"id": "c", "text": "Option C", "correct": false, "feedback": "Feedback..."},
                {"id": "d", "text": "Option D", "correct": false, "feedback": "Feedback..."}
            ],
            "cliOutput": "Additional CLI output if needed",
            "explanation": "Explanation of the diagnosis"
        },
        {
            "stepNumber": 3,
            "question": "What command would fix this issue?",
            "options": [
                {"id": "a", "text": "Command option A", "correct": false, "feedback": "Feedback..."},
                {"id": "b", "text": "Command option B", "correct": false, "feedback": "Feedback..."},
                {"id": "c", "text": "Command option C - correct", "correct": true, "feedback": "Correct! This command..."},
                {"id": "d", "text": "Command option D", "correct": false, "feedback": "Feedback..."}
            ],
            "cliOutput": "Verification output showing the fix worked",
            "explanation": "Explanation of why this fix works"
        }
    ],
    "summary": "Summary of the troubleshooting process and key lessons learned",
    "examTip": "A relevant CCNA exam tip related to this scenario"
}

Make the scenario realistic with actual Cisco IOS commands and outputs. The steps should follow logical troubleshooting methodology.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a CCNA network troubleshooting expert. Generate realistic, educational troubleshooting scenarios with actual Cisco IOS commands and outputs. Return valid JSON only.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 4000,
        });

        const responseText = completion.choices[0]?.message?.content || '{}';

        // Parse JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const scenario = JSON.parse(jsonMatch[0]);
            scenario.id = `scenario-${Date.now()}`;
            return scenario;
        }

        throw new Error('Failed to parse scenario');
    } catch (error) {
        console.error('Scenario generation error:', error);
        // Return fallback scenario
        return getFallbackScenario(topic, difficulty);
    }
}

async function checkAnswer(topic: string, userAnswer: string, step: number) {
    // This is handled client-side with the options feedback
    return NextResponse.json({
        success: true,
        data: { message: 'Answer checked client-side' },
    });
}

async function getHint(topic: string, step: number) {
    const prompt = `Give a helpful hint for troubleshooting "${topic}" at step ${step}. Don't give the answer directly, just guide thinking. Keep it to 1-2 sentences.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are a helpful CCNA tutor providing hints without giving direct answers.' },
                { role: 'user', content: prompt },
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 200,
        });

        return NextResponse.json({
            success: true,
            data: { hint: completion.choices[0]?.message?.content || 'Think about the OSI model layers.' },
        });
    } catch (error) {
        return NextResponse.json({
            success: true,
            data: { hint: 'Consider which OSI layer this problem relates to and what commands show that layer\'s status.' },
        });
    }
}

function getFallbackScenario(topic: string, difficulty: string) {
    return {
        id: `scenario-${Date.now()}`,
        title: `${topic} Troubleshooting`,
        difficulty,
        topic,
        situation: `A network administrator reports that connectivity is failing. Users are unable to reach certain resources. The issue started after recent network changes.`,
        topology: '1 Router, 2 Switches, Multiple VLANs',
        initialInfo: [
            'Users on VLAN 10 cannot reach servers on VLAN 20',
            'Ping between VLANs fails',
            'Ping within same VLAN works',
        ],
        steps: [
            {
                stepNumber: 1,
                question: 'What would you check first to troubleshoot inter-VLAN connectivity?',
                options: [
                    { id: 'a', text: 'show ip route', correct: true, feedback: 'Correct! Checking the routing table is the first step for inter-VLAN issues.' },
                    { id: 'b', text: 'show mac address-table', correct: false, feedback: 'This shows Layer 2 info but inter-VLAN is a Layer 3 issue.' },
                    { id: 'c', text: 'show cdp neighbors', correct: false, feedback: 'CDP shows neighboring devices but not routing configuration.' },
                    { id: 'd', text: 'show version', correct: false, feedback: 'This shows device info, not helpful for connectivity issues.' },
                ],
                cliOutput: 'Router#show ip route\nGateway of last resort is not set\n\n     10.0.0.0/24 is subnetted, 1 subnets\nC       10.10.10.0 is directly connected, GigabitEthernet0/0.10\n     192.168.1.0/24 is variably subnetted...',
                explanation: 'The routing table shows what networks the router knows about and how to reach them.',
            },
            {
                stepNumber: 2,
                question: 'The routing table is missing VLAN 20 network. What could cause this?',
                options: [
                    { id: 'a', text: 'STP is blocking the port', correct: false, feedback: 'STP affects Layer 2, and VLAN 10 works.' },
                    { id: 'b', text: 'Sub-interface for VLAN 20 not configured', correct: true, feedback: 'Correct! Missing sub-interface means no Layer 3 interface for that VLAN.' },
                    { id: 'c', text: 'ACL is blocking traffic', correct: false, feedback: 'An ACL would show in config but routing would exist.' },
                    { id: 'd', text: 'DNS is not working', correct: false, feedback: 'DNS issues cause name resolution problems, not routing issues.' },
                ],
                cliOutput: 'Router#show ip interface brief\nInterface                  IP-Address      OK? Method Status                Protocol\nGi0/0                      unassigned      YES unset  up                    up\nGi0/0.10                   10.10.10.1      YES manual up                    up\n(No Gi0/0.20 exists)',
                explanation: 'The missing sub-interface Gi0/0.20 means VLAN 20 has no gateway.',
            },
            {
                stepNumber: 3,
                question: 'What commands would fix this issue?',
                options: [
                    { id: 'a', text: 'interface gi0/0.20, encapsulation dot1q 20, ip address 10.10.20.1 255.255.255.0', correct: true, feedback: 'Correct! This creates the sub-interface with proper VLAN encapsulation and IP.' },
                    { id: 'b', text: 'vlan 20, name VLAN20', correct: false, feedback: 'This creates VLAN on switch, not the router sub-interface.' },
                    { id: 'c', text: 'ip route 10.10.20.0 255.255.255.0 gi0/0', correct: false, feedback: 'Static route won\'t work without a connected interface.' },
                    { id: 'd', text: 'switchport trunk allowed vlan add 20', correct: false, feedback: 'This is a switch command, not router configuration.' },
                ],
                cliOutput: 'Router(config)#interface gi0/0.20\nRouter(config-subif)#encapsulation dot1Q 20\nRouter(config-subif)#ip address 10.10.20.1 255.255.255.0\nRouter(config-subif)#end\nRouter#ping 10.10.20.10\n!!!!!',
                explanation: 'Creating the sub-interface with dot1q encapsulation enables inter-VLAN routing.',
            },
        ],
        summary: 'This scenario demonstrated troubleshooting inter-VLAN routing. The issue was a missing router sub-interface for VLAN 20. Always verify that each VLAN has a corresponding Layer 3 interface (SVI or router sub-interface) for inter-VLAN connectivity.',
        examTip: 'On the CCNA exam, remember that inter-VLAN routing requires either a Layer 3 switch with SVIs or a router with sub-interfaces (router-on-a-stick). Always check "show ip interface brief" to verify interface status.',
    };
}
