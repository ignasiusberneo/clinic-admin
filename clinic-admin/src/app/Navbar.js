"use client";

import Image from "next/image";
import { useState } from "react";
// Impor Next.js yang bermasalah telah dihapus (useRouter dan Image)

export default function Navbar({ username, permissions }) {
  // const router = useRouter(); // Dihapus

  // State untuk mengontrol visibilitas menu di perangkat mobile
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/logout", { method: "POST" });

      if (res.ok) {
        // Mengganti router.push dengan redirect standar
        window.location.href = "/login";
        // router.refresh() juga dihapus
      } else {
        console.error("Logout failed:", await res.text());
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navLinksData = [
    { href: "/schedules", label: "Jadwal Layanan", permission: null },
    { href: "/clinics", label: "Klinik", permission: "CLINIC_ACCESS" },
    { href: "/orders", label: "Kasir", permission: "CASHIER_ACCESS" },
    { href: "/services", label: "Setup Layanan", permission: "SERVICE_ACCESS" },
    { href: "/employees", label: "Karyawan", permission: "EMPLOYEE_ACCESS" },
  ];

  const navLinks = navLinksData.filter((link) => {
    // Logika Authorization:
    // 1. Link ditampilkan jika permission: null (global access)
    const isGlobalAccess = link.permission === null || link.permission === "";

    // 2. Link ditampilkan jika permissions pengguna menyertakan permission yang dibutuhkan
    // Perubahan: Menggunakan .some() untuk mengecek apakah ada objek permission yang namanya cocok
    const hasRequiredPermission = permissions.some(
      (p) => p.permission.name === link.permission
    );

    return isGlobalAccess || hasRequiredPermission;
  });

  // Placeholder untuk logo (menggantikan next/image)
  const logoUrl = "https://placehold.co/40x40/22C55E/FFFFFF?text=L";

  return (
    <nav className="bg-green-800 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-2">
        {/* Kontainer Utama (Logo + Menu + User) */}
        <div className="flex justify-between items-center h-16">
          {/* Bagian Kiri: Logo & Teks Brand */}
          <div className="flex items-center space-x-2">
            {/* Logo Klinik (Menggunakan tag <img> standar) */}
            <div className="flex items-center flex-shrink-0 space-x-2">
              <Image
                // src="/images/logo.png" // Ganti dengan path ke logo Anda jika berada di /public/images/
                src="/images/asyifa_logo.png" // Jika logo berada langsung di /public/
                alt="Logo Klinik"
                width={40} // Sesuaikan ukuran
                height={40} // Sesuaikan ukuran
                className="rounded-full" // Tambahkan kelas Tailwind sesuai kebutuhan
              />
              <span className="text-xl font-bold tracking-tight">
                ASYIFA HIPERBARIK
              </span>
            </div>

            {/* Menu Navigasi (Dihilangkan di sini, karena selalu menggunakan mode mobile) */}
            {/* <div className="hidden sm:block">...</div> */}
          </div>

          {/* Bagian Kanan: User Info, Logout, dan Tombol Hamburger */}
          <div className="flex items-center space-x-4">
            {/* Informasi User (Disembunyikan di sini agar konsisten dengan tampilan mobile, atau gunakan kelas 'block' jika ingin selalu ditampilkan) */}
            {/* Menghapus md:block agar disembunyikan */}
            <div className="block">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-green-200 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                aria-expanded={isMenuOpen}
              >
                <span className="sr-only">Buka menu utama</span>
                {/* Icon Hamburger/Close */}
                {isMenuOpen ? (
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-500 text-white text-sm py-1 px-3 rounded-lg font-medium transition-colors shadow-md"
            >
              Logout
            </button>

            {/* Tombol Hamburger (Selalu ditampilkan, kelas sm:hidden dihapus) */}
          </div>
        </div>
      </div>

      {/* Menu Mobile (Sekarang menjadi Menu Universal) */}
      {isMenuOpen && (
        <div className="border-t border-green-700">
          {" "}
          {/* Menghapus sm:hidden */}
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                // Klik link akan menutup menu
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-green-700 hover:text-green-200 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          {/* Tambahkan informasi user di menu mobile */}
          <div className="px-3 py-2 border-t border-green-700">
            <span className="block text-sm font-medium text-green-200">
              Saat ini login sebagai: {username || "Pengguna"}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}
