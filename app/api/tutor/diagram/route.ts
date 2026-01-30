import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Predefined diagram templates for common topics
const DIAGRAM_TEMPLATES: Record<string, string> = {
    'osi-model': `graph TD
    A[Application Layer 7] --> B[Presentation Layer 6]
    B --> C[Session Layer 5]
    C --> D[Transport Layer 4]
    D --> E[Network Layer 3]
    E --> F[Data Link Layer 2]
    F --> G[Physical Layer 1]
    
    style A fill:#ff6b6b
    style B fill:#ffa502
    style C fill:#ffd93d
    style D fill:#6bcb77
    style E fill:#4d96ff
    style F fill:#845ec2
    style G fill:#d65db1`,

    'tcp-handshake': `sequenceDiagram
    participant C as Client
    participant S as Server
    C->>S: SYN (seq=x)
    Note over C,S: Step 1: Client initiates
    S->>C: SYN-ACK (seq=y, ack=x+1)
    Note over C,S: Step 2: Server responds
    C->>S: ACK (ack=y+1)
    Note over C,S: Step 3: Connection established`,

    'vlan-trunking': `graph LR
    subgraph Switch1
        direction TB
        P1[Port 1<br/>VLAN 10]
        P2[Port 2<br/>VLAN 20]
        T1[Trunk Port]
    end
    
    subgraph Switch2
        direction TB
        P3[Port 1<br/>VLAN 10]
        P4[Port 2<br/>VLAN 20]
        T2[Trunk Port]
    end
    
    T1 <-->|802.1Q Tagged<br/>VLAN 10,20| T2
    
    PC1[PC A] --> P1
    PC2[PC B] --> P2
    PC3[PC C] --> P3
    PC4[PC D] --> P4
    
    style T1 fill:#4d96ff
    style T2 fill:#4d96ff`,

    'stp-topology': `graph TD
    subgraph "Spanning Tree Topology"
        RB[Root Bridge<br/>Priority: 4096] 
        S1[Switch 1<br/>Priority: 32768]
        S2[Switch 2<br/>Priority: 32768]
        S3[Switch 3<br/>Priority: 32768]
        
        RB -->|RP| S1
        RB -->|RP| S2
        S1 -->|DP| S3
        S2 -.->|Blocked| S3
    end
    
    style RB fill:#ffd93d
    style S1 fill:#6bcb77
    style S2 fill:#6bcb77
    style S3 fill:#6bcb77`,

    'ospf-areas': `graph TD
    subgraph Area 0 - Backbone
        ABR1[ABR 1]
        ABR2[ABR 2]
        R0[Internal Router]
    end
    
    subgraph Area 1
        R1[Router 1]
        R2[Router 2]
    end
    
    subgraph Area 2
        R3[Router 3]
        R4[Router 4]
    end
    
    ABR1 --> R1
    ABR1 --> R2
    ABR2 --> R3
    ABR2 --> R4
    ABR1 --- R0
    ABR2 --- R0
    
    style ABR1 fill:#ff6b6b
    style ABR2 fill:#ff6b6b`,

    'nat-process': `sequenceDiagram
    participant PC as Internal Host<br/>192.168.1.10
    participant NAT as NAT Router
    participant WEB as Web Server<br/>8.8.8.8
    
    PC->>NAT: Src: 192.168.1.10:5001<br/>Dst: 8.8.8.8:80
    Note over NAT: Translate Source:<br/>192.168.1.10 → 203.0.113.5
    NAT->>WEB: Src: 203.0.113.5:40001<br/>Dst: 8.8.8.8:80
    WEB->>NAT: Src: 8.8.8.8:80<br/>Dst: 203.0.113.5:40001
    Note over NAT: Translate Dest:<br/>203.0.113.5 → 192.168.1.10
    NAT->>PC: Src: 8.8.8.8:80<br/>Dst: 192.168.1.10:5001`,

    'subnetting': `graph TD
    subgraph "192.168.1.0/24 Subnetting"
        NET[Network: 192.168.1.0/24<br/>256 hosts]
        
        S1[Subnet 1<br/>192.168.1.0/26<br/>64 hosts]
        S2[Subnet 2<br/>192.168.1.64/26<br/>64 hosts]
        S3[Subnet 3<br/>192.168.1.128/26<br/>64 hosts]
        S4[Subnet 4<br/>192.168.1.192/26<br/>64 hosts]
        
        NET --> S1
        NET --> S2
        NET --> S3
        NET --> S4
    end
    
    style NET fill:#4d96ff
    style S1 fill:#6bcb77
    style S2 fill:#6bcb77
    style S3 fill:#6bcb77
    style S4 fill:#6bcb77`,
};

