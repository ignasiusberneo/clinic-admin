// app/api/check-session/route.js
import { NextResponse } from "next/server";
import { validateAndUpdateSession } from "../../../utils/session"; // Sesuaikan path jika utils berada di src
import { cookies } from "next/headers";

// TANDAI fungsi sebagai async
export async function GET() {
  // Ambil session token dari cookie di sisi server
  // Harus di-await karena cookies() sekarang async
  const sessionToken = (await cookies()).get("sessionToken")?.value;

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Validasi session token
  // Fungsi validateAndUpdateSession Anda mungkin juga async (karena mengakses database)
  // Jadi, pastikan untuk await juga.
  const user = await validateAndUpdateSession(sessionToken);

  if (!user) {
    // Jika token tidak valid, kembalikan 401 Unauthorized
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const rolePermissions = user.role.rolePermissions;

  const permissions = rolePermissions.map((rp) => rp.permission.name);

  // Jika valid, kembalikan data user
  // Konversi timestamp ke string lokal di sini juga jika diperlukan sebelum dikirim
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role?.name || null,
      business_area: user.business_area?.name || null,
      created_at: user.created_at
        ? new Date(user.created_at).toISOString()
        : null, // Kirim dalam ISO string
      updated_at: user.updated_at
        ? new Date(user.updated_at).toISOString()
        : null,
      permissions: permissions,
    },
  });
}
