// app/layout.js
import "./globals.css";
import Navbar from "./Navbar"; // Impor komponen Navbar
import { validateAndUpdateSession } from "../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Root Layout
export default async function RootLayout({ children }) {
  // Periksa session di sini untuk menentukan apakah menampilkan navbar
  const sessionToken = (await cookies()).get("sessionToken")?.value;
  let user = null;

  if (sessionToken) {
    user = await validateAndUpdateSession(sessionToken);
  }

  // Jika user tidak login dan mencoba mengakses halaman yang bukan login, redirect
  // Kita abaikan redirect di layout untuk saat ini, karena kita hanya menampilkan navbar jika login
  // Redirect utama tetap di masing-masing halaman (page.js dan login/page.js)

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* Tampilkan Navbar hanya jika user login */}
        {user && (
          <Navbar
            permissions={user.role.rolePermissions}
            username={user.username}
          />
        )}
        {/* Render konten halaman anak */}
        <main className="flex-grow">{children}</main>
      </body>
    </html>
  );
}
