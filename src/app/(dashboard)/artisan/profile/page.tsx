'use client';

import { Briefcase, Camera, MapPin, Save, Star } from 'lucide-react';
import React, { useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile, useSaveProfile } from '@/lib/hooks';
import type { ProfileResponse } from '@/lib/api/profile';
import { ProfileCompletionWidget } from '@/components/profile/profile-completion-widget';

const skillCategories = [
  'Carpentry',
  'Plumbing',
  'Electrical',
  'Painting',
  'Welding',
  'Masonry',
  'Tailoring',
  'Photography',
  'Graphic Design',
  'Other',
];

const nigerianStates = [
  'Lagos',
  'Abuja',
  'Rivers',
  'Kano',
  'Oyo',
  'Kaduna',
  'Enugu',
  'Delta',
  'Anambra',
  'Ogun',
];

const experienceOptions = [
  'Less than 1 year',
  '1-2 years',
  '3-5 years',
  '5-10 years',
  '10+ years',
];

interface ProfileData {
  fullName: string;
  email: string;
  skillCategory: string;
  state: string;
  city: string;
  yearsOfExperience: string;
  bio: string;
  profileImageUrl: string | null;
}

const defaultProfile: ProfileData = {
  fullName: 'Samuel Adeyemi',
  email: 'samuel@example.com',
  skillCategory: 'Carpentry',
  state: 'Lagos',
  city: 'Ikeja',
  yearsOfExperience: '5-10 years',
  bio: "I'm a skilled carpenter with over 7 years of experience in custom furniture, cabinetry, and general woodwork. I take pride in delivering quality craftsmanship that meets clients' exact specifications and timelines.",
  profileImageUrl: null,
};

const PROFILE_STRING_KEYS = [
  'fullName',
  'email',
  'skillCategory',
  'state',
  'city',
  'yearsOfExperience',
  'bio',
] as const;

function mapLoadedProfile(profile: ProfileResponse): Partial<ProfileData> {
  const mapped: Partial<ProfileData> = {};

  for (const key of PROFILE_STRING_KEYS) {
    const value = profile[key];
    if (typeof value === 'string') {
      mapped[key] = value;
    }
  }

  const imageUrl = profile.profileImageUrl;
  if (typeof imageUrl === 'string' || imageUrl === null) {
    mapped.profileImageUrl = imageUrl;
  }

  return mapped;
}

