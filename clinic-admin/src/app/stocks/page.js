// app/orders/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PurchaseEntryModal from "./PurchaseEntryModal";

export default function StocksPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // State untuk input pencarian
  const [clinics, setClinics] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [products, setProducts] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);

  const router = useRouter();

  const handleCloseAddStockModal = () => {
    setSelectedProduct(null);
    setIsAddStockModalOpen(false);
  };
  const handleOpenAddStockModal = (product) => {
    setSelectedProduct(product);
    setIsAddStockModalOpen(true);
  };

  const fetchClinics = async () => {
    try {
      setLoadingClinics(true);
      const res = await fetch("/api/business-areas?exclude_head_office=1");
      if (res.ok) {
        const clinicsData = await res.json();
        setClinics(clinicsData);
      } else {
        setError("Gagal memuat daftar klinik.");
      }
    } catch (error) {
      setError("Gagal memuat daftar klinik.");
    } finally {
      setLoadingClinics(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchProducts = async () => {
    try {
      const productsRes = await fetch(
        `/api/products?business_area_id=${selectedClinicId}&type=GOOD&q=${searchQuery}&limit=10&get_stock=1`
      );
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      } else {
        console.error("Gagal memuat daftar produk.");
        setProducts([]);
      }
      false;
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClinicChange = (e) => {
    const clinicId = e.target.value;
    setSelectedClinicId(clinicId);
  };

  const checkSession = async () => {
    try {
      setLoadingSession(true);
      const sessionRes = await fetch("/api/check-session");
      const sessionData = await sessionRes.json();

      if (sessionRes.status !== 200 || !sessionData.authenticated) {
        router.push("/login");
        router.refresh();
        return;
      }

      setUserPermissions(sessionData.user.permissions);
    } catch (error) {
      setUserPermissions([]);
      alert("Gagal memuat halaman");
    } finally {
      setLoadingSession(false);
    }

    setLoadingSession(false);
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

  useEffect(() => {
    // 1. Definisikan delay untuk debounce (misalnya, 500ms)
    const delay = 500;

    // 2. Gunakan setTimeout untuk menunda pemanggilan fungsi
    const handler = setTimeout(() => {
      if (searchQuery.trim() !== "") {
        fetchProducts();
      } else {
        setIsSearching(false);
      }
    }, delay);

    // 3. Clear Timeout (Cleanup Function)
    // Ini adalah bagian penting dari debounce:
    // Jika searchTerm berubah sebelum 'delay' berakhir,
    // setTimeout sebelumnya akan dibatalkan (dibersihkan).
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, selectedClinicId]);

  const handleChangeSearchTerm = (e) => {
    if (e.target.value === "") {
      setProducts([]);
      setIsSearching(false);
    } else {
      setIsSearching(true);
    }
    setSearchQuery(e.target.value.toUpperCase());
  };

  if (loadingSession) {
    return (
      <div className="p-6 bg-green-50 min-h-screen flex items-center justify-center">
        <p className="text-green-800">Memuat halaman...</p>
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
        <h1 className="text-2xl font-bold text-green-900 mb-6">Daftar Stock</h1>

        {/* --- Form Pencarian --- */}
        <div className="flex flex-col space-y-4 mb-6">
          <select
            id="clinic-select"
            value={selectedClinicId}
            onChange={handleClinicChange}
            className="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          >
            {loadingClinics ? (
              <option disabled value="">
                Memuat daftar klinik...
              </option>
            ) : (
              <option disabled value="">
                -- Pilih Klinik --
              </option>
            )}
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </select>
          {selectedClinicId && (
            <div>
              <label
                htmlFor="order-search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Cari Barang
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={handleChangeSearchTerm}
                placeholder="Masukkan nama barang..."
                className="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Cari berdasarkan nama barang.
              </p>
            </div>
          )}
        </div>

        {/* --- Akhir Form Pencarian --- */}

        {/* --- Tabel Daftar Orders --- */}
        {isSearching && (
          <p className="text-gray-600">Memuat daftar barang...</p>
        )}
        {products.length === 0 && !isSearching && searchQuery && (
          <p className="text-gray-600">Tidak ada barang yang ditemukan.</p>
        )}
        {products.length > 0 && !isSearching && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Nama Barang
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Sisa Stock
                  </th>
                  {userPermissions.includes("ADD_STOCK") && (
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr
                    key={`${product.id}-${product.business_area_id}`}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {product.name}
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
                      {`${Math.floor(
                        product.stock.quantity / product.unit_conversion
                      )} ${product.big_unit_name} ${
                        product.small_unit_tariff
                          ? `(${product.stock.quantity} ${product.small_unit_name})`
                          : ""
                      }`}
                    </td>
                    {userPermissions.includes("ADD_STOCK") && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleOpenAddStockModal(product)}
                          className="px-3 py-1 mt-2 bg-green-500 w-fit text-center text-white rounded-md hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Tambah Stock
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* --- Akhir Tabel Daftar Orders --- */}
      </div>
      <PurchaseEntryModal
        isOpen={isAddStockModalOpen}
        onClose={handleCloseAddStockModal}
        product={selectedProduct}
        fetchProducts={fetchProducts}
      />
    </div>
  );
}
