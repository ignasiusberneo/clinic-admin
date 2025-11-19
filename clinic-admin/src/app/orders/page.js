// app/orders/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AddOrderModal from "./AddOrderModal";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // State untuk input pencarian
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);

  const router = useRouter();

  // --- 1. Fetch daftar orders ---
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);

        // Bangun URL dengan query parameter jika searchQuery ada
        let url = "/api/orders"; // Ganti dengan endpoint API orders Anda
        if (searchQuery) {
          // Encode searchQuery untuk mencegah masalah dengan karakter khusus
          const encodedQuery = encodeURIComponent(searchQuery.trim());
          url += `?id=${encodedQuery}`;
        }

        const ordersRes = await fetch(url);

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData);
        } else {
          setError("Gagal memuat daftar order.");
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Terjadi kesalahan saat memuat data order.");
        router.push("/login");
        router.refresh();
      } finally {
        setLoading(false);
      }
    };
    if (searchQuery) {
      fetchOrders();
    }
  }, [searchQuery, router]); // Tambahkan searchQuery ke dependency array agar fetch ulang saat query berubah

  const handleCloseModal = () => {
    setIsAddOrderModalOpen(false);
  };

  const checkSession = async () => {
    try {
      setLoading(true);
      const sessionRes = await fetch("/api/check-session");
      const sessionData = await sessionRes.json();

      if (sessionRes.status !== 200 || !sessionData.authenticated) {
        await fetch("/api/logout", { method: "POST" });
        router.push("/login");
      }

      const userPermissions = sessionData.user.permissions;
      if (!userPermissions.includes("CASHIER_ACCESS")) {
        router.push("/schedules");
        return;
      }

      setUserPermissions(userPermissions);
    } catch (error) {
      console.error("Error checking session:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // --- 2. Handler untuk perubahan input pencarian ---
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // --- 3. Handler untuk klik item order ---
  const handleOrderClick = (orderId) => {
    router.push(`/orders/${orderId}`); // Arahkan ke detail order
  };

  if (loadingSession) {
    return (
      <div className="p-6 bg-green-50 min-h-screen flex items-center justify-center">
        <p className="text-green-800">Memuat halaman order...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-green-50 min-h-screen">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-green-600 text-white py-1 px-3 rounded hover:bg-green-500"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-green-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-900 mb-6">
            Daftar Order
          </h1>
          <button
            onClick={() => setIsAddOrderModalOpen(true)}
            className="px-4 py-2 font-semibold bg-green-500 text-white rounded-md hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Buat Order
          </button>
        </div>

        {/* --- Form Pencarian --- */}
        <div className="mb-6">
          <label
            htmlFor="order-search"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Cari Order (ID)
          </label>
          <input
            type="text"
            id="order-search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Masukkan ID order..."
            className="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Cari berdasarkan ID order.
          </p>
        </div>
        {/* --- Akhir Form Pencarian --- */}

        {/* --- Tabel Daftar Orders --- */}
        {loading && <p className="text-gray-600">Memuat daftar order...</p>}
        {orders.length === 0 && !loading && searchQuery && (
          <p className="text-gray-600">Tidak ada order yang ditemukan.</p>
        )}
        {orders.length > 0 && !loading && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    ID Order
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Klinik
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  {/* <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Total Harga
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    DP
                  </th> */}
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Dibuat
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleOrderClick(order.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.clinic?.name || `ID: ${order.clinic_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === "BELUM BAYAR"
                            ? "bg-yellow-100 text-yellow-800"
                            : order.status === "SUDAH BAYAR"
                            ? "bg-blue-100 text-blue-800"
                            : order.status === "SUDAH LUNAS"
                            ? "bg-green-100 text-green-800"
                            : order.status === "CANCELLED"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800" // Untuk status lainnya
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                      }).format(order.total_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                      }).format(order.dp)}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(order.created_at).toLocaleString("id-ID", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Jakarta",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Hentikan event bubbling ke tr (agar tidak redirect ke detail)
                          router.push(`/orders/detail/${order.id}`); // Arahkan ke detail order
                        }}
                        className="text-green-600 hover:text-green-900"
                        title="Lihat Detail"
                      >
                        Lihat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* --- Akhir Tabel Daftar Orders --- */}
      </div>
      <AddOrderModal
        isOpen={isAddOrderModalOpen}
        onClose={handleCloseModal}
        router={router}
      />
    </div>
  );
}
