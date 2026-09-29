"use client";

import { useEffect, useState } from "react";

import { SettingsTabsShell } from "@/components/settings/settings-tabs-shell";
import { useToast } from "@/context/ToastProvider";
import {
	getPreferences,
	getPrivacySettings,
	updatePreferences,
	updatePrivacySettings,
	type NotificationPreferences,
	type PrivacySettings,
} from "@/lib/api";

const DEFAULT_PREFERENCES: NotificationPreferences = {
	email: { jobAlerts: true, marketing: false, security: true },
	push: { directMessages: true, jobUpdates: true },
	digest: "daily",
};

const DEFAULT_PRIVACY: PrivacySettings = {
	profileVisibility: "public",
	showEmail: false,
	showEarnings: false,
	discoverable: true,
};

function Toggle({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<label className="flex items-center justify-between gap-4 py-3 text-sm text-gray-700">
			{label}
			<input
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
				className="h-4 w-4 accent-[#605DEC]"
			/>
		</label>
	);
}

/** Loads a settings resource, lets the user edit it locally and saves it. */
function useSettings<T>(
	load: () => Promise<T>,
	save: (value: T) => Promise<unknown>,
	fallback: T,
) {
	const [value, setValue] = useState<T>(fallback);
	const [saving, setSaving] = useState(false);
	const toast = useToast();

	useEffect(() => {
		load()
			.then((data) => data && setValue(data))
			.catch(() => undefined);
	}, [load]);

	const submit = async () => {
		setSaving(true);
		try {
			await save(value);
			toast.success("Settings saved.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save settings.");
		} finally {
			setSaving(false);
		}
	};

	return { value, setValue, saving, submit };
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			disabled={saving}
			onClick={onClick}
			className="mt-4 rounded-md bg-[#605DEC] px-4 py-2 text-sm font-medium text-white hover:bg-[#5558e3] disabled:opacity-60"
		>
			{saving ? "Saving…" : "Save changes"}
		</button>
	);
}

function PreferencesSection() {
	const { value, setValue, saving, submit } = useSettings(
		getPreferences,
		updatePreferences,
		DEFAULT_PREFERENCES,
	);
	const setEmail = (key: keyof NotificationPreferences["email"]) => (v: boolean) =>
		setValue((prev) => ({ ...prev, email: { ...prev.email, [key]: v } }));
	const setPush = (key: keyof NotificationPreferences["push"]) => (v: boolean) =>
		setValue((prev) => ({ ...prev, push: { ...prev.push, [key]: v } }));

	return (
		<div className="divide-y divide-gray-100">
			<Toggle label="Job alerts by email" checked={value.email.jobAlerts} onChange={setEmail("jobAlerts")} />
			<Toggle label="Security emails" checked={value.email.security} onChange={setEmail("security")} />
			<Toggle label="Marketing emails" checked={value.email.marketing} onChange={setEmail("marketing")} />
			<Toggle label="Direct message push notifications" checked={value.push.directMessages} onChange={setPush("directMessages")} />
			<Toggle label="Job update push notifications" checked={value.push.jobUpdates} onChange={setPush("jobUpdates")} />
			<label className="flex items-center justify-between gap-4 py-3 text-sm text-gray-700">
				Email digest
				<select
					value={value.digest}
					onChange={(event) =>
						setValue((prev) => ({
							...prev,
							digest: event.target.value as NotificationPreferences["digest"],
						}))
					}
					className="rounded-md border border-gray-200 px-2 py-1"
				>
					<option value="none">None</option>
					<option value="daily">Daily</option>
					<option value="weekly">Weekly</option>
				</select>
			</label>
			<SaveButton saving={saving} onClick={submit} />
		</div>
	);
}

function PrivacySection() {
	const { value, setValue, saving, submit } = useSettings(
		getPrivacySettings,
		updatePrivacySettings,
		DEFAULT_PRIVACY,
	);
	const set = (key: keyof PrivacySettings) => (v: unknown) =>
		setValue((prev) => ({ ...prev, [key]: v }));

	return (
		<div className="divide-y divide-gray-100">
			<label className="flex items-center justify-between gap-4 py-3 text-sm text-gray-700">
				Profile visibility
				<select
					value={value.profileVisibility}
					onChange={(event) => set("profileVisibility")(event.target.value)}
					className="rounded-md border border-gray-200 px-2 py-1"
				>
					<option value="public">Public</option>
					<option value="private">Private</option>
				</select>
			</label>
			<Toggle label="Show my email to artisans" checked={value.showEmail} onChange={set("showEmail")} />
			<Toggle label="Discoverable in search" checked={value.discoverable} onChange={set("discoverable")} />
			<SaveButton saving={saving} onClick={submit} />
		</div>
	);
}

export default function ClientSettingsPage() {
	return (
		<div className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
				<p className="mt-1 text-sm text-gray-500">
					Manage your account preferences and privacy.
				</p>
			</header>
			<SettingsTabsShell
				title="Client settings"
				tabs={[
					{
						value: "preferences",
						label: "Preferences",
						description: "Notifications and digests",
						content: <PreferencesSection />,
					},
					{
						value: "privacy",
						label: "Privacy",
						description: "Visibility and contact details",
						content: <PrivacySection />,
					},
				]}
			/>
		</div>
	);
}
