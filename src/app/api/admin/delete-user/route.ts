import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get('uid');

        console.log(`[API] Attempting to delete user: ${uid}`);

        if (!uid) {
            console.error("[API] User ID missing");
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Verify the request is authorized (optional: check for an admin token here)

        await adminAuth.deleteUser(uid);
        console.log(`[API] Successfully deleted user ${uid} from Auth.`);

        return NextResponse.json({ success: true, message: `User ${uid} deleted from Auth.` });
    } catch (error: any) {
        console.error('[API] Error deleting user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
