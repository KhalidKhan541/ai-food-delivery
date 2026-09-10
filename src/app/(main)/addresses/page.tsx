"use client";

import { useState, useCallback } from "react";
import {
  MapPin,
  Plus,
  Home,
  Building2,
  Briefcase,
  Edit3,
  Trash2,
  Check,
  X,
  Navigation,
  Clock,
  Star,
  MoreVertical,
} from "lucide-react";

type AddressType = "home" | "work" | "other";

type Address = {
  id: string;
  label: string;
  type: AddressType;
  street: string;
  apt: string;
  city: string;
  state: string;
  zipCode: string;
  instructions?: string;
  isDefault: boolean;
  coordinates?: { lat: number; lng: number };
  lastUsed?: string;
};

type FormData = {
  label: string;
  type: AddressType;
  street: string;
  apt: string;
  city: string;
  state: string;
  zipCode: string;
  instructions: string;
};

const TYPE_ICONS: Record<AddressType, typeof Home> = {
  home: Home,
  work: Briefcase,
  other: Building2,
};

const MOCK_ADDRESSES: Address[] = [
  {
    id: "1",
    label: "Home",
    type: "home",
    street: "123 Oak Street",
    apt: "Apt 4B",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
    instructions: "Ring doorbell twice. Leave at door if no answer.",
    isDefault: true,
    lastUsed: "Yesterday",
  },
  {
    id: "2",
    label: "Work",
    type: "work",
    street: "456 Market Street",
    apt: "Floor 12, Suite 1200",
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
    instructions: "Check in with front desk",
    isDefault: false,
    lastUsed: "3 days ago",
  },
  {
    id: "3",
    label: "Gym",
    type: "other",
    street: "789 Fitness Ave",
    apt: "",
    city: "San Francisco",
    state: "CA",
    zipCode: "94110",
    isDefault: false,
    lastUsed: "1 week ago",
  },
];

const EMPTY_FORM: FormData = {
  label: "",
  type: "home",
  street: "",
  apt: "",
  city: "San Francisco",
  state: "CA",
  zipCode: "",
  instructions: "",
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    if (!formData.label || !formData.street || !formData.city || !formData.zipCode) return;

    if (editingId) {
      setAddresses((prev) =>
        prev.map((a) =>
          a.id === editingId
            ? { ...a, ...formData, isDefault: formData.type === "home" ? true : a.isDefault }
            : a
        )
      );
    } else {
      const newAddress: Address = {
        id: Date.now().toString(),
        ...formData,
        isDefault: addresses.length === 0,
      };
      setAddresses((prev) => [...prev, newAddress]);
    }

    setFormData(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }, [formData, editingId, addresses.length]);

  const handleEdit = useCallback((address: Address) => {
    setFormData({
      label: address.label,
      type: address.type,
      street: address.street,
      apt: address.apt,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      instructions: address.instructions || "",
    });
    setEditingId(address.id);
    setShowForm(true);
    setOpenMenu(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setAddresses((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
    setOpenMenu(null);
  }, []);

  const handleSetDefault = useCallback((id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id }))
    );
    setOpenMenu(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Addresses</h1>
            <p className="text-gray-500 mt-1">
              Manage your delivery addresses
            </p>
          </div>
          <button
            onClick={() => {
              setFormData(EMPTY_FORM);
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Map Placeholder */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="aspect-[2/1] bg-gradient-to-br from-primary/5 to-accent/5 relative flex items-center justify-center">
            <div className="text-center">
              <Navigation className="w-8 h-8 mx-auto mb-2 text-primary/60" />
              <p className="text-sm text-gray-500">Map view</p>
            </div>
            {addresses
              .filter((a) => a.isDefault)
              .map((a) => (
                <div
                  key={a.id}
                  className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.label}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {a.street}, {a.city}, {a.state} {a.zipCode}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Addresses List */}
        <div className="space-y-3">
          {addresses.map((address) => {
            const TypeIcon = TYPE_ICONS[address.type];
            return (
              <div
                key={address.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                  address.isDefault
                    ? "border-primary/20 ring-1 ring-primary/10"
                    : "border-gray-100"
                }`}
              >
                <div className="p-4 flex items-start gap-4">
                  <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <TypeIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{address.label}</h3>
                      {address.isDefault && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {address.street}
                      {address.apt && `, ${address.apt}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {address.city}, {address.state} {address.zipCode}
                    </p>
                    {address.instructions && (
                      <div className="flex items-start gap-1.5 mt-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-gray-500">{address.instructions}</p>
                      </div>
                    )}
                    {address.lastUsed && (
                      <p className="text-xs text-gray-400 mt-2">Last used {address.lastUsed}</p>
                    )}
                  </div>
                  <div className="relative shrink-0">
                    <button
                      onClick={() =>
                        setOpenMenu(openMenu === address.id ? null : address.id)
                      }
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {openMenu === address.id && (
                      <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                        <button
                          onClick={() => handleEdit(address)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit address
                        </button>
                        {!address.isDefault && (
                          <button
                            onClick={() => handleSetDefault(address.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Star className="w-4 h-4" />
                            Set as default
                          </button>
                        )}
                        {!address.isDefault && (
                          <button
                            onClick={() => handleDelete(address.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/5"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete address
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {addresses.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No addresses saved</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              Add your first delivery address to start ordering
            </p>
            <button
              onClick={() => {
                setFormData(EMPTY_FORM);
                setEditingId(null);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add your first address
            </button>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />
            <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-bottom">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId ? "Edit address" : "Add address"}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Address Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
                  <div className="flex gap-2">
                    {(["home", "work", "other"] as AddressType[]).map((type) => {
                      const Icon = TYPE_ICONS[type];
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            setFormData((f) => ({
                              ...f,
                              type,
                              label: f.label || type.charAt(0).toUpperCase() + type.slice(1),
                            }));
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                            formData.type === type
                              ? "bg-primary text-white shadow-md shadow-primary/25"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData((f) => ({ ...f, label: e.target.value }))}
                    placeholder="e.g., Home, Office, Gym"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>

                {/* Street */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street address
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => setFormData((f) => ({ ...f, street: e.target.value }))}
                    placeholder="123 Main St"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>

                {/* Apt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apt / Suite / Floor <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.apt}
                    onChange={(e) => setFormData((f) => ({ ...f, apt: e.target.value }))}
                    placeholder="Apt 4B"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>

                {/* City / State / Zip */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData((f) => ({ ...f, city: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData((f) => ({ ...f, state: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData((f) => ({ ...f, zipCode: e.target.value }))}
                      placeholder="94102"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery instructions <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData((f) => ({ ...f, instructions: e.target.value }))}
                    placeholder="Gate code, building entrance, etc."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={!formData.label || !formData.street || !formData.city || !formData.zipCode}
                  className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingId ? "Save changes" : "Add address"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
