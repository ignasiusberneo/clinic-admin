// app/users/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role_id: 1,
    clinic_id: "",
  });
  const [clinics, setClinics] = useState([]);
  const [roles, setRoles] = useState([]); // Tambahkan state untuk roles
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRes = await fetch("/api/users");
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        } else {
          setError("Gagal memuat daftar pengguna.");
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Terjadi kesalahan saat memuat data.");
        router.push("/login");
        router.refresh(); // Opsional
      } finally {
        setLoading(false);
      }
    };

    const fetchClinics = async () => {
      try {
        const clinicsRes = await fetch("/api/clinics");
        if (clinicsRes.ok) {
          const clinicsData = await clinicsRes.json();
          setClinics(clinicsData);
        } else {
          console.error("Gagal memuat daftar klinik.");
        }
      } catch (err) {
        console.error("Error fetching clinics:", err);
      }
    };

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

    fetchUsers();
    fetchClinics();
    fetchRoles(); // Ambil roles juga
  }, [router]);

  const openModal = () => {
    setIsModalOpen(true);
    // Gunakan ID role pertama (jika ada) sebagai default
    const defaultRoleId = roles.length > 0 ? roles[0].id : 1;
    setNewUser({
      username: "",
      password: "",
      role_id: defaultRoleId,
      clinic_id: "",
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (parseInt(newUser.role_id) !== 1 && !newUser.clinic_id) {
        setError("Klinik wajib dipilih untuk role selain superadmin.");
        return;
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        const createdUser = await res.json();
        setUsers((prevUsers) => [...prevUsers, createdUser]);
        closeModal();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Gagal menambahkan pengguna.");
      }
    } catch (err) {
      console.error("Error adding user:", err);
      setError("Terjadi kesalahan saat menambahkan pengguna.");
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-green-50 min-h-screen flex items-center justify-center">
        <p className="text-green-800">Memuat daftar pengguna...</p>
      </div>
    );
  }

  if (error && users.length === 0) {
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
        <h1 className="text-2xl font-bold text-green-900">Daftar Pengguna</h1>
        <button
          onClick={openModal}
          className="bg-green-600 text-white py-2 px-4 rounded-lg shadow hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Tambah Pengguna
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {users.length === 0 ? (
        <p className="mt-4">Tidak ada pengguna lain.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="bg-white p-4 rounded-lg shadow-sm border border-green-200"
            >
              <h2 className="font-semibold text-lg">{user.username}</h2>
              <p className="text-gray-600">
                Role: {user.role ? user.role.name : ""}
                {/* Tampilkan nama role jika ada */}
              </p>
              <p className="text-gray-600">
                Klinik: {user.clinic ? user.clinic.name : "-"}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Modal Tambah Pengguna */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-green-900 mb-4">
              Tambah Pengguna Baru
            </h2>
            <form onSubmit={handleAddUser}>
              <div className="mb-4">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={newUser.username}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={newUser.password}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="role_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Role
                </label>
                <select
                  id="role_id"
                  name="role_id"
                  value={newUser.role_id}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                >
                  {/* Gunakan data roles dari state */}
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} {/* Tampilkan nama role di dropdown */}
                    </option>
                  ))}
                </select>
              </div>
              {parseInt(newUser.role_id) !== 1 && (
                <div className="mb-4">
                  <label
                    htmlFor="clinic_id"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Klinik
                  </label>
                  <select
                    id="clinic_id"
                    name="clinic_id"
                    value={newUser.clinic_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required={parseInt(newUser.role_id) !== 1}
                  >
                    <option value="">Pilih Klinik...</option>
                    {clinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
    </div>
  );
}
