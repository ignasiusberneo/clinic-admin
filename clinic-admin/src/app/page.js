// app/page.js
"use client"; // Jadikan Client Component

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/check-session");
        const data = await res.json();

        if (res.status === 200 && data.authenticated) {
          router.push("/schedules");
          setUser(data.user);
        } else {
          await fetch("/api/logout", { method: "POST" });
          router.push("/login");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-green-50 min-h-screen flex items-center justify-center">
        <p className="text-green-800">Memeriksa status login...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // --- Contoh menampilkan waktu dengan lokalalisasi ---
  const formattedCreatedAt = user.created_at
    ? new Date(user.created_at).toLocaleString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Tidak diketahui";

  const formattedUpdatedAt = user.updated_at
    ? new Date(user.updated_at).toLocaleString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Tidak diketahui";
  // ----------------------------------------------------

  // Tombol logout sekarang ada di Navbar, dihapus dari sini

  return (
    <div className="p-6 bg-green-50 min-h-screen">
      <h1 className="text-2xl font-bold text-green-900">
        Selamat Datang di Dashboard!
      </h1>
      <p>
        <strong>Username:</strong> {user.username}
      </p>
      <p>
        <strong>Role:</strong> {user.role || "Tidak ada role"}
      </p>
      <p>
        <strong>Klinik:</strong> {user.clinic || "Tidak ada klinik"}
      </p>
      <p>
        <strong>Dibuat pada:</strong> {formattedCreatedAt}
      </p>
      <p>
        <strong>Terakhir diperbarui:</strong> {formattedUpdatedAt}
      </p>

      {/* Konten dashboard lainnya bisa ditambahkan di sini */}
    </div>
  );
}