const AVAILABLE_DIAGRAMS = [
    { id: 'osi-model', name: 'OSI Model', category: 'Fundamentals' },
    { id: 'tcp-handshake', name: 'TCP 3-Way Handshake', category: 'Protocols' },
    { id: 'vlan-trunking', name: 'VLAN Trunking', category: 'Switching' },
    { id: 'stp-topology', name: 'STP Topology', category: 'Switching' },
    { id: 'ospf-areas', name: 'OSPF Areas', category: 'Routing' },
    { id: 'nat-process', name: 'NAT Process', category: 'Services' },
    { id: 'subnetting', name: 'Subnetting Example', category: 'IP Addressing' },
];

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Return list of available diagrams
        return NextResponse.json({
            success: true,
            data: {
                diagrams: AVAILABLE_DIAGRAMS,
                categories: [...new Set(AVAILABLE_DIAGRAMS.map(d => d.category))],
            },
        });
    } catch (error) {
        console.error('Diagram GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch diagrams' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { topic, type = 'flowchart', action } = body;

        // If requesting a predefined diagram
        if (action === 'get' && topic) {
            const diagram = DIAGRAM_TEMPLATES[topic];
            if (diagram) {
                return NextResponse.json({
                    success: true,
                    data: {
                        mermaid: diagram,
                        topic,
                        type: 'predefined',
                    },
                });
            }
        }

        // Generate custom diagram using LLM
        if (action === 'generate' && topic) {
            const diagram = await generateDiagram(topic, type);
            return NextResponse.json({
                success: true,
                data: {
                    mermaid: diagram,
                    topic,
                    type: 'generated',
                },
            });
        }

        return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    } catch (error) {
        console.error('Diagram POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate diagram' }, { status: 500 });
    }
}

async function generateDiagram(topic: string, type: string): Promise<string> {
    try {
        const typeExamples: Record<string, string> = {
            flowchart: 'graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action]\n    B -->|No| D[Other Action]',
            sequence: 'sequenceDiagram\n    A->>B: Message\n    B->>A: Response',
            mindmap: 'mindmap\n  root((Topic))\n    Branch1\n      Leaf1\n      Leaf2\n    Branch2',
        };

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are a diagram generator for CCNA networking concepts.
Generate Mermaid.js diagrams that clearly visualize networking concepts.

Rules:
- Output ONLY the Mermaid code, nothing else
- Use proper Mermaid syntax
- Include colors using style directives when helpful
- Keep diagrams clear and educational
- Add helpful labels and notes

Example ${type}:
${typeExamples[type] || typeExamples.flowchart}`,
                },
                {
                    role: 'user',
                    content: `Generate a ${type} diagram for: ${topic}`,
                },
            ],
            temperature: 0.5,
            max_tokens: 1000,
        });

        const content = completion.choices[0]?.message?.content || '';

        // Clean up the response
        let diagram = content
            .replace(/```mermaid\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        return diagram || getDefaultDiagram(topic);
    } catch (error) {
        console.error('LLM diagram generation error:', error);
        return getDefaultDiagram(topic);
    }
}

function getDefaultDiagram(topic: string): string {
    return `graph TD
    A[${topic}] --> B[Component 1]
    A --> C[Component 2]
    A --> D[Component 3]
    
    style A fill:#4d96ff`;
}
