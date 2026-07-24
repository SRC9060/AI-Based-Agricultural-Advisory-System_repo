"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";


export default function ProfilePage() {
  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState({
    name: "Aishwarya",
    email: "farmer@example.com",
    phone: "",
    location: "Madurai, Tamil Nadu",
    farmerType: "Small Farmer",
    primaryCrop: "Rice",
    farmSize: "",
    soilType: "Red Soil",
    language: "English",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
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

        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mt-6 flex items-center gap-5">

          <div className="w-20 h-20 rounded-full bg-green-700 text-white flex items-center justify-center text-3xl font-bold">
            {profile.name.charAt(0)}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-green-800">
              {profile.name}
            </h2>

            <p className="text-gray-500">
              🌱 Farmer
            </p>

            <p className="text-gray-500 text-sm mt-1">
              📍 {profile.location}
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
            />

            <Field
              label="Phone Number"
              name="phone"
              value={profile.phone}
              editing={editing}
              onChange={handleChange}
            />

            <Field
              label="Location"
              name="location"
              value={profile.location}
              editing={editing}
              onChange={handleChange}
            />

          </ProfileSection>

          {/* Farming Information */}
          <ProfileSection title="🌾 Farming Information">

            <Field
              label="Farmer Type"
              name="farmerType"
              value={profile.farmerType}
              editing={editing}
              onChange={handleChange}
            />

            <Field
              label="Primary Crop"
              name="primaryCrop"
              value={profile.primaryCrop}
              editing={editing}
              onChange={handleChange}
            />

            <Field
              label="Farm Size"
              name="farmSize"
              value={profile.farmSize}
              editing={editing}
              onChange={handleChange}
            />

            <Field
              label="Soil Type"
              name="soilType"
              value={profile.soilType}
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

            <Field
              label="Default Location"
              name="location"
              value={profile.location}
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
                onClick={() => setEditing(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={() => setEditing(false)}
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
}: {
  label: string;
  name: string;
  value: string;
  editing: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
}) {
  return (
    <div>

      <label className="block text-sm font-medium text-gray-500 mb-2">
        {label}
      </label>

      {editing ? (
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