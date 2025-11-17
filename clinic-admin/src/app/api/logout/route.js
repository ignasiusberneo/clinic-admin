// app/api/logout/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "../../../utils/session"; // Sesuaikan path jika utils berada di src

export async function POST() {
  try {
    // Ambil sessionToken dari cookie
    const sessionToken = (await cookies()).get("sessionToken")?.value;

    if (sessionToken) {
      // Hapus session dari database Prisma
      await deleteSession(sessionToken);
    }

    // Hapus cookie sessionToken dari browser
    (await cookies()).delete("sessionToken");

    // Kembalikan respons redirect ke /login
    // Next.js App Router saat ini tidak mendukung redirect langsung dari API route seperti Pages Router.
    // Solusi: Kembalikan status sukses, dan biarkan klien (Client Component) yang melakukan redirect.
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat logout" },
      { status: 500 }
    );
  }
}
