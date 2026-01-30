import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// CCNA topics for question generation - expanded to match quiz list
const topicMappings: Record<string, string[]> = {
    // Network Fundamentals
    'Network Fundamentals': ['OSI Model', 'TCP/IP', 'Network Types', 'Cabling', 'Network Devices'],
    'OSI': ['OSI Model', 'OSI Layers', 'Data Encapsulation'],
    'TCP/IP': ['TCP/IP Model', 'TCP', 'UDP', 'IP Protocol'],

    // IPv4/IPv6
    'IPv4': ['IPv4 Addressing', 'IP Classes', 'Private IP', 'Public IP'],
    'IPv4 Addressing': ['IPv4 Addressing', 'IP Classes', 'Private IP', 'Public IP'],
    'IPv6': ['IPv6 Addressing', 'IPv6 Configuration', 'IPv6 Headers', 'IPv6 Migration'],
    'IPv6 Fundamentals': ['IPv6 Addressing', 'IPv6 Configuration', 'IPv6 Headers'],
    'Subnetting': ['Subnet Calculation', 'CIDR', 'VLSM', 'Subnet Masks'],

    // Network Access
    'VLAN': ['VLAN Configuration', 'VLAN Tagging', '802.1Q', 'Native VLAN'],
    'VLANs & Trunking': ['VLAN Configuration', '802.1Q Trunking', 'DTP', 'VTP'],
    '802.1Q': ['802.1Q Trunking', 'Trunk Configuration', 'Native VLAN'],
    'STP': ['Spanning Tree Protocol', 'STP States', 'STP Election', 'Port Roles'],
    'RSTP': ['Rapid Spanning Tree', 'RSTP States', 'RSTP Convergence'],
    'Spanning Tree Protocol': ['STP', 'RSTP', 'Port Roles', 'Root Bridge Election'],
    'EtherChannel': ['Link Aggregation', 'LACP', 'PAgP', 'Port Channel'],
    'LACP': ['LACP Configuration', 'Link Aggregation', 'EtherChannel'],
    'Wireless': ['WLAN', 'WiFi Standards', 'WLC', 'Wireless Security'],
    'WLAN': ['Wireless LAN', 'WiFi', 'Access Points', 'Controllers'],
    'Wireless Networking': ['WLAN Fundamentals', 'WiFi Security', 'WLC Configuration'],

    // IP Connectivity
    'Static': ['Static Routing', 'Default Route', 'Floating Static'],
    'Static Routing': ['Static Routes', 'Default Route', 'Administrative Distance'],
    'Routing': ['Routing Protocols', 'Route Selection', 'Routing Tables'],
    'OSPF': ['OSPF Configuration', 'OSPF Areas', 'OSPF Neighbors', 'LSA Types'],
    'OSPF Routing': ['Single-Area OSPF', 'OSPF Configuration', 'OSPF Metrics'],
    'FHRP': ['HSRP', 'VRRP', 'GLBP', 'Gateway Redundancy'],
    'HSRP': ['HSRP Configuration', 'Standby Groups', 'HSRP States'],
    'First Hop Redundancy': ['HSRP', 'VRRP', 'GLBP Configuration'],

    // IP Services
    'NAT': ['NAT Configuration', 'Static NAT', 'Dynamic NAT', 'NAT Overload'],
    'PAT': ['Port Address Translation', 'NAT Overload', 'PAT Configuration'],
    'NAT & PAT': ['Network Address Translation', 'Static NAT', 'Dynamic NAT', 'PAT'],
    'DHCP': ['DHCP Configuration', 'DHCP Server', 'DHCP Relay', 'DHCP Options'],
    'DNS': ['DNS Resolution', 'DNS Records', 'DNS Server Configuration'],
    'DHCP & DNS': ['DHCP Configuration', 'DNS Resolution', 'DHCP Relay'],
    'NTP': ['Network Time Protocol', 'NTP Server', 'Time Synchronization'],
    'SNMP': ['Simple Network Management Protocol', 'SNMP Versions', 'MIB'],
    'NTP & SNMP': ['NTP Configuration', 'SNMP Setup', 'Network Monitoring'],
    'QoS': ['Quality of Service', 'QoS Marking', 'Traffic Shaping', 'Queuing'],
    'QoS Fundamentals': ['QoS Concepts', 'DSCP', 'Traffic Classification'],

    // Security
    'ACL': ['Access Control Lists', 'Standard ACL', 'Extended ACL', 'ACL Configuration'],
    'ACLs': ['Standard ACL', 'Extended ACL', 'Named ACL', 'ACL Placement'],
    'Access Control Lists': ['Standard ACL', 'Extended ACL', 'ACL Configuration'],
    'Security': ['Network Security', 'Security Best Practices', 'Threat Prevention'],
    'Port Security': ['Switch Port Security', 'MAC Address Limiting', 'Violation Modes'],
    'DAI': ['Dynamic ARP Inspection', 'ARP Spoofing Prevention'],
    'AAA': ['Authentication', 'Authorization', 'Accounting', 'RADIUS', 'TACACS+'],
    '802.1X': ['Port-based Authentication', 'EAP', 'Supplicant'],
    'AAA & 802.1X': ['AAA Configuration', '802.1X Setup', 'RADIUS'],
    'VPN': ['Virtual Private Network', 'Site-to-Site VPN', 'Remote Access VPN'],
    'IPSec': ['IPSec VPN', 'IKE', 'ESP', 'AH'],
    'VPN Fundamentals': ['VPN Types', 'IPSec', 'SSL VPN'],

    // Automation
    'Automation': ['Network Automation', 'Python', 'REST APIs', 'JSON'],
    'API': ['REST API', 'API Calls', 'JSON', 'Data Formats'],
    'Network Automation': ['Automation Tools', 'REST APIs', 'Python Scripting'],
    'SDN': ['Software Defined Networking', 'Controller-based Networking', 'OpenFlow'],
    'DNA Center': ['Cisco DNA Center', 'Intent-based Networking', 'Assurance'],
    'SDN & Controllers': ['SDN Architecture', 'Cisco DNA Center', 'Controllers'],
    'Ansible': ['Ansible Playbooks', 'Network Automation', 'Configuration Management'],
    'DevOps': ['DevOps Tools', 'CI/CD', 'Infrastructure as Code'],
    'Configuration Management': ['Ansible', 'Puppet', 'Chef', 'Automation Tools'],

    // Practice Exams
    'Mixed': ['OSPF', 'VLANs', 'ACLs', 'NAT', 'Subnetting', 'Routing', 'Switching', 'Security'],
    'Mixed Review': ['OSPF', 'VLANs', 'ACLs', 'NAT', 'Subnetting', 'Routing', 'Switching'],
    'Exam': ['OSPF', 'VLANs', 'ACLs', 'NAT', 'Subnetting', 'Routing', 'Switching', 'Security', 'Automation'],
};

