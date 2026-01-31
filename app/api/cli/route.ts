import { NextRequest, NextResponse } from 'next/server';
import { interpretCommand, getPrompt, getInitialState, CLIResponse } from '@/lib/cli-simulator/ai-interpreter';
import { processRoutingUpdates } from '@/lib/cli-simulator/network-simulator';
import type { CLIState, NetworkTopology } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CLIRequest {
    command: string;
    state: CLIState;
    topology?: NetworkTopology;
    deviceId?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as CLIRequest;
        const { command, state, topology, deviceId } = body;

        if (!command || typeof command !== 'string') {
            return NextResponse.json(
                { error: 'Command is required' },
                { status: 400 }
            );
        }

        if (!state) {
            return NextResponse.json(
                { error: 'State is required' },
                { status: 400 }
            );
        }

        // Call the AI interpreter
        const response: CLIResponse = await interpretCommand(
            state,
            command.trim(),
            (topology && deviceId) ? { topology, deviceId } : undefined
        );

        // Calculate new state
        // Use the full state returned by interpreter if available (includes VLANs, Routes updates)
        let newState = response.newState || { ...state };

        if (response.modeChange) {
            newState.mode = response.modeChange;
        }

        if (response.hostnameChange) {
            newState.hostname = response.hostnameChange;
        }

        // Update prompt based on new state
        newState.prompt = getPrompt(newState.hostname, newState.mode);

        let newTopology = topology;

        // Run Network Simulation if topology context exists
        if (newTopology && deviceId && newState) {
            // 1. Sync active device state into topology
            if (newTopology.devices[deviceId]) {
                newTopology.devices[deviceId].config = newState;

                // Sync software interfaces to hardware interfaces
                // This allows manual CLI creation of ports (e.g. 'int gi0/5') to appear in topology
                const hardwareInterfaces = newTopology.devices[deviceId].interfaces;
                Object.keys(newState.interfaces).forEach(ifaceName => {
                    // Only sync physical interfaces (Ethernet types), ignore Loopback/VLAN/Tunnel
                    if (
                        !hardwareInterfaces[ifaceName] &&
                        ifaceName.match(/^(FastEthernet|GigabitEthernet|Ethernet)/i)
                    ) {
                        hardwareInterfaces[ifaceName] = {
                            name: ifaceName,
                            status: 'up', // Default to up (cable unplugged but port exists)
                            connectedTo: undefined
                        };
                    }
                });
            }

            // 2. Process Routing / Link State Simulation
            newTopology = processRoutingUpdates(newTopology);

            // 3. Re-extract state in case simulation modified it (e.g. added routes)
            if (newTopology.devices[deviceId]?.config) {
                newState = newTopology.devices[deviceId].config!;
            }
        }

        return NextResponse.json({
            success: true,
            response: {
                valid: response.valid,
                output: response.output,
                error: response.error,
            },
            newState,
            newTopology, // Return full topology
        });

    } catch (error) {
        console.error('CLI API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process command',
                response: {
                    valid: false,
                    output: '% System error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            },
            { status: 500 }
        );
    }
}

// GET endpoint to get initial state
export async function GET() {
    const initialState = getInitialState('router', 'Router');
    return NextResponse.json({
        success: true,
        state: initialState,
    });
}
