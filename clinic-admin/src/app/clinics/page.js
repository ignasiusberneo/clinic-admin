// app/clinics/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClinicsPage() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State untuk modal edit
  const [newClinic, setNewClinic] = useState({ name: "", address: "" });
  const [clinicToEdit, setClinicToEdit] = useState(null); // State untuk menyimpan data klinik yang akan diedit
  const router = useRouter();

  const fetchClinics = async () => {
    try {
      const clinicsRes = await fetch(
        "/api/business-areas?exclude_head_office=1"
      );
      if (clinicsRes.ok) {
        const clinicsData = await clinicsRes.json();
        setClinics(clinicsData);
      } else {
        setError("Gagal memuat daftar klinik.");
      }
    } catch (err) {
      console.error("Error fetching clinics:", err);
      setError("Terjadi kesalahan saat memuat klinik.");
      router.push("/login");
      router.refresh(); // Opsional
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchClinics();
  }, []);

  const openModal = () => {
    setIsModalOpen(true);
    setNewClinic({ name: "", address: "" });
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Fungsi untuk membuka modal edit
  const openEditModal = (clinic) => {
    setClinicToEdit(clinic); // Simpan data klinik yang akan diedit
    setIsEditModalOpen(true);
  };

  // Fungsi untuk menutup modal edit
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setClinicToEdit(null); // Reset data klinik yang diedit
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewClinic((prev) => ({
      ...prev,
      [name]: value.toUpperCase(),
    }));
  };

  // Fungsi untuk menangani perubahan input di form modal edit
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setClinicToEdit((prev) => ({
      ...prev,
      [name]: value.toUpperCase(),
    }));
  };

  const handleAddClinic = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch("/api/business-areas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newClinic),
      });

      if (res.ok) {
        alert("Klinik berhasil ditambahkan!");
        fetchClinics();
        closeModal();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Gagal menambahkan klinik.");
      }
    } catch (err) {
      console.error("Error adding clinic:", err);
      setError("Terjadi kesalahan saat menambahkan klinik.");
    }
  };

  // Fungsi untuk menangani update klinik
  const handleUpdateClinic = async (e) => {
    e.preventDefault();
    setError(null);

    if (!clinicToEdit) return; // Jika tidak ada klinik untuk diedit

    try {
      const res = await fetch("/api/business-areas", {
        // Gunakan endpoint PUT yang sama
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clinicToEdit), // Kirim data klinik yang telah diubah
      });

      if (res.ok) {
        alert("Klinik berhasil diperbarui!");
        fetchClinics();
        closeEditModal(); // Tutup modal setelah berhasil
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Gagal memperbarui klinik.");
      }
    } catch (err) {
      console.error("Error updating clinic:", err);
      setError("Terjadi kesalahan saat memperbarui klinik.");
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-green-50 min-h-screen flex items-center justify-center">
        <p className="text-green-800">Memuat daftar klinik...</p>
      </div>
    );
  }

  if (error && clinics.length === 0) {
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
        <h1 className="text-2xl font-bold text-green-900">Daftar Klinik</h1>
        <button
          onClick={openModal}
          className="bg-green-600 text-white py-2 px-4 rounded-lg shadow hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Tambah Klinik
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {clinics.length === 0 ? (
        <p className="mt-4">Tidak ada klinik yang ditemukan.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {clinics.map((clinic) => (
            <li
              key={clinic.id}
              className="bg-white p-4 rounded-lg shadow-sm border border-green-200 flex justify-between items-center" // Tambahkan flex layout
            >
              <div>
                <h2 className="font-semibold text-lg">{clinic.name}</h2>
                <p className="text-gray-600">
                  {clinic.address || "Alamat tidak tersedia"}
                </p>
              </div>
              {/* Tombol Edit */}
              <button
                onClick={() => openEditModal(clinic)} // Panggil openEditModal dengan data klinik
                className="bg-yellow-500 text-white py-1 px-3 rounded-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Modal Tambah Klinik (sama seperti sebelumnya) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-green-900 mb-4">
              Tambah Klinik Baru
            </h2>
            <form onSubmit={handleAddClinic}>
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nama Klinik
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newClinic.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700"
                >
                  Alamat
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={newClinic.address}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
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

      {/* Modal Edit Klinik */}
      {isEditModalOpen &&
        clinicToEdit && ( // Tambahkan kondisi clinicToEdit agar tidak error jika null
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-green-900 mb-4">
                Edit Klinik
              </h2>
              <form onSubmit={handleUpdateClinic}>
                <div className="mb-4">
                  <label
                    htmlFor="edit-name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Nama Klinik
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    name="name"
                    value={clinicToEdit.name} // Gunakan value dari clinicToEdit
                    onChange={handleEditInputChange} // Gunakan handler edit
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="edit-address"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Alamat
                  </label>
                  <input
                    type="text"
                    id="edit-address"
                    name="address"
                    value={clinicToEdit.address || ""} // Gunakan value dari clinicToEdit
                    onChange={handleEditInputChange} // Gunakan handler edit
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
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
