"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioCardGroup } from "@/components/ui/radio-card-group";
import { InlineError } from "@/components/ui/error-panel";

type Role = "CUSTOMER" | "PROVIDER"

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  phone: z.string().optional().refine(
    (val) => !val || /^[0-9+\-\s()]{8,20}$/.test(val),
    "Format nomor HP tidak valid"
  ),
  location: z.string().optional(),
  role: z.enum(["CUSTOMER", "PROVIDER"]),
})

type FormValues = z.infer<typeof registerSchema>

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: "Lemah", color: "bg-destructive" }
  if (score <= 2) return { score, label: "Sedang", color: "bg-warning" }
  if (score <= 3) return { score, label: "Kuat", color: "bg-success" }
  return { score, label: "Sangat Kuat", color: "bg-success" }
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormValues>({
    name: "",
    email: "",
    password: "",
    phone: "",
    location: "",
    role: "CUSTOMER",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateField = useCallback(<K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    const result = registerSchema.shape[key].safeParse(value);
    if (result.success) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    } else {
      setErrors((prev) => ({ ...prev, [key]: result.error.issues[0]?.message }));
    }
  }, []);

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (touched[key]) validateField(key, value);
  };

  const handleBlur = <K extends keyof FormValues>(key: K) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    validateField(key, form[key]);
  };

  const validateAll = (): boolean => {
    const result = registerSchema.safeParse(form);
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
    for (const issue of result.error.issues) {
      const path = issue.path[0] as keyof FormValues;
      if (path && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    setErrors(fieldErrors);
    setTouched({ name: true, email: true, password: true, role: true });
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setLoading(true);
    setServerError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setServerError(data?.error ?? "Gagal mendaftar. Coba lagi.");
      setLoading(false);
      return;
    }

    router.push("/login?registered=1");
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle as="h1" className="text-2xl">
          Daftar Akun JASAKITE
        </CardTitle>
        <CardDescription>
          Mulai pesan jasa atau buka jasa Anda sendiri
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap <span className="text-destructive-strong">*</span></Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Nama Anda"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              aria-invalid={errors.name ? "true" : undefined}
              aria-describedby={errors.name ? "name-error" : undefined}
              className={errors.name && touched.name ? "border-destructive" : ""}
            />
            {errors.name && touched.name && <InlineError message={errors.name} id="name-error" />}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-destructive-strong">*</span></Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              aria-invalid={errors.email ? "true" : undefined}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={errors.email && touched.email ? "border-destructive" : ""}
            />
            {errors.email && touched.email && <InlineError message={errors.email} id="email-error" />}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">No. HP (opsional)</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
              value={form.phone ?? ""}
              onChange={(e) => update("phone", e.target.value)}
              onBlur={() => handleBlur("phone")}
              aria-invalid={errors.phone ? "true" : undefined}
              aria-describedby={errors.phone ? "phone-error" : undefined}
              className={errors.phone && touched.phone ? "border-destructive" : ""}
            />
            {errors.phone && touched.phone && <InlineError message={errors.phone} id="phone-error" />}
          </div>

          {form.role === "PROVIDER" && (
            <div className="space-y-2">
              <Label htmlFor="location">
                Kabupaten / Kota Layanan{" "}
                <span className="text-destructive-strong">*</span>
              </Label>
            <Input
              id="location"
              autoComplete="address-level2"
              placeholder="Contoh: Pangkal Pinang"
                value={form.location ?? ""}
                onChange={(e) => update("location", e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Pelanggan memfilter jasa berdasarkan kabupaten/kota ini. JASAKITE
                melayani seluruh Kepulauan Bangka Belitung.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Password <span className="text-destructive-strong">*</span></Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              aria-invalid={errors.password ? "true" : undefined}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={errors.password && touched.password ? "border-destructive" : ""}
            />
            {errors.password && touched.password && <InlineError message={errors.password} id="password-error" />}
            {form.password.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= passwordStrength(form.password).score
                          ? passwordStrength(form.password).color
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-2xs text-muted-foreground">
                  Kekuatan: <span className="font-medium text-foreground">{passwordStrength(form.password).label}</span>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Daftar sebagai</Label>
            <RadioCardGroup
              label="Daftar sebagai"
              columns={2}
              value={form.role}
              onChange={(role) => update("role", role)}
              options={[
                {
                  value: "CUSTOMER",
                  label: "Customer",
                  description: "Saya ingin memesan jasa",
                },
                {
                  value: "PROVIDER",
                  label: "Provider",
                  description: "Saya ingin membuka jasa",
                },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Hubungi admin jika perlu mengubah role setelah daftar.
            </p>
          </div>

          {serverError && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive-strong"
            >
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                Mendaftar...
              </span>
            ) : (
              "Daftar Sekarang"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium text-primary-strong hover:underline"
          >
            Masuk di sini
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
