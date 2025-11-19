// app/employees/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [businessAreas, setBusinessAreas] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBusinessAreas, setLoadingBusinessAreas] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [error, setError] = useState(null);
  const [businessAreasError, setBusinessAreasError] = useState(null);
  const [positionsError, setPositionsError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null); // { id, nip, nik, full_name, gender, date_of_birth, address, whatsapp_number, business_area_id, employee_position_id }
  const [updatedEmployee, setUpdatedEmployee] = useState({
    nip: "",
    nik: "",
    full_name: "",
    gender: "",
    date_of_birth: "",
    address: "",
    whatsapp_number: "",
    business_area_id: "",
    employee_title_id: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateEmployeeError, setUpdateEmployeeError] = useState(null);
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] =
    useState(false);
  const [employeeForAccount, setEmployeeForAccount] = useState(null); // Karyawan yang akan dibuatkan akunnya
  const [newAccountData, setNewAccountData] = useState({
    username: "",
    password: "",
    role_id: 2, // Default ke role non-superadmin, sesuaikan
    business_area_id: "", // Bisa diisi otomatis dari employee jika karyawan punya lokasi
  });
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [createAccountError, setCreateAccountError] = useState(null);
  const [roles, setRoles] = useState([]);

  // --- State untuk pencarian ---
  const [searchQuery, setSearchQuery] = useState("");
  // --- Akhir State untuk pencarian ---

  // --- State untuk modal tambah karyawan ---
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    nip: "",
    nik: "",
    full_name: "",
    gender: "",
    date_of_birth: "",
    address: "",
    whatsapp_number: "",
    business_area_id: "",
    employee_title_id: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addEmployeeError, setAddEmployeeError] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  // --- Akhir State Modal ---

  const router = useRouter();

  const openEditEmployeeModal = (employee) => {
    // Isi form edit dengan data karyawan yang dipilih
    setUpdatedEmployee({
      nip: employee.nip,
      nik: employee.nik,
      full_name: employee.full_name,
      gender: employee.gender,
      date_of_birth: employee.date_of_birth.split("T")[0], // Format YYYY-MM-DD
      address: employee.address || "",
      whatsapp_number: employee.whatsapp_number || "",
      business_area_id: employee.business_area_id
        ? employee.business_area_id.toString()
        : "", // Convert to string for select value
      employee_title_id: employee.employee_title_id,
    });
    setEmployeeToEdit(employee);
    setUpdateEmployeeError(null);
    setIsEditEmployeeModalOpen(true);
  };

  const closeEditEmployeeModal = () => {
    setIsEditEmployeeModalOpen(false);
    setEmployeeToEdit(null);
    setUpdatedEmployee({
      nip: "",
      nik: "",
      full_name: "",
      gender: "",
      date_of_birth: "",
      address: "",
      whatsapp_number: "",
      business_area_id: "",
      employee_title_id: "",
    });
    setUpdateEmployeeError(null);
  };

  const handleUpdateEmployeeInputChange = (e) => {
    const { name, value } = e.target;
    setUpdatedEmployee((prev) => ({ ...prev, [name]: value.toUpperCase() }));
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateEmployeeError(null);

    try {
      const res = await fetch(`/api/employees/${employeeToEdit.nip}`, {
        // Gunakan endpoint PUT/PATCH untuk update
        method: "PATCH", // Atau PUT, sesuaikan dengan API Anda
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedEmployee),
      });

      if (res.ok) {
        const updatedEmployeeData = await res.json();
        alert("Karyawan berhasil diperbarui!");
        fetchEmployees();
        closeEditEmployeeModal();
      } else {
        const errorData = await res.json();
        setUpdateEmployeeError(
          errorData.error || "Gagal memperbarui karyawan."
        );
      }
    } catch (err) {
      console.error("Error updating employee:", err);
      setUpdateEmployeeError("Terjadi kesalahan saat memperbarui karyawan.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openCreateAccountModal = (employee) => {
    setEmployeeForAccount(employee);
    setNewAccountData({
      username: "", // Default kosong
      password: "",
      role_id: 2, // Default ke role non-superadmin
      business_area_id: employee.business_area_id
        ? employee.business_area_id.toString()
        : "", // Isi otomatis jika karyawan memiliki lokasi
    });
    setCreateAccountError(null);
    setIsCreateAccountModalOpen(true);
  };

  const closeCreateAccountModal = () => {
    setIsCreateAccountModalOpen(false);
    setEmployeeForAccount(null);
    setNewAccountData({
      username: "",
      password: "",
      role_id: 2,
      business_area_id: "",
    });
    setCreateAccountError(null);
  };

  const handleNewAccountDataChange = (e) => {
    const { name, value } = e.target;
    setNewAccountData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setIsCreatingAccount(true);
    setCreateAccountError(null);

    if (!employeeForAccount) {
      setCreateAccountError("Data karyawan tidak valid.");
      setIsCreatingAccount(false);
      return;
    }

    // Validasi input
    if (!newAccountData.username || !newAccountData.password) {
      setCreateAccountError("Username dan password wajib diisi.");
      setIsCreatingAccount(false);
      return;
    }

    try {
      const accountDataToSend = {
        ...newAccountData,
        nip: employeeForAccount.nip, // Sertakan employee_id saat membuat user
        business_area_id: newAccountData.business_area_id
          ? parseInt(newAccountData.business_area_id)
          : null, // Konversi business_area_id ke int jika ada
        role_id: parseInt(newAccountData.role_id), // Konversi role_id ke int
      };

      const res = await fetch("/api/users", {
        // Gunakan endpoint API user Anda
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(accountDataToSend),
      });

      if (res.ok) {
        const createdUser = await res.json();
        alert("Akun berhasil dibuat!");
        fetchEmployees();

        closeCreateAccountModal();
      } else {
        const errorData = await res.json();
        setCreateAccountError(errorData.error || "Gagal membuat akun.");
      }
    } catch (err) {
      console.error("Error creating account:", err);
      setCreateAccountError("Terjadi kesalahan saat membuat akun.");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // --- 1. Fetch daftar karyawan ---
  const fetchEmployees = async () => {
    try {
      const employeesRes = await fetch(`/api/employees?q=${searchQuery}`); // Ganti dengan endpoint API Anda
      if (employeesRes.ok) {
        const employeesData = await employeesRes.json();
        setEmployees(employeesData); // Tampilkan semua data awalnya
      } else {
        setEmployees([]);
        setError("Gagal memuat daftar karyawan.");
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError("Terjadi kesalahan saat memuat data karyawan.");
      router.push("/login");
      router.refresh();
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [searchQuery]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const rolesRes = await fetch("/api/roles"); // Ambil dari API baru
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setRoles(rolesData);
        } else {
          console.error("Gagal memuat daftar role.");
          // Mungkin fallback ke opsi default jika API gagal?
          // setRoles([{ id: 1, name: 'Superadmin' }, { id: 2, name: 'User' }]);
        }
      } catch (err) {
        console.error("Error fetching roles:", err);
        // Mungkin fallback ke opsi default jika API gagal?
        // setRoles([{ id: 1, name: 'Superadmin' }, { id: 2, name: 'User' }]);
      }
    };

    fetchRoles();
  }, []);

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
      if (!userPermissions.includes("EMPLOYEE_ACCESS")) {
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

  // --- 2. Fetch daftar lokasi ---
  useEffect(() => {
    const fetchBusinessAreas = async () => {
      setLoadingBusinessAreas(true);
      setBusinessAreasError(null);

      try {
        const businessAreasRes = await fetch("/api/business-areas");
        if (businessAreasRes.ok) {
          const businessAreasData = await businessAreasRes.json();
          setBusinessAreas(businessAreasData);
        } else {
          setBusinessAreasError("Gagal memuat daftar lokasi.");
        }
      } catch (err) {
        console.error("Error fetching businessAreas:", err);
        setBusinessAreasError("Terjadi kesalahan saat memuat data lokasi.");
      } finally {
        setLoadingBusinessAreas(false);
      }
    };

    fetchBusinessAreas();
  }, []); // Fetch lokasi saat komponen dimuat

  // --- 3. Fetch daftar posisi ---
  useEffect(() => {
    const fetchPositions = async () => {
      setLoadingPositions(true);
      setPositionsError(null);

      try {
        const positionsRes = await fetch(
          "/api/employee-titles?business_area_id=" +
            newEmployee?.business_area_id ?? updatedEmployee?.business_area_id
        ); // Ganti dengan endpoint API Anda"); // Ganti dengan endpoint API Anda
        if (positionsRes.ok) {
          const positionsData = await positionsRes.json();
          setPositions(positionsData);
        } else {
          setPositionsError("Gagal memuat daftar posisi.");
        }
      } catch (err) {
        console.error("Error fetching positions:", err);
        setPositionsError("Terjadi kesalahan saat memuat data posisi.");
      } finally {
        setLoadingPositions(false);
      }
    };
    if (newEmployee?.business_area_id || updatedEmployee?.business_area_id) {
      fetchPositions();
    }
  }, [newEmployee?.business_area_id]); // Fetch posisi saat komponen dimuat
  useEffect(() => {
    const fetchPositions = async () => {
      setLoadingPositions(true);
      setPositionsError(null);

      try {
        const positionsRes = await fetch(
          "/api/employee-titles?business_area_id=" +
            updatedEmployee?.business_area_id
        ); // Ganti dengan endpoint API Anda"); // Ganti dengan endpoint API Anda
        if (positionsRes.ok) {
          const positionsData = await positionsRes.json();
          setPositions(positionsData);
        } else {
          setPositionsError("Gagal memuat daftar posisi.");
        }
      } catch (err) {
        console.error("Error fetching positions:", err);
        setPositionsError("Terjadi kesalahan saat memuat data posisi.");
      } finally {
        setLoadingPositions(false);
      }
    };
    if (newEmployee?.business_area_id || updatedEmployee?.business_area_id) {
      fetchPositions();
    }
  }, [updatedEmployee?.business_area_id]); // Fetch posisi saat komponen dimuat

  // --- 4. Handler untuk pencarian ---
  const handleSearchChange = (e) => {
    const query = e.target.value.toUpperCase();
    setSearchQuery(query);
  };

  const resetSearch = () => {
    setSearchQuery("");
  };
  // --- Akhir Handler Pencarian ---

  // --- 5. Handler untuk modal tambah karyawan ---
  const openAddEmployeeModal = () => {
    // Reset form modal
    setNewEmployee({
      nip: "",
      nik: "",
      full_name: "",
      gender: "",
      date_of_birth: "",
      address: "",
      whatsapp_number: "",
      business_area_id: "",
      employee_title_id: "",
    });
    setAddEmployeeError(null);
    setIsAddEmployeeModalOpen(true);
  };

  const closeAddEmployeeModal = () => {
    setIsAddEmployeeModalOpen(false);
  };

  const handleAddEmployeeInputChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee((prev) => ({ ...prev, [name]: value.toUpperCase() }));
  };

  const validateAddEmployeeButton = () => {
    return (
      newEmployee.nip &&
      newEmployee.nik &&
      newEmployee.full_name &&
      newEmployee.gender &&
      newEmployee.date_of_birth &&
      newEmployee.address &&
      newEmployee.whatsapp_number &&
      newEmployee.business_area_id &&
      newEmployee.employee_title_id
    );
  };

  const validateCreateAccountButton = () => {
    return (
      newAccountData.username &&
      newAccountData.password &&
      newAccountData.role_id &&
      newAccountData.business_area_id
    );
  };

  const validateEditEmployeeButton = () => {
    return (
      updatedEmployee.nip &&
      updatedEmployee.nik &&
      updatedEmployee.full_name &&
      updatedEmployee.gender &&
      updatedEmployee.date_of_birth &&
      updatedEmployee.address &&
      updatedEmployee.whatsapp_number &&
      updatedEmployee.business_area_id &&
      updatedEmployee.employee_title_id
    );
  };

  const handleAddNewEmployee = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    setAddEmployeeError(null);

    try {
      const res = await fetch("/api/employees", {
        // Ganti dengan endpoint API Anda
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEmployee),
      });

      if (res.ok) {
        const createdEmployee = await res.json();
        // Tambahkan karyawan baru ke state lokal (termasuk state pencarian)
        alert("Karyawan berhasil ditambahkan!");
        fetchEmployees();
        closeAddEmployeeModal();
      } else {
        const errorData = await res.json();
        setAddEmployeeError(errorData.error || "Gagal menambahkan karyawan.");
      }
    } catch (err) {
      console.error("Error adding employee:", err);
      setAddEmployeeError("Terjadi kesalahan saat menambahkan karyawan.");
    } finally {
      setIsAdding(false);
    }
  };
  // --- Akhir Handler Modal ---

  if (loading) {
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
        <h1 className="text-2xl font-bold text-green-900 mb-6">
          Daftar Karyawan
        </h1>

        {/* --- Bagian Filter Pencarian --- */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full md:w-1/3">
            <label
              htmlFor="employee-search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Cari Karyawan
            </label>
            <div className="flex">
              <input
                type="text"
                id="employee-search"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Masukkan nama karyawan..."
                className="flex-grow block px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={resetSearch}
                  className="bg-gray-200 text-gray-700 px-3 py-2 rounded-r-md border border-l-0 border-gray-300 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  title="Hapus pencarian"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Tombol Tambah Karyawan */}
          <div>
            <button
              onClick={openAddEmployeeModal}
              className="bg-green-600 text-white py-2 px-4 rounded-lg shadow hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Tambah Karyawan
            </button>
          </div>
        </div>
        {/* --- Akhir Bagian Filter Pencarian --- */}

        {/* Tabel Daftar Karyawan */}
        {employees.length === 0 ? (
          <p className="text-gray-600">
            {searchQuery
              ? "Tidak ada karyawan yang ditemukan untuk pencarian ini."
              : "Tidak ada karyawan yang ditemukan."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    NIP
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    NIK
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Nama Lengkap
                  </th>
                  {/* <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Jenis Kelamin
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Tanggal Lahir
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Alamat
                  </th> */}
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    No. WA
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Lokasi
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Posisi
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
                {employees.map((employee) => (
                  <tr key={employee.nip}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {employee.nip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.nik}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.full_name}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.gender}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(employee.date_of_birth).toLocaleDateString(
                        "id-ID"
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {employee.address || "-"}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.whatsapp_number || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.business_area
                        ? employee.business_area.name
                        : `ID: ${employee.business_area_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.employee_title
                        ? employee.employee_title.name
                        : `ID: ${employee.employee_title_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditEmployeeModal(employee)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Karyawan"
                        >
                          Edit
                        </button>
                        {!employee.user_id && (
                          <button
                            onClick={() => openCreateAccountModal(employee)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Buat Akun"
                          >
                            Buat Akun
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Modal Tambah Karyawan --- */}
      {isAddEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-green-900 mb-4">
              Tambah Karyawan Baru
            </h2>

            {addEmployeeError && (
              <p className="text-red-500 mb-4">{addEmployeeError}</p>
            )}

            <form onSubmit={handleAddNewEmployee}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="nip"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    NIP *
                  </label>
                  <input
                    type="text"
                    id="nip"
                    name="nip"
                    value={newEmployee.nip}
                    onChange={handleAddEmployeeInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="nik"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    NIK *
                  </label>
                  <input
                    type="text"
                    id="nik"
                    name="nik"
                    value={newEmployee.nik}
                    onChange={handleAddEmployeeInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="full_name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={newEmployee.full_name}
                  onChange={handleAddEmployeeInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="gender"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Jenis Kelamin *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={newEmployee.gender}
                    onChange={handleAddEmployeeInputChange}
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
                    htmlFor="date_of_birth"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Tanggal Lahir *
                  </label>
                  <input
                    type="date"
                    id="date_of_birth"
                    name="date_of_birth"
                    value={newEmployee.date_of_birth}
                    onChange={handleAddEmployeeInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Alamat
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={newEmployee.address}
                  onChange={handleAddEmployeeInputChange}
                  rows="2"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="whatsapp_number"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  id="whatsapp_number"
                  name="whatsapp_number"
                  value={newEmployee.whatsapp_number}
                  onChange={handleAddEmployeeInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="business_area_id"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Lokasi
                  </label>
                  <select
                    id="business_area_id"
                    name="business_area_id"
                    value={newEmployee.business_area_id}
                    onChange={handleAddEmployeeInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Tidak ada lokasi</option>
                    {businessAreas.map((businessArea) => (
                      <option key={businessArea.id} value={businessArea.id}>
                        {businessArea.name}
                      </option>
                    ))}
                  </select>
                  {loadingBusinessAreas && (
                    <p className="text-xs text-gray-500 mt-1">
                      Memuat lokasi...
                    </p>
                  )}
                  {businessAreasError && (
                    <p className="text-red-500 text-xs mt-1">
                      {businessAreasError}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="employee_title_id"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Posisi
                  </label>
                  <select
                    id="employee_title_id"
                    name="employee_title_id"
                    disabled={!newEmployee.business_area_id}
                    value={newEmployee.employee_title_id}
                    onChange={handleAddEmployeeInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Pilih Posisi</option>
                    {positions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                  {loadingPositions && (
                    <p className="text-xs text-gray-500 mt-1">
                      Memuat posisi...
                    </p>
                  )}
                  {positionsError && (
                    <p className="text-red-500 text-xs mt-1">
                      {positionsError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeAddEmployeeModal}
                  className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !validateAddEmployeeButton()}
                  className={`py-2 px-4 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isAdding || !validateAddEmployeeButton()
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
                  }`}
                >
                  {isAdding ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- Akhir Modal Tambah Karyawan --- */}
      {isEditEmployeeModalOpen && employeeToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-green-900 mb-4">
              Edit Karyawan
            </h2>

            {updateEmployeeError && (
              <p className="text-red-500 mb-4">{updateEmployeeError}</p>
            )}

            <form onSubmit={handleUpdateEmployee}>
              {/* Field Nama, Gender, Tanggal Lahir, dll. (sama seperti modal tambah, tapi dengan value dari updatedEmployee) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="edit-nip"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    NIP *
                  </label>
                  <input
                    type="text"
                    id="edit-nip"
                    name="nip"
                    value={updatedEmployee.nip}
                    onChange={handleUpdateEmployeeInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-nik"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    NIK *
                  </label>
                  <input
                    type="text"
                    id="edit-nik"
                    name="nik"
                    value={updatedEmployee.nik}
                    onChange={handleUpdateEmployeeInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="edit-full_name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  id="edit-full_name"
                  name="full_name"
                  value={updatedEmployee.full_name}
                  onChange={handleUpdateEmployeeInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="edit-gender"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Jenis Kelamin *
                  </label>
                  <select
                    id="edit-gender"
                    name="gender"
                    value={updatedEmployee.gender}
                    onChange={handleUpdateEmployeeInputChange}
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
                    htmlFor="edit-date_of_birth"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Tanggal Lahir *
                  </label>
                  <input
                    type="date"
                    id="edit-date_of_birth"
                    name="date_of_birth"
                    value={updatedEmployee.date_of_birth}
                    onChange={handleUpdateEmployeeInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="edit-address"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Alamat
                </label>
                <textarea
                  id="edit-address"
                  name="address"
                  value={updatedEmployee.address}
                  onChange={handleUpdateEmployeeInputChange}
                  rows="2"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="edit-whatsapp_number"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  id="edit-whatsapp_number"
                  name="whatsapp_number"
                  value={updatedEmployee.whatsapp_number}
                  onChange={handleUpdateEmployeeInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="edit-business_area_id"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Lokasi
                  </label>
                  <select
                    id="edit-business_area_id"
                    name="business_area_id"
                    value={updatedEmployee.business_area_id}
                    onChange={handleUpdateEmployeeInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Tidak ada lokasi</option>
                    {businessAreas.map((businessArea) => (
                      <option key={businessArea.id} value={businessArea.id}>
                        {businessArea.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-employee_title_id"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Posisi
                  </label>
                  <select
                    id="edit-employee_position_id"
                    name="employee_title_id"
                    disabled={!updatedEmployee.business_area_id}
                    value={updatedEmployee.employee_title_id}
                    onChange={handleUpdateEmployeeInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Pilih Jabatan</option>
                    {positions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeEditEmployeeModal}
                  className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || !validateEditEmployeeButton()}
                  className={`py-2 px-4 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isUpdating || !validateEditEmployeeButton()
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
                  }`}
                >
                  {isUpdating ? "Memperbarui..." : "Perbarui"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateAccountModalOpen && employeeForAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-green-900 mb-4">
              Buat Akun untuk {employeeForAccount.full_name}
            </h2>

            {createAccountError && (
              <p className="text-red-500 mb-4">{createAccountError}</p>
            )}

            <form onSubmit={handleCreateAccount}>
              <div className="mb-4">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Username *
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={newAccountData.username}
                  onChange={handleNewAccountDataChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={newAccountData.password}
                  onChange={handleNewAccountDataChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="role_id"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Role
                  </label>
                  <select
                    id="role_id"
                    name="role_id"
                    value={newAccountData.role_id}
                    onChange={handleNewAccountDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="business_area_id"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Lokasi
                  </label>
                  <select
                    id="business_area_id"
                    name="business_area_id"
                    value={newAccountData.business_area_id}
                    onChange={handleNewAccountDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- Tidak ada lokasi --</option>
                    {businessAreas.map((businessArea) => (
                      <option key={businessArea.id} value={businessArea.id}>
                        {businessArea.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeCreateAccountModal}
                  className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAccount || !validateCreateAccountButton()}
                  className={`py-2 px-4 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isCreatingAccount || !validateCreateAccountButton()
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-500 focus:ring-green-500"
                  }`}
                >
                  {isCreatingAccount ? "Membuat..." : "Buat Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- Akhir Modal Buat Akun --- */}
    </div>
  );
}