export default function ArtisanProfilePage() {
  const [_, setProfileImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Partial<ProfileData>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useProfile();
  const {
    mutate: saveProfile,
    isPending: isSaving,
    error: saveError,
  } = useSaveProfile();

  const formData: ProfileData = {
    ...defaultProfile,
    ...(profile ? mapLoadedProfile(profile) : null),
    ...overrides,
  };

  function setField<K extends keyof ProfileData>(
    key: K,
    value: ProfileData[K],
  ) {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }

  const mockStats = {
    profileViews: 124,
    rating: 4.5,
    completedJobs: 12,
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    try {
      await saveProfile(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveSuccess(false);
    }
  };

  const displayImage = previewUrl ?? formData.profileImageUrl;

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your public information and how clients find you.
        </p>
      </div>

      {/* Profile Summary Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
              {displayImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-gray-400">
                  {formData.fullName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#605DEC] flex items-center justify-center shadow-md hover:bg-[#5558e3] transition-colors"
              aria-label="Change profile photo"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Identity Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">
              {formData.fullName}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {formData.skillCategory}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {formData.city}, {formData.state}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                {mockStats.rating} rating
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {formData.yearsOfExperience} of experience
            </p>
          </div>

          {/* Stats pills */}
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">
                {mockStats.profileViews}
              </p>
              <p className="text-xs text-gray-500">Profile Views</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {mockStats.completedJobs}
              </p>
              <p className="text-xs text-gray-500">Jobs Done</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit Form — Left (2 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Basic Information
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-sm text-gray-700">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setField('fullName', e.target.value)}
                    placeholder="Your full name"
                    className="h-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#605DEC]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm text-gray-700">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="you@example.com"
                    className="h-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#605DEC]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700">
                  Craft / Skill Category
                </Label>
                <Select
                  value={formData.skillCategory}
                  onValueChange={(value) => setField('skillCategory', value)}
                >
                  <SelectTrigger className="h-10 focus:ring-0 focus:ring-offset-0 focus:border-[#605DEC]">
                    <SelectValue placeholder="Choose a skill/category" />
                  </SelectTrigger>
                  <SelectContent className="border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                    {skillCategories.map((cat) => (
                      <SelectItem
                        key={cat}
                        value={cat}
                        className="cursor-pointer focus:bg-[#F3F4F6]"
                      >
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700">
                  Years of Experience
                </Label>
                <Select
                  value={formData.yearsOfExperience}
                  onValueChange={(value) =>
                    setField('yearsOfExperience', value)
                  }
                >
                  <SelectTrigger className="h-10 focus:ring-0 focus:ring-offset-0 focus:border-[#605DEC]">
                    <SelectValue placeholder="Choose an option" />
                  </SelectTrigger>
                  <SelectContent className="border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                    {experienceOptions.map((opt) => (
                      <SelectItem
                        key={opt}
                        value={opt}
                        className="cursor-pointer focus:bg-[#F3F4F6]"
                      >
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Location</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-700">State</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setField('state', value)}
                  >
                    <SelectTrigger className="h-10 focus:ring-0 focus:ring-offset-0 focus:border-[#605DEC]">
                      <SelectValue placeholder="Choose State" />
                    </SelectTrigger>
                    <SelectContent className="border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                      {nigerianStates.map((s) => (
                        <SelectItem
                          key={s}
                          value={s}
                          className="cursor-pointer focus:bg-[#F3F4F6]"
                        >
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-sm text-gray-700">
                    City
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setField('city', e.target.value)}
                    placeholder="Enter your city"
                    className="h-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#605DEC]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                About / Bio
              </h2>
            </div>
            <div className="p-4 space-y-1.5">
              <Label htmlFor="bio" className="text-sm text-gray-700">
                Tell clients about your work
              </Label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setField('bio', e.target.value)}
                placeholder="Describe your skills, experience, and the type of work you do."
                rows={5}
                className="w-full resize-none p-3 border border-gray-200 rounded-lg text-sm hover:border-[#6366f1] focus:border-[#605DEC] focus:outline-none focus:ring-0 transition-colors"
              />
              <p className="text-xs text-gray-400 text-right">
                {formData.bio.length} / 500
              </p>
            </div>
          </div>

          {/* Media */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Portfolio Media
              </h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">
                Upload photos of your past work to attract more clients.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-[#605DEC] hover:bg-[#F4F3FE] transition-colors"
                >
                  <Camera className="w-5 h-5 text-gray-400" />
                  <span className="text-xs text-gray-400">Add</span>
                </button>

                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center"
                  >
                    <span className="text-xs text-gray-300">Photo {i}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#605DEC] text-white text-sm font-medium rounded-lg hover:bg-[#5558e3] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            {saveSuccess && (
              <p className="text-sm text-green-600 font-medium">
                Profile updated successfully.
              </p>
            )}
            {saveError && (
              <p className="text-sm text-red-600 font-medium">
                {saveError.message}
              </p>
            )}
          </div>
        </form>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Profile Completion */}
          <ProfileCompletionWidget />

          {/* Profile Visibility Stats */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Visibility Stats
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-0.5">Profile views</p>
                <p className="text-lg font-semibold text-gray-900">
                  {mockStats.profileViews}
                </p>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-0.5">Average rating</p>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <p className="text-lg font-semibold text-gray-900">
                    {mockStats.rating}
                  </p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-0.5">Jobs completed</p>
                <p className="text-lg font-semibold text-gray-900">
                  {mockStats.completedJobs}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
