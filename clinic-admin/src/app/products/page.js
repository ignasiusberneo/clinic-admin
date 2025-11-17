// app/products/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    tariff: "",
    business_area_id: "",
  });
  const [productToEdit, setProductToEdit] = useState(null);
  const [businessAreas, setBusinessAreas] = useState([]);
  const [selectedBusinessAreaId, setSelectedBusinessAreaId] = useState("");
  const [LoadingProducts, setLoadingProducts] = useState(false);
  const [loadingBusinessAreas, setLoadingBusinessAreas] = useState(false);
  const router = useRouter();

  // Fungsi untuk mengambil daftar produk dari API
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);

      const productsRes = await fetch("/api/products");
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        // Karena API GET sudah menyaring is_deleted = false, kita langsung set state
        setProducts(productsData);
      } else {
        setError("Gagal memuat daftar produk.");
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Terjadi kesalahan saat memuat data.");
      router.push("/login");
      router.refresh(); // Opsional
    } finally {
      setLoadingProducts(false); // Pastikan setLoading(false) hanya di sini
    }
  };

  const handleBusinessAreaChange = (e) => {
    const businessAreaId = e.target.value;
    setSelectedBusinessAreaId(businessAreaId);
    // Anda bisa menambahkan logika untuk meng-update daftar products berdasarkan klinik di sini
    // fetchProductsByClinic(clinicId); // Contoh fungsi baru
  };

  const fetchBusinessAreas = async () => {
    try {
      setLoadingBusinessAreas(true);
      const businessAreasRes = await fetch(
        "/api/business-areas?exclude_head_office=1"
      );
      if (businessAreasRes.ok) {
        const businessAreasData = await businessAreasRes.json();
        // Karena API GET sudah menyaring is_deleted = false, kita langsung set state
        setBusinessAreas(businessAreasData);
      } else {
        setError("Gagal memuat daftar produk.");
      }
    } catch (error) {
      console.error("Error fetching business areas:", err);
    } finally {
      setLoadingBusinessAreas(false);
    }
  };

  useEffect(() => {
    if (selectedBusinessAreaId) {
      fetchProducts();
    }
  }, [selectedBusinessAreaId]);

  useEffect(() => {
    fetchBusinessAreas();
  }, []);

  const openAddModal = () => {
    setIsAddModalOpen(true);
    setNewProduct({ name: "", tariff: "" });
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const openEditModal = (product) => {
    setProductToEdit(product);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setProductToEdit(null);
  };

  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({
      ...prev,
      [name]: value.toUpperCase(),
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setProductToEdit((prev) => ({
      ...prev,
      [name]: value.toUpperCase(),
    }));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newProduct),
      });

      if (res.ok) {
        alert("Produk berhasil ditambahkan!");
        fetchProducts();
        closeAddModal();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Gagal menambahkan produk.");
      }
    } catch (err) {
      console.error("Error adding product:", err);
      setError("Terjadi kesalahan saat menambahkan produk.");
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setError(null);

    if (!productToEdit) return;

    try {
      const res = await fetch(`/api/products/${productToEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productToEdit),
      });

      if (res.ok) {
        const updatedProduct = await res.json();
        // Alternatif 1: Update state lokal
        setProducts((prevProducts) =>
          prevProducts.map((p) =>
            p.id === updatedProduct.id ? updatedProduct : p
          )
        );
        // Alternatif 2: Refetch (komentari baris di atas jika menggunakan ini)
        // fetchProducts();
        closeEditModal();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Gagal memperbarui produk.");
      }
    } catch (err) {
      console.error("Error updating product:", err);
      setError("Terjadi kesalahan saat memperbarui produk.");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Alternatif 1: Hapus dari state lokal (karena produk dihapus secara logika, tidak akan tampil lagi di fetch berikutnya)
        // setProducts((prevProducts) => prevProducts.filter(p => p.id !== id));
        // Alternatif 2: Refetch daftar produk untuk memastikan tampilan sinkron dengan API
        fetchProducts(); // <-- Panggil fetchProducts setelah DELETE berhasil
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Gagal menghapus produk.");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      setError("Terjadi kesalahan saat menghapus produk.");
    }
  };

  // --- Fungsi untuk memformat tariff ---
  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };
  // ------------------------------------

  if (loading) {
    return (
      <div className="p-6 bg-green-50 min-h-screen flex items-center justify-center">
        <p className="text-green-800">Memuat daftar produk...</p>
      </div>
    );
  }

  if (error && products.length === 0) {
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-green-900">Daftar Produk</h1>
        <button
          onClick={openAddModal}
          className="bg-green-600 text-white py-2 px-4 rounded-lg shadow hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Tambah Produk
        </button>
      </div>

      {/* --- Dropdown Filter Klinik --- */}

      {loadingBusinessAreas ? (
        <div className="mb-6">
          <p className="text-green-800">Memuat data...</p>
        </div>
      ) : (
        <div className="mb-6">
          <label
            htmlFor="business-area-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Filter Berdasarkan Klinik
          </label>
          <select
            id="business-area-filter"
            value={selectedBusinessAreaId}
            onChange={handleBusinessAreaChange}
            className="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          >
            <option value="">--Pilih Klinik--</option>
            {businessAreas.map((businessArea) => (
              <option key={businessArea.id} value={businessArea.id}>
                {businessArea.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* --- Akhir Dropdown Filter Klinik --- */}

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {products.length === 0 && selectedBusinessAreaId ? (
        <p className="mt-4">Tidak ada produk yang ditemukan.</p>
      ) : LoadingProducts ? (
        <p className="mt-4">Memuat daftar produk...</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {products.map((product) => (
            <li
              key={product.id}
              className={`bg-white p-4 rounded-lg shadow-sm border ${
                !product.is_deleted // Diubah dari product.is_active
                  ? "border-green-200"
                  : "border-red-200 bg-red-50" // Styling berbeda untuk produk dihapus
              } flex justify-between items-center`}
            >
              <div>
                <h2 className="font-semibold text-lg">{product.name}</h2>
                <p className="text-gray-600">
                  Tarif: {formatRupiah(product.tariff)}
                </p>
                {/* Tampilkan status jika perlu */}
                {product.is_deleted && ( // Diubah dari !product.is_active
                  <p className="text-xs text-red-500 italic">(Dihapus)</p>
                )}
              </div>
              <div className="flex space-x-2">
                {!product.is_deleted ? ( // Diubah dari product.is_active - Hanya tampilkan tombol Edit jika belum dihapus
                  <button
                    onClick={() => openEditModal(product)}
                    className="bg-yellow-500 text-white py-1 px-3 rounded-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    Edit
                  </button>
                ) : null}
                {/* Tombol Hapus tetap ada, tapi mungkin berlabel berbeda */}
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className={`${
                    !product.is_deleted // Diubah dari product.is_active
                      ? "bg-red-500 hover:bg-red-400"
                      : "bg-gray-500 hover:bg-gray-400" // Warna berbeda jika sudah dihapus
                  } text-white py-1 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                >
                  {!product.is_deleted ? "Hapus" : "Dihapus"}{" "}
                  {/* Diubah dari product.is_active ? "Hapus" : "Tidak Aktif" */}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal Tambah Produk */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-green-900 mb-4">
              Tambah Produk Baru
            </h2>
            <form onSubmit={handleAddProduct}>
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Klinik
                </label>
                <select
                  id="business_area_id"
                  name="business_area_id"
                  value={newProduct.business_area_id}
                  onChange={handleAddInputChange}
                  className="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">--Pilih Klinik--</option>
                  {businessAreas.map((businessArea) => (
                    <option key={businessArea.id} value={businessArea.id}>
                      {businessArea.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nama Produk
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newProduct.name}
                  onChange={handleAddInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="tariff"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tarif (Rp)
                </label>
                <input
                  type="number"
                  id="tariff"
                  name="tariff"
                  value={newProduct.tariff}
                  onChange={handleAddInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white py-2 px-4 rounded-md shadow hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Produk */}
      {isEditModalOpen && productToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-green-900 mb-4">
              Edit Produk
            </h2>
            <form onSubmit={handleUpdateProduct}>
              <div className="mb-4">
                <label
                  htmlFor="edit-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nama Produk
                </label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  value={productToEdit.name}
                  onChange={handleEditInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="edit-tariff"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tariff (Rp)
                </label>
                <input
                  type="number"
                  id="edit-tariff"
                  name="tariff"
                  value={productToEdit.tariff}
                  onChange={handleEditInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white py-2 px-4 rounded-md shadow hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Perbarui
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
