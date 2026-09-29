"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocumentUploader } from "@/components/verification/document-uploader";
import { ApiClientError, submitCuratorVerification } from "@/lib/api";

type Fields = {
	fullName: string;
	email: string;
	specialization: string;
	experienceYears: string;
	statement: string;
};

type FieldErrors = Partial<Record<keyof Fields | "documents", string>>;

const EMPTY_FIELDS: Fields = {
	fullName: "",
	email: "",
	specialization: "",
	experienceYears: "",
	statement: "",
};

function validate(fields: Fields): FieldErrors {
	const errors: FieldErrors = {};
	if (!fields.fullName.trim()) errors.fullName = "Full name is required.";
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
		errors.email = "A valid email is required.";
	if (!fields.specialization.trim())
		errors.specialization = "Specialization is required.";
	return errors;
}

export default function CuratorVerificationPage() {
	const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [submittedId, setSubmittedId] = useState<string | null>(null);

	const update = (key: keyof Fields) =>
		(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
			setFields((prev) => ({ ...prev, [key]: event.target.value }));

	const handleSubmit = async (files: File[]) => {
		setFormError(null);
		const nextErrors = validate(fields);
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) {
			setFormError("Please fix the highlighted fields.");
			return;
		}

		const payload = new FormData();
		Object.entries(fields).forEach(([key, value]) =>
			payload.append(key, value.trim()),
		);
		files.forEach((file) => payload.append("documents", file));

		try {
			const result = await submitCuratorVerification(payload);
			setSubmittedId(result.id);
		} catch (error) {
			const data =
				error instanceof ApiClientError
					? (error.data as { errors?: FieldErrors } | undefined)
					: undefined;
			setErrors(data?.errors ?? {});
			setFormError(
				error instanceof Error ? error.message : "Submission failed.",
			);
		}
	};

	const field = (
		key: keyof Fields,
		label: string,
		props: React.ComponentProps<typeof Input> = {},
	) => (
		<div className="space-y-1.5">
			<Label htmlFor={key}>{label}</Label>
			<Input
				id={key}
				value={fields[key]}
				onChange={update(key)}
				aria-invalid={Boolean(errors[key])}
				{...props}
			/>
			{errors[key] && <p className="text-sm text-rose-600">{errors[key]}</p>}
		</div>
	);

	return (
		<AuthGuard>
			<main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-3xl space-y-6">
					<header>
						<h1 className="text-2xl font-semibold text-gray-900">
							Curator verification
						</h1>
						<p className="mt-1 text-sm text-gray-500">
							Submit your details and supporting documents to become a
							verified curator.
						</p>
					</header>

					{submittedId ? (
						<section className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
							<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
							<div>
								<p className="font-medium">Application submitted</p>
								<p className="mt-1 text-sm">
									Your verification request (#{submittedId}) is pending review.
								</p>
							</div>
						</section>
					) : (
						<section className="space-y-5 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
							{formError && (
								<p
									role="alert"
									className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
								>
									<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
									{formError}
								</p>
							)}

							<div className="grid gap-4 sm:grid-cols-2">
								{field("fullName", "Full name", { autoComplete: "name" })}
								{field("email", "Email", { type: "email", autoComplete: "email" })}
								{field("specialization", "Specialization", {
									placeholder: "e.g. Carpentry, Tailoring",
								})}
								{field("experienceYears", "Years of experience", {
									type: "number",
									min: 0,
								})}
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="statement">Statement (optional)</Label>
								<Textarea
									id="statement"
									value={fields.statement}
									onChange={update("statement")}
									rows={4}
								/>
							</div>

							<DocumentUploader onSubmit={handleSubmit} />
							{errors.documents && (
								<p className="text-sm text-rose-600">{errors.documents}</p>
							)}
						</section>
					)}
				</div>
			</main>
		</AuthGuard>
	);
}
