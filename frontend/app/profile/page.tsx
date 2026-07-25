"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";


export default function ProfilePage() {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    id: 0,
    name: "",
    email: "",
    phone: "",
    state: "",
    district: "",
    city: "",
    language: "",
    farmer_type: "",
    crop: "",
    farm_size: "",
    soil_type: "",
  });

  const loadProfile = async () => {
    console.log("Profile Page: loadProfile called");

    const userId = localStorage.getItem("user_id");
    console.log("user_id:", userId);

    if (!userId) {
      router.replace("/login");
      return;
    }

    try {

      setLoading(true);

      const res = await fetch(`http://127.0.0.1:8000/profile/${userId}`);
      console.log("status:", res.status);
      const data = await res.json();

      setProfile(data);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    loadProfile();

  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const saveProfile = async () => {

    const userId = localStorage.getItem("user_id");

    if (!userId) {
      router.replace("/login");
      return;
    }

    const response = await fetch(

        `http://127.0.0.1:8000/profile/${userId}`,

        {

            method: "PUT",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                phone: profile.phone,

                state: profile.state,

                district: profile.district,

                city: profile.city,

                language: profile.language,

                farmer_type: profile.farmer_type,

                crop: profile.crop,

                farm_size: profile.farm_size,

                soil_type: profile.soil_type

            })

        }

    );

    if(response.ok){

        alert("Profile Updated Successfully");

        await loadProfile();

        setEditing(false);

    }
    else{

        alert("Profile Update Failed");

    }

  };

  const cancelEdit = () => {

    setEditing(false);

    loadProfile();

  };

  return (
    <DashboardLayout>

      <div className="py-6">

        {/* Header */}
        <div className="mt-6">
          <h1 className="text-3xl font-bold text-green-800">
            👤 My Profile
          </h1>

          <p className="text-gray-600 mt-2">
            Manage your personal details and farming preferences.
          </p>
        </div>

        {loading ? (

          <div className="bg-white rounded-2xl shadow-sm p-10 mt-6 text-center text-gray-500">
            Loading Profile...
          </div>

        ) : (

          <>

            {/* Profile Header */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mt-6 flex items-center gap-5">

              <div className="w-20 h-20 rounded-full bg-green-700 text-white flex items-center justify-center text-3xl font-bold">
                {profile.name ? profile.name.charAt(0) : "?"}
              </div>

              <div>
                <h2 className="text-2xl font-bold text-green-800">
                  {profile.name || "Unnamed Farmer"}
                </h2>

                <p className="text-gray-500">
                  🌱 Farmer
                </p>

                <p className="text-gray-500 text-sm mt-1">
                  📍 {[profile.city, profile.district, profile.state]
                        .filter(Boolean)
                        .join(", ") || "Location not provided"}
                </p>
              </div>

            </div>

            {/* Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

              {/* Personal Information */}
              <ProfileSection title="👤 Personal Information">

                <Field
                  label="Full Name"
                  name="name"
                  value={profile.name}
                  editing={editing}
                  onChange={handleChange}
                />

                <Field
                  label="Email"
                  name="email"
                  value={profile.email}
                  editing={editing}
                  onChange={handleChange}
                  readOnly
                />

                <Field
                  label="Phone Number"
                  name="phone"
                  value={profile.phone}
                  editing={editing}
                  onChange={handleChange}
                />

                <Field
                  label="State"
                  name="state"
                  value={profile.state}
                  editing={editing}
                  onChange={handleChange}
                />

                <Field
                  label="District"
                  name="district"
                  value={profile.district}
                  editing={editing}
                  onChange={handleChange}
                />

                <Field
                  label="City"
                  name="city"
                  value={profile.city}
                  editing={editing}
                  onChange={handleChange}
                />

              </ProfileSection>

              {/* Farming Information */}
              <ProfileSection title="🌾 Farming Information">

                <Field
                  label="Farmer Type"
                  name="farmer_type"
                  value={profile.farmer_type}
                  editing={editing}
                  onChange={handleChange}
                />

                <Field
                  label="Primary Crop"
                  name="crop"
                  value={profile.crop}
                  editing={editing}
                  onChange={handleChange}
                />

                <Field
                  label="Farm Size"
                  name="farm_size"
                  value={profile.farm_size}
                  editing={editing}
                  onChange={handleChange}
                />

                <Field
                  label="Soil Type"
                  name="soil_type"
                  value={profile.soil_type}
                  editing={editing}
                  onChange={handleChange}
                />

              </ProfileSection>

            </div>

            {/* Preferences */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">

              <h2 className="text-xl font-bold text-green-800 mb-5">
                ⚙️ Preferences
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <Field
                  label="Preferred Language"
                  name="language"
                  value={profile.language}
                  editing={editing}
                  onChange={handleChange}
                />

              </div>

            </div>

            {/* Buttons */}
            <div className="flex justify-end mt-6">

              {editing ? (
                <div className="flex gap-3">

                  <button
                    onClick={cancelEdit}
                    className="px-6 py-3 border border-gray-300 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveProfile}
                    className="px-6 py-3 bg-green-700 hover:bg-green-800 text-white rounded-xl font-semibold"
                  >
                    Save Changes
                  </button>

                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="px-6 py-3 bg-green-700 hover:bg-green-800 text-white rounded-xl font-semibold"
                >
                  ✏️ Edit Profile
                </button>
              )}

            </div>

          </>

        )}

      </div>

    </DashboardLayout>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">

      <h2 className="text-xl font-bold text-green-800 mb-5">
        {title}
      </h2>

      <div className="space-y-4">
        {children}
      </div>

    </div>
  );
}

function Field({
  label,
  name,
  value,
  editing,
  onChange,
  readOnly = false,
}: {
  label: string;
  name: string;
  value: string;
  editing: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  readOnly?: boolean;
}) {
  return (
    <div>

      <label className="block text-sm font-medium text-gray-500 mb-2">
        {label}
        {readOnly && (
          <span className="ml-2 text-xs text-gray-400">(cannot be changed)</span>
        )}
      </label>

      {editing && !readOnly ? (
        <input
          name={name}
          value={value}
          onChange={onChange}
          placeholder={`Enter ${label.toLowerCase()}`}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-green-600"
        />
      ) : (
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-gray-800 min-h-[48px]">
          {value || "Not provided"}
        </div>
      )}

    </div>
  );
}