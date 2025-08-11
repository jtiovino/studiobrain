// API endpoint for voicing generation

import { NextRequest, NextResponse } from 'next/server';
import { generateVoicings } from '@/lib/voicing-generator';
import {
  parseToConstraints,
  validateConstraints,
} from '@/lib/constraint-parser';
import type { VoicingRequest, Constraints } from '@/lib/voicing-explorer-types';
import { VoicingGenerationError } from '@/lib/voicing-explorer-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.instrument || !body.chordInput) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'instrument and chordInput are required',
        },
        { status: 400 }
      );
    }

    // Parse natural language constraints if provided
    let constraints: Constraints = body.constraints || {};

    if (body.naturalLanguage) {
      const parsedConstraints = parseToConstraints(
        body.naturalLanguage,
        constraints
      );
      constraints = { ...constraints, ...parsedConstraints };
    }

    // Validate constraints
    const validation = validateConstraints(constraints, body.instrument);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid constraints',
          details: validation.conflicts.join(', '),
          suggestions: validation.suggestions,
        },
        { status: 400 }
      );
    }

    // Build voicing request
    const voicingRequest: VoicingRequest = {
      instrument: body.instrument,
      chordInput: body.chordInput,
      constraints,
      count: Math.max(3, Math.min(4, body.count || 4)),
      lessonMode: body.lessonMode || false,
    };

    // Generate voicings
    const response = await generateVoicings(voicingRequest);

    // Return successful response
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Voicing generation error:', error);

    if (error instanceof VoicingGenerationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          suggestions: error.suggestions || [],
        },
        { status: 422 } // Unprocessable Entity
      );
    }

    // Generic error handling
    return NextResponse.json(
      {
        error: 'Internal server error',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST to generate voicings' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST to generate voicings' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST to generate voicings' },
    { status: 405 }
  );
}
