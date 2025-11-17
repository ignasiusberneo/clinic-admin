// app/login/page.js
// JANGAN ADA: "use client";

import { validateAndUpdateSession } from "../../utils/session"; // Sesuaikan path
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Head from "next/head";
// Import Client Component dari file terpisah
import LoginForm from "./LoginForm"; // <-- Import dari file terpisah
import Image from "next/image";

// Server Component: Periksa session dan redirect jika sudah login
async function checkLoggedInAndRedirect() {
  const sessionToken = (await cookies()).get("sessionToken")?.value;

  if (sessionToken) {
    redirect("/");
  }
}

// Server Component Utama
export default async function LoginPage() {
  // Panggil fungsi server untuk cek session dan redirect jika perlu
  await checkLoggedInAndRedirect();

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <Head>
        <title>Login Klinik</title>
      </Head>
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 space-y-6">
        {/* Logo Placeholder */}
        <div className="flex justify-center">
          <Image
            // src="/images/logo.png" // Ganti dengan path ke logo Anda
            src="/images/asyifa_logo.png" // Jika logo berada langsung di /public/logo.png
            alt="Logo Klinik"
            // Gunakan width dan height untuk optimasi, atau fill untuk mengisi container
            width={80} // Sesuaikan ukuran
            height={80} // Sesuaikan ukuran
            // Jika ingin logo mengisi ukuran container (w-20 h-20) dan mempertahankan rasio:
            // fill={true}
            // objectFit="contain" // atau "cover" tergantung kebutuhan
            // className="absolute inset-0" // Jika menggunakan fill
            className="rounded-full shadow-md" // Tambahkan kelas Tailwind sesuai kebutuhan
            // Optional: Tambahkan loading="lazy" jika logo tidak terlihat langsung
            // loading="lazy"
          />
        </div>

        <h2 className="text-2xl font-bold text-center text-green-900">
          Asyifa Hiperbarik
        </h2>

        {/* Panggil Client Component untuk form */}
        <LoginForm />
      </div>
    </div>
  );
}
