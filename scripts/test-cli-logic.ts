
import { processCommand } from '../lib/cli-simulator/command-processor';
import { getInitialState } from '../lib/cli-simulator/ai-interpreter';
import { CLIState } from '../types';

async function runTest() {
    console.log("=== STARTING DETERMINISTIC CLI TEST ===\n");

    let state = getInitialState('router', 'Router');

    const steps = [
        { cmd: 'enable', expectedMode: 'privileged' },
        { cmd: 'conf t', expectedMode: 'global_config' },
        { cmd: 'hostname LabRouter', checkState: (s: CLIState) => s.hostname === 'LabRouter' },
        { cmd: 'interface g0/0', expectedMode: 'interface_config' },
        { cmd: 'ip address 192.168.1.1 255.255.255.0', checkState: (s: CLIState) => s.interfaces['GigabitEthernet0/0']?.ip === '192.168.1.1' },
        { cmd: 'no shut', checkState: (s: CLIState) => s.interfaces['GigabitEthernet0/0']?.status === 'up' },
        { cmd: 'exit', expectedMode: 'global_config' },
        { cmd: 'vlan 10', expectedMode: 'vlan_config' },
        { cmd: 'name SALES', checkState: (s: CLIState) => s.vlans.find(v => v.id === 10)?.name === 'SALES' },
        { cmd: 'end', expectedMode: 'privileged' },
        { cmd: 'show ip interface brief', checkOutput: 'GigabitEthernet0/0' },
        { cmd: 'show running-config', checkOutput: 'hostname LabRouter' }
    ];

    for (const step of steps) {
        console.log(`> ${step.cmd}`);
        const result = await processCommand(state, step.cmd);

        if (result.newState) {
            state = result.newState;
        }

        if (step.expectedMode && state.mode !== step.expectedMode) {
            console.error(`[FAIL] Expected mode ${step.expectedMode}, got ${state.mode}`);
            process.exit(1);
        }

        if (step.checkState && !step.checkState(state)) {
            console.error(`[FAIL] State check failed for command: ${step.cmd}`);
            console.log('State:', JSON.stringify(state, null, 2));
            process.exit(1);
        }

        if (step.checkOutput && !result.output.includes(step.checkOutput)) {
            console.error(`[FAIL] Output check failed. Expected to contain "${step.checkOutput}"`);
            console.log('Output:', result.output);
            process.exit(1);
        }

        if (!result.valid && !step.cmd.includes('invalid')) {
            console.error(`[FAIL] Command returned invalid: ${result.error}`);
        }

        console.log(`[PASS] OK`);
    }

    console.log("\n=== TEST COMPLETED SUCCESSFULLY ===");
}

runTest().catch(console.error);
