import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { event } = body;

        if (!event || typeof event !== 'string') {
            return NextResponse.json({ error: 'Invalid event.' }, { status: 400 });
        }

        // Fire-and-forget logging
        await convex.mutation(api.analytics.logEvent, { event });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[/api/analytics] Error:', err);
        // Don't fail — analytics should never break user flow
        return NextResponse.json({ success: false }, { status: 200 });
    }
}