// Generate a batch of questions using LLM
async function generateBatch(selectedTopics: string[], batchSize: number, batchIndex: number): Promise<any[]> {
    const questionsPerTopic = Math.ceil(batchSize / selectedTopics.length);

    const prompt = `Generate exactly ${batchSize} CCNA certification exam practice questions (Batch ${batchIndex + 1}).

TOPICS TO COVER (distribute questions evenly across ALL topics):
${selectedTopics.map((t, i) => `${i + 1}. ${t} - Generate approximately ${questionsPerTopic} questions about this topic`).join('\n')}

IMPORTANT REQUIREMENTS:
- Include questions from EACH topic listed above
- Distribute questions EVENLY across all ${selectedTopics.length} topics
- Mix questions from different topics throughout
- Each question should clearly relate to its assigned topic

For each question provide:
1. A clear, exam-style question
2. Four answer options (A, B, C, D)
3. The correct answer letter
4. A brief explanation
5. The topic it belongs to (must be one of: ${selectedTopics.join(', ')})

Return ONLY a valid JSON array:
[
  {
    "questionText": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "A",
    "explanation": "Explanation...",
    "topic": "${selectedTopics[batchIndex % selectedTopics.length]}",
    "difficulty": "medium"
  }
]`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are a CCNA exam question generator. Generate accurate, exam-quality networking questions. Distribute questions EVENLY across ALL given topics. Return valid JSON only.`,
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7 + (batchIndex * 0.05), // Slight variation for diversity
            max_tokens: 4000,
        });

        const responseText = completion.choices[0]?.message?.content || '[]';

        // Parse JSON from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(responseText);
    } catch (error) {
        console.error(`Batch ${batchIndex} generation failed:`, error);
        return [];
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            examType = 'ccna-full',
            topic,
            topics: requestTopics,
            questionCount = 10
        } = body;

        // Determine which topics to use
        let selectedTopics: string[];

        if (topic) {
            // Single topic quiz - use mapped subtopics or the topic itself
            selectedTopics = topicMappings[topic] || [topic];
        } else if (requestTopics && Array.isArray(requestTopics) && requestTopics.length > 0) {
            // Multiple topics provided
            selectedTopics = requestTopics.flatMap(t => topicMappings[t] || [t]);
        } else {
            // Default: random selection for practice exams
            const allTopics = ['OSPF', 'VLANs', 'ACLs', 'NAT', 'DHCP', 'IPv4', 'IPv6', 'Subnetting', 'Routing', 'Switching'];
            selectedTopics = allTopics.sort(() => Math.random() - 0.5).slice(0, 5);
        }

        // Limit to unique topics
        selectedTopics = [...new Set(selectedTopics)].slice(0, 10); // Allow up to 10 topics for large exams

        // Batch generation for large question counts
        const BATCH_SIZE = 15; // LLM can reliably generate ~15 questions per call
        const numBatches = Math.ceil(questionCount / BATCH_SIZE);

        let allQuestions: any[] = [];

        if (numBatches === 1) {
            // Single batch - generate directly
            allQuestions = await generateBatch(selectedTopics, questionCount, 0);
        } else {
            // Multiple batches needed - generate in parallel (up to 5 at a time)
            console.log(`Generating ${questionCount} questions in ${numBatches} batches...`);

            // Generate batches sequentially (to avoid rate limits)
            for (let i = 0; i < numBatches; i++) {
                const remainingQuestions = questionCount - allQuestions.length;
                const batchQuestionCount = Math.min(BATCH_SIZE, remainingQuestions);

                // Rotate topics for variety across batches
                const rotatedTopics = [...selectedTopics.slice(i % selectedTopics.length), ...selectedTopics.slice(0, i % selectedTopics.length)];

                const batchQuestions = await generateBatch(rotatedTopics.slice(0, 5), batchQuestionCount, i);
                allQuestions = [...allQuestions, ...batchQuestions];

                // Small delay between batches to avoid rate limits
                if (i < numBatches - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }

        // If we didn't get enough questions, fill with fallback
        if (allQuestions.length < questionCount) {
            const fallbackQuestions = generateFallbackQuestions(selectedTopics, questionCount - allQuestions.length);
            allQuestions = [...allQuestions, ...fallbackQuestions];
        }

        // Trim to exact count requested
        allQuestions = allQuestions.slice(0, questionCount);

        // Transform to our format
        const formattedQuestions = allQuestions.map((q: any, i: number) => ({
            id: `llm-${Date.now()}-${i}`,
            type: 'mcq',
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.options?.[q.correctAnswer?.charCodeAt(0) - 65] || q.options?.[0] || 'A',
            explanation: q.explanation || '',
            topic: q.topic || selectedTopics[i % selectedTopics.length],
            difficulty: q.difficulty || 'medium',
            points: 10,
        }));

        return NextResponse.json({
            success: true,
            data: {
                questions: formattedQuestions,
                topics: selectedTopics,
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Error generating questions:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate questions' }, { status: 500 });
    }
}

function generateFallbackQuestions(topics: string[], count: number) {
    // Topic-specific fallback questions
    const topicQuestions: Record<string, any[]> = {
        'OSI': [
            { questionText: 'Which layer of the OSI model handles logical addressing?', options: ['Data Link Layer', 'Network Layer', 'Transport Layer', 'Session Layer'], correctAnswer: 'B', explanation: 'The Network Layer (Layer 3) handles logical IP addressing.', topic: 'OSI' },
            { questionText: 'What layer of the OSI model is responsible for MAC addresses?', options: ['Physical', 'Data Link', 'Network', 'Transport'], correctAnswer: 'B', explanation: 'The Data Link Layer (Layer 2) handles MAC addresses.', topic: 'OSI' },
            { questionText: 'Which OSI layer handles end-to-end communication and flow control?', options: ['Network', 'Transport', 'Session', 'Presentation'], correctAnswer: 'B', explanation: 'The Transport Layer (Layer 4) provides end-to-end communication.', topic: 'OSI' },
        ],
        'TCP/IP': [
            { questionText: 'What protocol uses port 443?', options: ['HTTP', 'FTP', 'HTTPS', 'SSH'], correctAnswer: 'C', explanation: 'HTTPS uses TCP port 443 for secure web traffic.', topic: 'TCP/IP' },
            { questionText: 'Which transport protocol is connectionless?', options: ['TCP', 'UDP', 'IP', 'ICMP'], correctAnswer: 'B', explanation: 'UDP is connectionless and does not establish a connection before sending data.', topic: 'TCP/IP' },
            { questionText: 'What is the well-known port for SSH?', options: ['21', '22', '23', '25'], correctAnswer: 'B', explanation: 'SSH uses TCP port 22.', topic: 'TCP/IP' },
        ],
        'OSPF': [
            { questionText: 'What is the default administrative distance for OSPF?', options: ['90', '100', '110', '120'], correctAnswer: 'C', explanation: 'OSPF has a default administrative distance of 110.', topic: 'OSPF' },
            { questionText: 'Which OSPF packet type establishes neighbor relationships?', options: ['LSA', 'Hello', 'DBD', 'LSR'], correctAnswer: 'B', explanation: 'Hello packets discover and maintain OSPF neighbor relationships.', topic: 'OSPF' },
            { questionText: 'What is the OSPF router ID based on by default?', options: ['MAC address', 'Hostname', 'Highest loopback IP', 'Serial IP'], correctAnswer: 'C', explanation: 'OSPF uses the highest loopback IP as router ID.', topic: 'OSPF' },
        ],
        'VLAN': [
            { questionText: 'What is the purpose of a VLAN?', options: ['Increase speed', 'Segment broadcast domains', 'Replace routers', 'Encrypt traffic'], correctAnswer: 'B', explanation: 'VLANs segment broadcast domains for better performance.', topic: 'VLAN' },
            { questionText: 'Which VLAN is the default native VLAN on Cisco switches?', options: ['VLAN 0', 'VLAN 1', 'VLAN 100', 'VLAN 4095'], correctAnswer: 'B', explanation: 'VLAN 1 is the default native VLAN.', topic: 'VLAN' },
            { questionText: 'What protocol encapsulates VLAN traffic on trunk links?', options: ['VTP', 'DTP', '802.1Q', 'ISL'], correctAnswer: 'C', explanation: '802.1Q is the standard for VLAN tagging.', topic: 'VLAN' },
        ],
        '802.1Q': [
            { questionText: 'What does 802.1Q add to Ethernet frames?', options: ['IP header', 'VLAN tag', 'MAC address', 'Checksum'], correctAnswer: 'B', explanation: '802.1Q adds a 4-byte VLAN tag to frames.', topic: '802.1Q' },
            { questionText: 'How many bytes does the 802.1Q tag add to a frame?', options: ['2 bytes', '4 bytes', '8 bytes', '12 bytes'], correctAnswer: 'B', explanation: 'The 802.1Q tag is 4 bytes.', topic: '802.1Q' },
            { questionText: 'What is the default native VLAN for 802.1Q trunks?', options: ['VLAN 0', 'VLAN 1', 'VLAN 10', 'VLAN 100'], correctAnswer: 'B', explanation: 'VLAN 1 is the default native VLAN.', topic: '802.1Q' },
        ],
        'Subnetting': [
            { questionText: 'What is the subnet mask for a /24 network?', options: ['255.255.0.0', '255.255.255.0', '255.255.255.128', '255.255.255.192'], correctAnswer: 'B', explanation: 'A /24 prefix gives 255.255.255.0', topic: 'Subnetting' },
            { questionText: 'How many usable hosts are in a /26 subnet?', options: ['30', '62', '126', '254'], correctAnswer: 'B', explanation: '/26 has 6 host bits = 64-2 = 62 usable hosts.', topic: 'Subnetting' },
            { questionText: 'What is the network address for 192.168.1.130/25?', options: ['192.168.1.0', '192.168.1.128', '192.168.1.64', '192.168.1.192'], correctAnswer: 'B', explanation: '/25 creates subnets: .0-.127 and .128-.255', topic: 'Subnetting' },
        ],
        'IPv4': [
            { questionText: 'Which IPv4 address class is reserved for multicast?', options: ['Class A', 'Class B', 'Class C', 'Class D'], correctAnswer: 'D', explanation: 'Class D (224.0.0.0 - 239.255.255.255) is reserved for multicast.', topic: 'IPv4' },
            { questionText: 'What is the private IP range for Class C?', options: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16'], correctAnswer: 'C', explanation: '192.168.0.0/16 is the Class C private range.', topic: 'IPv4' },
            { questionText: 'What is the loopback address in IPv4?', options: ['0.0.0.0', '127.0.0.1', '255.255.255.255', '192.168.1.1'], correctAnswer: 'B', explanation: '127.0.0.1 is the loopback address.', topic: 'IPv4' },
        ],
        'IPv6': [
            { questionText: 'How many bits are in an IPv6 address?', options: ['32', '64', '128', '256'], correctAnswer: 'C', explanation: 'IPv6 addresses are 128 bits long.', topic: 'IPv6' },
            { questionText: 'What is the IPv6 loopback address?', options: ['::', '::1', 'fe80::', 'ff02::1'], correctAnswer: 'B', explanation: '::1 is the IPv6 loopback address.', topic: 'IPv6' },
            { questionText: 'Which IPv6 address type is used for link-local communication?', options: ['fc00::/7', 'fe80::/10', 'ff00::/8', '2000::/3'], correctAnswer: 'B', explanation: 'fe80::/10 is the link-local unicast prefix.', topic: 'IPv6' },
        ],
        'ACL': [
            { questionText: 'What is the number range for standard ACLs?', options: ['1-99', '100-199', '1-199', '200-299'], correctAnswer: 'A', explanation: 'Standard ACLs use numbers 1-99.', topic: 'ACL' },
            { questionText: 'Where should standard ACLs be placed?', options: ['Close to source', 'Close to destination', 'On the core', 'On any router'], correctAnswer: 'B', explanation: 'Standard ACLs filter by source only, so place close to destination.', topic: 'ACL' },
            { questionText: 'What is at the end of every ACL?', options: ['Permit any', 'Deny any', 'Log all', 'Nothing'], correctAnswer: 'B', explanation: 'Every ACL has an implicit "deny any" at the end.', topic: 'ACL' },
        ],
        'NAT': [
            { questionText: 'What does NAT stand for?', options: ['Network Access Translation', 'Network Address Translation', 'Node Address Transfer', 'Network Area Transition'], correctAnswer: 'B', explanation: 'NAT stands for Network Address Translation.', topic: 'NAT' },
            { questionText: 'Which NAT type maps one private IP to one public IP?', options: ['Dynamic NAT', 'Static NAT', 'PAT', 'NAT Overload'], correctAnswer: 'B', explanation: 'Static NAT provides a one-to-one mapping.', topic: 'NAT' },
            { questionText: 'What is another name for PAT?', options: ['Static NAT', 'Dynamic NAT', 'NAT Overload', 'NAT Pool'], correctAnswer: 'C', explanation: 'PAT is also called NAT Overload.', topic: 'NAT' },
        ],
        'STP': [
            { questionText: 'Which STP port state forwards user traffic?', options: ['Blocking', 'Listening', 'Learning', 'Forwarding'], correctAnswer: 'D', explanation: 'Only Forwarding ports send and receive user data.', topic: 'STP' },
            { questionText: 'What is the default STP priority value?', options: ['0', '16384', '32768', '65535'], correctAnswer: 'C', explanation: 'Default bridge priority is 32768.', topic: 'STP' },
            { questionText: 'Which BPDUs elect the root bridge?', options: ['Superior BPDUs', 'Configuration BPDUs', 'TCN BPDUs', 'Hello BPDUs'], correctAnswer: 'B', explanation: 'Configuration BPDUs contain bridge ID for root election.', topic: 'STP' },
        ],
        'RSTP': [
            { questionText: 'What is the main advantage of RSTP over STP?', options: ['Lower cost', 'Faster convergence', 'More VLANs', 'Better security'], correctAnswer: 'B', explanation: 'RSTP provides faster convergence (seconds vs 30-50 seconds for STP).', topic: 'RSTP' },
            { questionText: 'What are the RSTP port states?', options: ['Blocking, Listening, Learning, Forwarding', 'Discarding, Learning, Forwarding', 'Blocked, Unblocked', 'Active, Passive'], correctAnswer: 'B', explanation: 'RSTP has only 3 port states: Discarding, Learning, Forwarding.', topic: 'RSTP' },
        ],
    };

    // Collect questions from ALL specified topics
    const allQuestions: any[] = [];

    for (const topic of topics) {
        const topicQs = topicQuestions[topic] || topicQuestions['OSI'] || [];
        allQuestions.push(...topicQs);
    }

    // If no questions found, use general networking questions
    if (allQuestions.length === 0) {
        allQuestions.push(
            { questionText: 'Which layer of the OSI model handles logical addressing?', options: ['Data Link', 'Network', 'Transport', 'Session'], correctAnswer: 'B', explanation: 'Layer 3 (Network) handles logical IP addressing.', topic: 'Networking' },
            { questionText: 'What protocol uses port 443?', options: ['HTTP', 'FTP', 'HTTPS', 'SSH'], correctAnswer: 'C', explanation: 'HTTPS uses TCP port 443.', topic: 'Networking' },
            { questionText: 'Which command shows the routing table?', options: ['show routes', 'show ip route', 'display routing', 'get routes'], correctAnswer: 'B', explanation: 'The "show ip route" command displays the routing table.', topic: 'Networking' },
        );
    }

    // Shuffle and select questions to match count
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push({ ...shuffled[i % shuffled.length], difficulty: 'medium' });
    }
    return result;
}

