import { NextRequest, NextResponse } from 'next/server';
import { interpretCommand, getPrompt, getInitialState, CLIResponse } from '@/lib/cli-simulator/ai-interpreter';
import type { CLIState } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CLIRequest {
    command: string;
    state: CLIState;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as CLIRequest;
        const { command, state } = body;

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
        const response: CLIResponse = await interpretCommand(state, command.trim());

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

        return NextResponse.json({
            success: true,
            response: {
                valid: response.valid,
                output: response.output,
                error: response.error,
            },
            newState,
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
