import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Log, LOG_RETENTION_SECONDS, LOG_RETENTION_DAYS, purgeOldLogs } from '@/models/Log';
import { getLocationQueryFilter, requireAuth } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.user) return auth.response;

    await connectDB();

    // Trigger auto-deletion of logs older than 20 days in the background
    purgeOldLogs().catch((err) => console.error('Error auto-purging old logs:', err));

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';

    const locationFilter = await getLocationQueryFilter(req);

    // Retention boundary: only return logs within the latest 20 days
    const cutoffDate = new Date(Date.now() - LOG_RETENTION_SECONDS * 1000);

    const query: Record<string, unknown> = {
      ...locationFilter,
      createdAt: { $gte: cutoffDate },
    };

    if (type && type !== 'all') {
      query.type = { $regex: new RegExp(`^${type}$`, 'i') };
    }

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { username: searchRegex },
        { logs: searchRegex },
        { type: searchRegex },
        { locationName: searchRegex },
      ];
    }

    const logs = await Log.find(query).sort({ createdAt: -1 }).limit(150);
    return NextResponse.json({
      success: true,
      retentionDays: LOG_RETENTION_DAYS,
      logs,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * Endpoint for manually triggering or verifying auto-delete of logs older than 20 days
 */
export async function DELETE() {
  try {
    const auth = await requireAuth(0); // Admin only
    if (!auth.user) return auth.response;

    await connectDB();
    const deletedCount = await purgeOldLogs();

    return NextResponse.json({
      success: true,
      message: `Successfully purged logs older than ${LOG_RETENTION_DAYS} days.`,
      retentionDays: LOG_RETENTION_DAYS,
      deletedCount,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
