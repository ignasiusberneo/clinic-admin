// app/services/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AddServiceModal from "./AddServiceModal";

export default function ServicesPage() {
  const [clinics, setClinics] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState(""); // State untuk ID klinik yang dipilih
  const [services, setServices] = useState([]); // State untuk menyimpan daftar service
  const [products, setProducts] = useState([]); // State untuk menyimpan daftar product
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false); // Loading untuk fetch service
  const [loadingProducts, setLoadingProducts] = useState(false); // Loading untuk fetch product
  const [error, setError] = useState(null); // Error untuk tampilan utama/list
  const [modalError, setModalError] = useState(null); // State untuk error spesifik di modal tambah
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newService, setNewService] = useState({
    clinic_id: "",
    name: "", // Tambahkan field nama layanan (dari model service)
    price: "",
    selectedProductIds: [], // Ganti product_id menjadi array untuk multiple select
  });
  const [serviceToEdit, setServiceToEdit] = useState(null); // State untuk service yang akan diedit
  const [businessAreas, setBusinessAreas] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [selectedBusinessAreaId, setSelectedBusinessAreaId] = useState("");
  const [userPermissions, setUserPermissions] = useState([]);
  const router = useRouter();

  const checkSession = async () => {
    try {
      setLoading(true);
      const sessionRes = await fetch("/api/check-session");
      const sessionData = await sessionRes.json();

      if (sessionRes.status !== 200 || !sessionData.authenticated) {
        router.push("/schedules");
        return;
      }

      const userPermissions = sessionData.user.permissions;
      if (!userPermissions.includes("SERVICE_ACCESS")) {
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

  const fetchClinics = async () => {
    try {
      setLoadingClinics(true);
      const clinicsRes = await fetch(
        "/api/business-areas?exclude_head_office=1"
      );
      if (clinicsRes.ok) {
        const clinicsData = await clinicsRes.json();
        // Karena API GET sudah menyaring is_deleted = false, kita langsung set state
        setClinics(clinicsData);
      } else {
        setError("Gagal memuat daftar produk.");
      }
    } catch (error) {
      console.error("Error fetching business areas:", err);
    } finally {
      setLoadingClinics(false);
    }
  };

  // Fetch daftar klinik saat komponen dimuat
  useEffect(() => {
    fetchClinics();
  }, []);

  // Fetch daftar produk saat komponen dimuat
  const fetchProducts = async (clinicId) => {
    if (!clinicId) return; // Pastikan ada ID klinik

    try {
      setLoadingProducts(true);
      // PERBAIKAN: Tambahkan business_area_id sebagai filter di API Produk
      // API Products Anda harus mendukung filtering berdasarkan business_area_id
      const productsRes = await fetch(
        `/api/products?business_area_id=${clinicId}`
      );

      if (productsRes.ok) {
        const productData = await productsRes.json();
        console.log(
          `Produk yang diambil untuk klinik ${clinicId}:`,
          productData
        ); // Debug log
        setProducts(productData);
      } else {
        console.error("Gagal memuat daftar produk.");
        setProducts([]);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (selectedClinicId) {
      // PERBAIKAN: Pastikan ini dipanggil setiap kali klinik berubah
      fetchServices();

      // PERBAIKAN UTAMA: Panggil fetchProducts DENGAN ID klinik
      fetchProducts(selectedClinicId);

      // Reset state newService
      setNewService({
        clinic_id: selectedClinicId,
        name: "",
        price: "",
        selectedProductIds: [],
      });
    } else {
      setServices([]);
      setProducts([]);
    }
  }, [selectedClinicId]);

  // Fungsi untuk mengambil daftar service berdasarkan clinic_id
  const fetchServices = async () => {
    setLoadingServices(true);
    setError(null); // Reset error utama saat fetch baru dimulai

    try {
      const servicesRes = await fetch(
        `/api/services?business_area_id=${selectedClinicId}`
      );
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData);
      } else {
        setError("Gagal memuat daftar layanan untuk klinik ini.");
        setServices([]); // Kosongkan daftar jika error
      }
    } catch (err) {
      console.error("Error fetching services:", err);
      setError("Terjadi kesalahan saat memuat data layanan.");
      setServices([]); // Kosongkan daftar jika error
    } finally {
      setLoadingServices(false);
    }
  };

  // Handler saat dropdown klinik berubah
  const handleClinicChange = (e) => {
    const clinicId = e.target.value;
    setSelectedClinicId(clinicId);
  };

  // Fungsi untuk membuka modal tambah
  const openAddModal = () => {
    // Isi clinic_id dari dropdown yang dipilih
    setNewService({
      clinic_id: selectedClinicId,
      name: "",
      price: "",
      selectedProductIds: [],
    });
    setModalError(null); // Reset error modal saat membuka
    setIsAddModalOpen(true);
  };

  // Fungsi untuk menutup modal tambah
  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  // Fungsi untuk membuka modal edit
  const openEditModal = (service) => {
    setServiceToEdit(service);
    setIsEditModalOpen(true);
  };

  // Fungsi untuk menutup modal edit
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setServiceToEdit(null);
  };

  // Handler untuk perubahan input di form modal tambah
  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "price") {
      const cleanString = value.replace(/[^0-9]/g, "");
      let formattedValue = cleanString === "" ? 0 : parseInt(cleanString, 10);
      if (isNaN(formattedValue)) {
        formattedValue = 0;
      }
      setNewService((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
    } else {
      setNewService((prev) => ({
        ...prev,
        [name]: value.toUpperCase(),
      }));
    }
  };

  // Handler untuk perubahan input di form modal edit
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setServiceToEdit((prev) => ({
      ...prev,
      [name]: value.toUpperCase(),
    }));
  };

  // Fungsi untuk menambah service
  const handleAddService = async (e) => {
    e.preventDefault();
    setModalError(null);

    // Perlu validasi: setidaknya harus ada 1 produk yang dipilih
    if (newService.selectedProductIds.length === 0) {
      setModalError("Anda harus memilih minimal satu produk.");
      return;
    }

    // Data yang dikirim ke API harus mencakup 'name', 'price', dan 'productIds'
    const payload = {
      name: newService.name,
      price: parseInt(newService.price),
      business_area_id: parseInt(newService.clinic_id),
      productIds: newService.selectedProductIds,
    };

    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Layanan berhasil ditambahkan!");
        fetchServices();
        closeAddModal();
      } else {
        const errorData = await res.json();
        setModalError(errorData.error || "Gagal menambahkan layanan.");
      }
    } catch (err) {
      console.error("Error adding service:", err);
      setModalError("Terjadi kesalahan saat menambahkan layanan.");
    }
  };

  const handleDeleteService = async (id) => {
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Layanan berhasil dihapus!");
        fetchServices();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Gagal menghapus layanan.");
      }
    } catch (err) {
      console.error("Error deleting service:", err);
      setError("Terjadi kesalahan saat menghapus layanan.");
    }
  };

  // Fungsi untuk mengedit service
  const handleUpdateService = async (e) => {
    e.preventDefault();
    setError(null); // Reset error utama sebelum submit

    if (!serviceToEdit) return;

    try {
      console.log(JSON.stringify(serviceToEdit));
      const res = await fetch(`/api/services/${serviceToEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serviceToEdit),
      });

      if (res.ok) {
        alert("Layanan berhasil diperbarui!");
        fetchServices();
        closeEditModal();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Gagal memperbarui layanan.");
      }
    } catch (err) {
      console.error("Error updating service:", err);
      setError("Terjadi kesalahan saat memperbarui layanan.");
    }
  };

  // Fungsi untuk menghapus service
  //   const handleDeleteService = async (id) => {
  //     if (!confirm("Apakah Anda yakin ingin menghapus layanan ini?")) {
  //       return;
  //     }

  //     try {
  //       const res = await fetch(`/api/services/${id}`, {
  //         method: "DELETE",
  //       });

  //       if (res.ok) {
  //         // Hapus service dari state lokal
  //         setServices((prevServices) => prevServices.filter((s) => s.id !== id));
  //       } else {
  //         const errorData = await res.json();
  //         setError(errorData.error || "Gagal menghapus layanan.");
  //       }
  //     } catch (err) {
  //       console.error("Error deleting service:", err);
  //       setError("Terjadi kesalahan saat menghapus layanan.");
  //     }
  //   };

  if (loading) {
    return (
      <div className="p-6 bg-green-50 min-h-screen flex items-center justify-center">
        <p className="text-green-800">Memuat halaman...</p>
      </div>
    );
  }

  if (error && services.length === 0) {
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
      <h1 className="text-2xl font-bold text-green-900 mb-6">Daftar Layanan</h1>

      {/* Dropdown untuk memilih klinik */}
      <div className="mb-6">
        <label
          htmlFor="clinic-select"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Pilih Klinik:
        </label>
        <select
          id="clinic-select"
          value={selectedClinicId}
          onChange={handleClinicChange}
          className="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
        >
          {loadingClinics ? (
            <option value="">Memuat daftar klinik...</option>
          ) : (
            <option value="">-- Pilih Klinik --</option>
          )}
          {clinics.map((clinic) => (
            <option key={clinic.id} value={clinic.id}>
              {clinic.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tombol Tambah Layanan - muncul jika klinik dipilih */}
      {selectedClinicId && (
        <div className="mb-6">
          <button
            onClick={openAddModal}
            className="bg-green-600 text-white py-2 px-4 rounded-lg shadow hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Tambah Layanan
          </button>
        </div>
      )}

      {/* Error utama (di atas list, jika fetch services gagal) */}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Tampilkan daftar layanan jika klinik dipilih dan data tersedia */}
      {selectedClinicId &&
        !loadingServices &&
        services.length === 0 &&
        !error && (
          <p className="mt-4">
            Tidak ada layanan yang ditemukan untuk klinik ini.
          </p>
        )}

      {loadingServices && (
        <p className="mt-4 text-green-800">Memuat daftar layanan...</p>
      )}

      {!loadingServices && services.length > 0 && (
        <ul className="mt-4 space-y-2">
          {services.map((service, index) => (
            <li
              key={service.id}
              className="bg-white p-4 rounded-lg shadow-sm border border-green-200 flex justify-between items-center"
            >
              <div>
                <h2 className="font-semibold text-lg">{service.name || ""}</h2>
                <p className="text-gray-600">
                  Biaya:{" "}
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                  }).format(service.price)}
                </p>
                {/* Opsional: Tampilkan status jika perlu */}
                {/* {!service.is_active && (
                  <p className="text-xs text-red-500 italic">(Tidak Aktif)</p>
                )} */}
              </div>
              {!service.is_default && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(service)}
                    className="bg-yellow-500 text-white py-1 px-3 rounded-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    className="bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Hapus
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Modal Tambah Layanan */}
      <AddServiceModal
        handleAddService={handleAddService}
        newService={newService}
        handleAddInputChange={handleAddInputChange}
        products={products}
        closeAddModal={closeAddModal}
        isAddModalOpen={isAddModalOpen}
        loadingProducts={loadingProducts}
        businessAreaId={selectedClinicId}
        fetchServices={fetchServices}
      />

      {/* Modal Edit Layanan */}
      {isEditModalOpen && serviceToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-green-900 mb-4">
              Edit Layanan
            </h2>

            {/* Error utama tetap ditampilkan di modal edit jika diperlukan */}
            {error && <p className="text-red-500 mb-4">{error}</p>}

            <form onSubmit={handleUpdateService}>
              <div className="mb-4">
                <label
                  htmlFor="edit-product_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nama
                </label>
                {/* Untuk edit, tampilkan produk saat ini dan disable jika tidak ingin bisa diganti */}
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  value={serviceToEdit.name}
                  onChange={handleEditInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
                {/* Jika ingin bisa diganti, gunakan select seperti di modal tambah */}
                {/* <select
                  id="edit-product_id"
                  name="product_id"
                  value={serviceToEdit.product_id}
                  onChange={handleEditInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Rp {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      }).format(product.tariff)})
                    </option>
                  ))}
                </select> */}
              </div>
              <div className="mb-4">
                <label
                  htmlFor="edit-price"
                  className="block text-sm font-medium text-gray-700"
                >
                  Harga Layanan (Rp)
                </label>
                <input
                  type="number"
                  id="edit-price"
                  name="price"
                  value={serviceToEdit.price}
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
