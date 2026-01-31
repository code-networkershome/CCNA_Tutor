import { CommandNode } from './grammar';

export type ResolutionResult =
    | { type: 'success'; node: CommandNode; match: string }
    | { type: 'error'; message: string }
    | { type: 'ambiguous'; message: string; matches: string[] };

/**
 * Resolves a token against a grammar level, supporting exact match, 
 * partial match (abbreviations), and argument matching.
 */
export function resolveCommand(grammar: Record<string, CommandNode>, token: string): ResolutionResult {
    const lowerToken = token.toLowerCase();

    // 1. Check for EXACT match first (highest priority)
    // This handles cases where an abbreviation might match a shorter command exactly
    // e.g. if we had "sh" and "show", "sh" would match "sh" exactly.
    if (grammar[lowerToken]) {
        return { type: 'success', node: grammar[lowerToken], match: lowerToken };
    }

    // 2. Candidate collection for partial matching
    // Filter grammar keys that start with the token
    const candidates = Object.keys(grammar).filter(key =>
        !grammar[key].isArgument && key.startsWith(lowerToken)
    );

    // 3. Analyze candidates
    if (candidates.length === 1) {
        // Unique abbreviation
        const match = candidates[0];
        return { type: 'success', node: grammar[match], match: match };
    }
    else if (candidates.length > 1) {
        // Ambiguous command (e.g. 'c' could be 'configure' or 'copy' or 'clock')
        return {
            type: 'ambiguous',
            message: `% Ambiguous command: "${token}"`,
            matches: candidates
        };
    }

    // 4. Argument Matching (Fallback)
    // If no keyword match, check if this level accepts an argument (e.g. <ip>, <name>)
    const argKey = Object.keys(grammar).find(key => grammar[key].isArgument);
    if (argKey) {
        return { type: 'success', node: grammar[argKey], match: token }; // Argument consumes original token
    }

    // 5. No match found
    return {
        type: 'error',
        message: `% Invalid input detected at '${token}'`
    };
}
