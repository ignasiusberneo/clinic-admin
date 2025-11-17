// app/orders/detail/[orderId]/[orderItemId]/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import debounce from "lodash/debounce";

export default function AssignPatientsToOrderItemPage() {
  const [order, setOrder] = useState(null);
  const [orderItem, setOrderItem] = useState(null);
  const [patients, setPatients] = useState([]); // Array of arrays untuk suggestion list per field
  const [selectedPatients, setSelectedPatients] = useState([]); // [{ id: null, searchQuery: '' }, ...] sebanyak quantity
  const [loading, setLoading] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [error, setError] = useState(null);
  const [servicesError, setServicesError] = useState(null); // Error untuk fetch services
  const [schedulesError, setSchedulesError] = useState(null); // Error untuk fetch schedules
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // --- State untuk modal tambah pasien ---
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [modalTabIndex, setModalTabIndex] = useState(0); // 0: Pilih, 1: Buat
  const [patientSearchQuery, setPatientSearchQuery] = useState(""); // Input pencarian pasien
  const [patientSearchResults, setPatientSearchResults] = useState([]); // Hasil pencarian pasien
  const [isSearchingPatient, setIsSearchingPatient] = useState(false); // Loading saat pencarian
  const [patientSearchError, setPatientSearchError] = useState(null); // Error pencarian pasien
  const [newPatient, setNewPatient] = useState({
    full_name: "",
    gender: "",
    date_of_birth: "",
    whatsapp_number: "",
    address: "",
    referral_type_id: 1, // Default
    referral_id: "", // ID pasien perujuk, opsional
  });
  const [addPatientError, setAddPatientError] = useState(null);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [referralTypes, setReferralTypes] = useState([]); // Untuk dropdown referral type
  // State untuk pencarian pasien perujuk di modal Tab Buat
  const [referralSearchQuery, setReferralSearchQuery] = useState("");
  const [referralSearchResults, setReferralSearchResults] = useState([]);
  const [isSearchingReferral, setIsSearchingReferral] = useState(false);
  const [referralSearchError, setReferralSearchError] = useState(null);
  const [selectedReferralPatient, setSelectedReferralPatient] = useState(null);
  // Simpan indeks field yang memicu pembuatan pasien baru
  const [fieldIndexForNewPatient, setFieldIndexForNewPatient] = useState(null);
  // --- Akhir State Modal ---

  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId;
  const orderItemId = params.orderItemId;

  // --- 1. Fetch detail order dan order_item ---
  useEffect(() => {
    const fetchOrderAndItem = async () => {
      try {
        const orderRes = await fetch(`/api/orders/${orderId}`);

        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setOrder(orderData);

          // Temukan order_item yang sesuai dengan ID dari params
          const foundItem = orderData.order_items?.find(
            (item) => item.id === parseInt(orderItemId)
          );
          if (foundItem) {
            setOrderItem(foundItem);
            // Inisialisasi state selectedPatients berdasarkan quantity
            setSelectedPatients(
              Array(foundItem.quantity)
                .fill()
                .map(() => ({ id: null, searchQuery: "" }))
            );
            // Inisialisasi state patients untuk suggestion list
            setPatients(
              Array(foundItem.quantity)
                .fill()
                .map(() => [])
            );
          } else {
            setError(
              `Item order dengan ID ${orderItemId} tidak ditemukan dalam order ${orderId}.`
            );
          }
        } else {
          setError("Gagal memuat detail order.");
        }
      } catch (err) {
        console.error("Error fetching order and item details:", err);
        setError("Terjadi kesalahan saat memuat data.");
        router.push("/login");
        router.refresh();
      } finally {
        setLoading(false);
      }
    };

    if (orderId && orderItemId) {
      fetchOrderAndItem();
    }
  }, [orderId, orderItemId, router]);

  // --- 2. Fetch referral types ---
  useEffect(() => {
    const fetchReferralTypes = async () => {
      try {
        const res = await fetch("/api/referral-types");
        if (res.ok) {
          const data = await res.json();
          setReferralTypes(data);
        } else {
          console.error("Gagal memuat referral types.");
          setReferralTypes([]);
        }
      } catch (err) {
        console.error("Error fetching referral types:", err);
        setReferralTypes([]);
      }
    };

    fetchReferralTypes();
  }, [router]);

  // --- 3. Fungsi untuk mencari pasien (dengan debounce) ---
  const searchPatientsCore = async (query, index) => {
    // Validasi tipe data query
    if (typeof query !== "string" || !query.trim()) {
      setPatients((prev) => {
        const newPatients = [...prev];
        newPatients[index] = [];
        return newPatients;
      });
      return;
    }

    setLoadingPatients(true);

    try {
      const searchRes = await fetch(
        `/api/patients/search?q=${encodeURIComponent(query.trim())}&limit=10`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        setPatients((prev) => {
          const newPatients = [...prev];
          newPatients[index] = searchData;
          return newPatients;
        });
      } else {
        console.error("Gagal mencari pasien:", await searchRes.text());
        setPatients((prev) => {
          const newPatients = [...prev];
          newPatients[index] = [];
          return newPatients;
        });
      }
    } catch (err) {
      console.error("Error searching patients:", err);
      setPatients((prev) => {
        const newPatients = [...prev];
        newPatients[index] = [];
        return newPatients;
      });
    } finally {
      setLoadingPatients(false);
    }
  };

  const debouncedSearchRef = useRef(debounce(searchPatientsCore, 300)).current;

  useEffect(() => {
    return () => {
      debouncedSearchRef.cancel();
    };
  }, [debouncedSearchRef]);

  const handlePatientSearchChange = (index, query) => {
    const updatedPatients = [...selectedPatients];
    updatedPatients[index].searchQuery = query;
    // updatedPatients[index].id = null; // Jangan reset id jika query berubah, agar tetap bisa diedit
    setSelectedPatients(updatedPatients);

    // Update state patients untuk indeks ini (untuk dropdown)
    setPatients((prev) => {
      const newPatients = [...prev];
      newPatients[index] = []; // Reset dropdown sementara
      return newPatients;
    });

    // Panggil pencarian dengan debounce
    if (query && query.length >= 2) {
      debouncedSearchRef(query, index);
    } else {
      // Jika kurang dari 2 karakter, kosongkan hasil
      setPatients((prev) => {
        const newPatients = [...prev];
        newPatients[index] = [];
        return newPatients;
      });
    }
  };

  const handlePatientSelect = (index, patient) => {
    const updatedPatients = [...selectedPatients];
    updatedPatients[index] = { id: patient.id, searchQuery: patient.full_name };
    setSelectedPatients(updatedPatients);

    // Sembunyikan dropdown hasil pencarian untuk field ini
    setPatients((prev) => {
      const newPatients = [...prev];
      newPatients[index] = []; // Kosongkan hasil untuk indeks ini
      return newPatients;
    });
  };

  // --- 4. Handler untuk submit assign pasien ---
  const handleSubmitAssign = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    // Validasi: Pastikan semua slot pasien terisi
    if (selectedPatients.some((p) => !p.id)) {
      setSubmitError("Harap lengkapi semua slot nama pasien.");
      setSubmitting(false);
      return;
    }

    try {
      // Siapkan data untuk dikirim ke API
      const assignData = {
        patient_ids: selectedPatients.map((p) => p.id),
        // Anda bisa menyertakan clinic_id dan schedule_id jika API memerlukan validasi tambahan
        // clinic_id: order.clinic_id,
        // schedule_id: orderItem.schedule_id, // Ambil dari order_item
      };

      const res = await fetch(
        `/api/orders/${orderId}/items/${orderItem.id}/assign-patients`,
        {
          method: "PATCH", // Gunakan PATCH untuk update status assignment
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(assignData),
        }
      );

      if (res.ok) {
        alert("Pasien berhasil ditambahkan.");
        router.push(`/orders/detail/${orderId}`);
      } else {
        const errorData = await res.json();
        setSubmitError(errorData.error || "Gagal menugaskan pasien.");
      }
    } catch (err) {
      console.error("Error assigning patients:", err);
      setSubmitError("Terjadi kesalahan saat menugaskan pasien.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- 5. Fungsi untuk modal tambah pasien ---
  const openAddPatientModal = (indexForNewPatient) => {
    setModalTabIndex(0); // Default ke tab "Pilih"
    setPatientSearchQuery(""); // Reset query pencarian
    setPatientSearchResults([]); // Reset hasil pencarian
    setIsSearchingPatient(false); // Matikan loading pencarian
    setPatientSearchError(null); // Reset error pencarian

    setNewPatient({
      // Reset form buat pasien
      full_name: "",
      gender: "",
      date_of_birth: "",
      whatsapp_number: "",
      address: "",
      referral_type_id: 1,
      referral_id: "",
    });
    setAddPatientError(null); // Reset error tambah
    setReferralSearchQuery(""); // Reset query referral di modal
    setReferralSearchResults([]); // Reset hasil referral di modal
    setIsSearchingReferral(false); // Matikan loading referral di modal
    setReferralSearchError(null); // Reset error referral di modal

    setFieldIndexForNewPatient(indexForNewPatient); // Simpan indeks field
    setIsAddPatientModalOpen(true);
  };

  const closeAddPatientModal = () => {
    setIsAddPatientModalOpen(false);
    setModalTabIndex(0);
    setPatientSearchQuery("");
    setPatientSearchResults([]);
    setIsSearchingPatient(false);
    setPatientSearchError(null);
    setNewPatient({
      full_name: "",
      gender: "",
      date_of_birth: "",
      whatsapp_number: "",
      address: "",
      referral_type_id: 1,
      referral_id: "",
    });
    setAddPatientError(null);
    setReferralSearchQuery("");
    setReferralSearchResults([]);
    setIsSearchingReferral(false);
    setReferralSearchError(null);
    setFieldIndexForNewPatient(null);
  };

  // --- Handler untuk Tab di Modal ---
  const handleTabClick = (index) => {
    setModalTabIndex(index);
  };

  // --- Handler untuk Pencarian Pasien di Modal Tab Pilih ---
  const searchPatientInModalCore = async (query) => {
    if (typeof query !== "string" || !query.trim()) {
      setPatientSearchResults([]);
      return;
    }

    setIsSearchingPatient(true);
    setPatientSearchError(null);

    try {
      const searchRes = await fetch(
        `/api/patients/search?q=${encodeURIComponent(query.trim())}&limit=10`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        setPatientSearchResults(searchData);
      } else {
        console.error("Gagal mencari pasien di modal:", await searchRes.text());
        setPatientSearchResults([]);
      }
    } catch (err) {
      console.error("Error searching patients in modal:", err);
      setPatientSearchError("Terjadi kesalahan saat mencari pasien.");
      setPatientSearchResults([]);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const debouncedSearchPatientInModalRef = useRef(
    debounce(searchPatientInModalCore, 300)
  ).current;

  useEffect(() => {
    return () => {
      debouncedSearchPatientInModalRef.cancel();
    };
  }, [debouncedSearchPatientInModalRef]);

  const handlePatientSearchInModalChange = (e) => {
    const query = e.target.value;
    setPatientSearchQuery(query.toUpperCase());

    if (query && query.length >= 2) {
      debouncedSearchPatientInModalRef(query);
    } else {
      setPatientSearchResults([]);
      setIsSearchingPatient(false);
    }
  };

  const handlePatientSelectInModal = (patient) => {
    // Tambahkan pasien yang dipilih ke field yang sesuai di halaman utama
    if (fieldIndexForNewPatient !== null) {
      const updatedPatients = [...selectedPatients];
      updatedPatients[fieldIndexForNewPatient] = {
        id: patient.id,
        searchQuery: patient.full_name,
      };
      setSelectedPatients(updatedPatients);

      // Sembunyikan dropdown hasil pencarian untuk field itu di halaman utama (opsional)
      setPatients((prev) => {
        const newPatients = [...prev];
        newPatients[fieldIndexForNewPatient] = [];
        return newPatients;
      });
    }
    closeAddPatientModal(); // Tutup modal setelah memilih
  };
  // --- Akhir Handler Tab Pilih ---

  // --- Handler untuk Input di Modal Tab Buat ---
  const handleAddPatientInputChange = (e) => {
    const { name, value } = e.target;
    setNewPatient((prev) => ({ ...prev, [name]: value.toUpperCase() }));
  };

  // --- Handler untuk Pencarian Referral di Modal Tab Buat ---
  const searchReferralInModalCore = async (query) => {
    if (typeof query !== "string" || !query.trim()) {
      setReferralSearchResults([]);
      return;
    }

    setIsSearchingReferral(true);
    setReferralSearchError(null);

    try {
      const searchRes = await fetch(
        `/api/patients/search?q=${encodeURIComponent(query.trim())}&limit=10`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        setReferralSearchResults(searchData);
      } else {
        console.error(
          "Gagal mencari pasien perujuk di modal:",
          await searchRes.text()
        );
        setReferralSearchResults([]);
      }
    } catch (err) {
      console.error("Error searching referral patients in modal:", err);
      setReferralSearchError("Terjadi kesalahan saat mencari pasien.");
      setReferralSearchResults([]);
    } finally {
      setIsSearchingReferral(false);
    }
  };

  const debouncedSearchReferralInModalRef = useRef(
    debounce(searchReferralInModalCore, 300)
  ).current;

  useEffect(() => {
    return () => {
      debouncedSearchReferralInModalRef.cancel();
    };
  }, [debouncedSearchReferralInModalRef]);

  const handleReferralSearchInModalChange = (e) => {
    const query = e.target.value;
    setReferralSearchQuery(query.toUpperCase());
    setNewPatient((prev) => ({ ...prev, referral_id: "" })); // Reset ID jika query berubah

    if (query && query.length >= 1) {
      debouncedSearchReferralInModalRef(query);
    } else {
      setReferralSearchResults([]);
      setIsSearchingReferral(false);
    }
  };

  const handleReferralSelectInModal = (patient) => {
    setNewPatient((prev) => ({ ...prev, referral_id: patient.id }));
    setSelectedReferralPatient(patient);
    setReferralSearchQuery(patient.full_name);
    setReferralSearchResults([]);
    setIsSearchingReferral(false);
  };
  // --- Akhir Handler Tab Buat ---

  const handleClearReferral = () => {
    // Reset state pilihan
    setSelectedReferralPatient(null);
    setReferralSearchQuery("");
    setReferralSearchResults([]);
    setIsSearchingReferral(false); // Pastikan loading hilang

    // Reset ID perujuk di form utama
    setNewPatient((prev) => ({ ...prev, referral_id: null })); // Gunakan null untuk field Int? di Prisma
  };

  // --- Handler untuk Submit di Modal Tab Buat ---
  const handleAddNewPatientInModal = async (e) => {
    e.preventDefault();
    setIsAddingPatient(true);
    setAddPatientError(null);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPatient),
      });

      if (res.ok) {
        const createdPatient = await res.json();
        // Tambahkan pasien baru ke field yang sesuai di halaman utama
        if (fieldIndexForNewPatient !== null) {
          const updatedPatients = [...selectedPatients];
          updatedPatients[fieldIndexForNewPatient] = {
            id: createdPatient.id,
            searchQuery: createdPatient.full_name,
          };
          setSelectedPatients(updatedPatients);

          // Sembunyikan dropdown hasil pencarian untuk field itu di halaman utama (opsional)
          setPatients((prev) => {
            const newPatients = [...prev];
            newPatients[fieldIndexForNewPatient] = [];
            return newPatients;
          });
        }

        closeAddPatientModal();
      } else {
        const errorData = await res.json();
        setAddPatientError(errorData.error || "Gagal menambahkan pasien.");
      }
    } catch (err) {
      console.error("Error adding patient in modal:", err);
      setAddPatientError("Terjadi kesalahan saat menambahkan pasien.");
    } finally {
      setIsAddingPatient(false);
    }
  };
  // --- Akhir Handler Modal ---

  if (loading) {
    return (
      <div className="p-6 bg-green-50 min-h-screen flex items-center justify-center">
        <p className="text-green-800">Memuat data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-green-50 min-h-screen">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => router.push("/orders")} // Arahkan kembali ke daftar order
          className="mt-4 bg-green-600 text-white py-1 px-3 rounded hover:bg-green-500"
        >
          Kembali ke Daftar Order
        </button>
      </div>
    );
  }

  if (!order || !orderItem) {
    // Jika fetch sukses tapi data tidak ditemukan
    router.push("/orders");
    return null;
  }

  return (
    <div className="p-6 bg-green-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-green-900 mb-4">Data Pasien</h1>

        {/* Informasi Order dan Item */}

        {/* Form Assign Pasien */}
        <form onSubmit={handleSubmitAssign}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-green-800 mb-4">
              Masukkan Nama Pasien
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Silakan cari atau masukkan nama pasien untuk setiap slot. Gunakan
              tombol "+" untuk mencari atau membuat pasien baru.
            </p>

            {selectedPatients.map((patient, index) => (
              <div key={index} className="mb-4 relative">
                <label
                  htmlFor={`patient-search-${index}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Pasien {index + 1}
                </label>
                <div className="flex">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      id={`patient-search-${index}`}
                      value={patient.searchQuery}
                      onChange={(e) =>
                        handlePatientSearchChange(index, e.target.value)
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      // disabled={!selectedPatients || loadingPatients} // Hanya disable jika semua field kosong atau sedang loading
                      disabled // Disable jika sedang memuat data awal
                    />
                    {patient.id && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-green-600">
                        ✓ {/* Centang kecil */}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openAddPatientModal(index)}
                    className="px-3 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    title="Cari atau Tambah Pasien Baru"
                  >
                    +
                  </button>
                </div>

                {/* Dropdown hasil pencarian */}
              </div>
            ))}

            {selectedPatients.some((p) => !p.id) && (
              <p className="text-sm text-yellow-600 mt-2">
                Harap pilih atau tambahkan pasien untuk semua slot.
              </p>
            )}
          </div>

          {/* Tombol Submit */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => router.push(`/orders/detail/${orderId}`)} // Kembali ke detail order utama
              className="bg-red-600 text-white py-1 px-3 rounded hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={submitting || selectedPatients.some((p) => !p.id)}
              className={`py-2 px-6 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                submitting || selectedPatients.some((p) => !p.id)
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
              }`}
            >
              {submitting ? "Memproses..." : "Submit"}
            </button>
          </div>

          {/* Error Submit */}
          {submitError && (
            <p className="text-red-500 mt-4 text-center">{submitError}</p>
          )}
        </form>

        {/* Tombol Kembali */}
      </div>

      {/* --- Modal Tambah Pasien --- */}
      {isAddPatientModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-green-900">
                Tambah Pasien
              </h2>
              <button
                onClick={closeAddPatientModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => handleTabClick(0)}
                  className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${
                    modalTabIndex === 0
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Pilih Pasien
                </button>
                <button
                  onClick={() => handleTabClick(1)}
                  className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${
                    modalTabIndex === 1
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Buat Pasien Baru
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {modalTabIndex === 0 && (
              <div>
                {patientSearchError && (
                  <p className="text-red-500 text-sm mb-2">
                    {patientSearchError}
                  </p>
                )}
                <div className="mb-4">
                  <label
                    htmlFor="patient-modal-search"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Cari Pasien
                  </label>
                  <input
                    type="text"
                    id="patient-modal-search"
                    value={patientSearchQuery}
                    onChange={handlePatientSearchInModalChange}
                    placeholder="Ketik nama pasien..."
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                  {isSearchingPatient && (
                    <p className="text-xs text-gray-500 mt-1">Mencari...</p>
                  )}
                </div>

                {/* Dropdown hasil pencarian */}
                <div className="overflow-y-auto max-h-60">
                  {patientSearchResults.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {patientSearchResults.map((p) => (
                        <li
                          key={p.id}
                          onClick={() => handlePatientSelectInModal(p)}
                          className="cursor-pointer py-2 px-3 hover:bg-green-50"
                        >
                          <div className="flex justify-between">
                            <span className="font-normal">{p.full_name}</span>
                            {p.whatsapp_number && (
                              <span className="ml-2 text-xs text-gray-500 truncate">
                                ({p.whatsapp_number})
                              </span>
                            )}
                          </div>
                          <span className="block text-xs text-gray-500 truncate">
                            {p.date_of_birth &&
                              `Lahir: ${new Date(
                                p.date_of_birth
                              ).toLocaleDateString("id-ID")}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    !isSearchingPatient && (
                      <p className="text-gray-500 text-sm py-2 text-center">
                        {patientSearchQuery
                          ? "Pasien tidak ditemukan."
                          : "Mulai ketik untuk mencari."}
                      </p>
                    )
                  )}
                </div>
              </div>
            )}

            {modalTabIndex === 1 && (
              <form onSubmit={handleAddNewPatientInModal}>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                  {addPatientError && (
                    <p className="text-red-500 mb-4">{addPatientError}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label
                        htmlFor="new-referral_type_id"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Jenis Referral *
                      </label>
                      <select
                        id="new-referral_type_id"
                        name="referral_type_id"
                        value={newPatient.referral_type_id}
                        onChange={handleAddPatientInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        required
                      >
                        {referralTypes.map((rt) => (
                          <option key={rt.id} value={rt.id}>
                            {rt.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Field Cari Pasien Perujuk */}
                  </div>
                  {newPatient.referral_type_id &&
                    newPatient.referral_type_id == 1 && (
                      <div className="mb-4">
                        <div className="mb-4 relative">
                          <label
                            htmlFor="new-referral_search"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Cari Pasien Referral
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              id="new-referral_search"
                              // ⭐ 1. Atur value: Tampilkan nama pasien jika sudah dipilih, jika tidak, tampilkan query.
                              value={
                                selectedReferralPatient
                                  ? selectedReferralPatient.full_name
                                  : referralSearchQuery
                              }
                              onChange={handleReferralSearchInModalChange}
                              placeholder="Ketik nama pasien perujuk..."
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                              // ⭐ 2. Atur status disabled
                              disabled={!!selectedReferralPatient}
                            />

                            {/* KONDISIONAL: Tampilkan Loading Spinner atau Clear Button */}

                            {isSearchingReferral ? (
                              // Spinner (Saat mencari)
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg
                                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-500"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                              </div>
                            ) : selectedReferralPatient ? (
                              // ⭐ 3. Clear Button (Saat sudah dipilih)
                              <button
                                type="button"
                                onClick={handleClearReferral}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                                aria-label="Clear referral selection"
                              >
                                {/* Ikon X/Close */}
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  className="w-5 h-5"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            ) : null}
                          </div>
                          {/* Dropdown hasil pencarian referral */}
                          {referralSearchResults.length > 0 &&
                            !selectedReferralPatient && (
                              <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <ul className="max-h-60 overflow-auto py-1 text-base sm:text-sm">
                                  {referralSearchResults.map((p) => (
                                    <li
                                      key={p.id}
                                      onClick={() =>
                                        handleReferralSelectInModal(p)
                                      }
                                      className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-green-100"
                                    >
                                      <div className="flex justify-between">
                                        <span className="block truncate font-normal">
                                          {p.full_name}
                                        </span>
                                        {p.whatsapp_number && (
                                          <span className="ml-2 text-xs text-gray-500 truncate">
                                            ({p.whatsapp_number})
                                          </span>
                                        )}
                                      </div>
                                      <span className="block text-xs text-gray-500 truncate">
                                        {p.date_of_birth &&
                                          `Lahir: ${new Date(
                                            p.date_of_birth
                                          ).toLocaleDateString("id-ID")}`}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          {/* Pesan tidak ditemukan */}
                          {!isSearchingReferral &&
                            referralSearchResults.length === 0 &&
                            referralSearchQuery.trim() !== "" &&
                            !selectedReferralPatient && (
                              <p className="text-xs text-gray-500 mt-1">
                                Pasien tidak ditemukan.
                              </p>
                            )}
                          {/* Error */}
                          {referralSearchError && (
                            <p className="text-red-500 text-xs mt-1">
                              {referralSearchError}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  <div className="mb-4">
                    <label
                      htmlFor="new-full_name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      id="new-full_name"
                      name="full_name"
                      value={newPatient.full_name}
                      onChange={handleAddPatientInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label
                        htmlFor="new-gender"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Jenis Kelamin *
                      </label>
                      <select
                        id="new-gender"
                        name="gender"
                        value={newPatient.gender}
                        onChange={handleAddPatientInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        required
                      >
                        <option value="">Pilih</option>
                        <option value="LAKI-LAKI">LAKI-LAKI</option>
                        <option value="PEREMPUAN">PEREMPUAN</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="new-date_of_birth"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Tanggal Lahir *
                      </label>
                      <input
                        type="date"
                        id="new-date_of_birth"
                        name="date_of_birth"
                        value={newPatient.date_of_birth}
                        onChange={handleAddPatientInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label
                      htmlFor="new-whatsapp_number"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Nomor WhatsApp
                    </label>
                    <input
                      type="text"
                      id="new-whatsapp_number"
                      name="whatsapp_number"
                      value={newPatient.whatsapp_number}
                      onChange={handleAddPatientInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label
                      htmlFor="new-address"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Alamat
                    </label>
                    <textarea
                      id="new-address"
                      name="address"
                      value={newPatient.address}
                      onChange={handleAddPatientInputChange}
                      rows={2}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={closeAddPatientModal}
                      className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingPatient}
                      className={`py-2 px-4 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        isAddingPatient
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
                      }`}
                    >
                      {isAddingPatient ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* --- Akhir Modal Tambah Pasien --- */}
    </div>
  );
}
