"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, Package, UserRound, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/hooks/useFirebaseAuth";
import { getProfile, updateProfile, type ProfileView } from "@/lib/profile-actions";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function ProfilePage() {
  const { user, loading, signIn, signingIn } = useAuth();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("no token");
        const res = await getProfile(token);
        if (cancelled) return;
        if (res.ok) {
          setProfile(res.profile);
          setName(res.profile.name);
          setPhone(res.profile.phone);
          setLoadError(null);
        } else {
          setLoadError(res.message);
        }
      } catch {
        if (!cancelled) setLoadError("We could not load your profile. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, attempt]);

  const retry = () => {
    setProfile(null);
    setLoadError(null);
    setAttempt((n) => n + 1);
  };

  const dirty = !!profile && (name.trim() !== profile.name || phone.trim() !== profile.phone);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(undefined);
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("no token");
      const res = await updateProfile(token, { name, phone });
      if (res.ok) {
        setProfile(res.profile);
        setName(res.profile.name);
        setPhone(res.profile.phone);
        toast.success("Profile updated successfully!");
      } else {
        setErrors(res.errors ?? {});
        if (res.message) setFormError(res.message);
        else setFormError("Fix the highlighted fields and try again.");
      }
    } catch {
      setFormError("We could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-black/50 mb-6">
        <Link href="/" className="hover:text-black transition-colors">
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-black font-medium">My Profile</span>
      </nav>

      {/* Heading */}
      <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-black tracking-tight uppercase mb-8">
        MY PROFILE
      </h1>

      {loading ? (
        <ProfileSkeleton />
      ) : !user ? (
        <div className="mx-auto max-w-xl rounded-[20px] border border-black/10 bg-white px-6 py-14 text-center shadow-2xs">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-black/5 text-black">
            <UserRound className="size-8" aria-hidden />
          </div>
          <h2 className="font-heading mt-6 text-2xl font-black text-black tracking-tight">
            Sign in to view your profile
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-black/60 leading-relaxed">
            Manage your personal details, delivery addresses, and track all your orders in one place.
          </p>
          <Button
            className="mt-6 h-12 px-8 rounded-full bg-black text-white hover:bg-black/85 font-medium text-sm transition-all shadow-sm"
            onClick={signIn}
            disabled={signingIn}
          >
            {signingIn && <Loader2 className="size-4 animate-spin mr-2" aria-hidden />}
            {signingIn ? "Signing in..." : "Sign in with Google"}
          </Button>
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="rounded-[20px] border border-destructive/20 bg-destructive/5 p-8 text-center"
        >
          <p className="text-sm font-medium text-destructive">{loadError}</p>
          <Button
            variant="outline"
            className="mt-4 rounded-full border-black/15 text-xs font-semibold hover:bg-black hover:text-white"
            onClick={retry}
          >
            Try again
          </Button>
        </div>
      ) : !profile ? (
        <ProfileSkeleton />
      ) : (
        <div className="space-y-6">
          {/* User Overview Header Card */}
          <div className="rounded-[20px] border border-black/10 bg-white p-6 sm:p-8 shadow-2xs flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {profile.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photoUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-20 rounded-full object-cover border border-black/10 shadow-sm"
                />
              ) : (
                <span
                  className="grid size-20 place-items-center rounded-full bg-black text-2xl font-black text-white select-none"
                  aria-hidden
                >
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="font-heading text-xl sm:text-2xl font-black text-black tracking-tight truncate">
                    {profile.name}
                  </p>
                  {profile.role === "ADMIN" && (
                    <Badge className="rounded-full bg-black text-white px-2.5 py-0.5 text-[11px] font-semibold">
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-black/60 truncate mt-0.5">{profile.email}</p>
                <p className="text-xs text-black/40 mt-1">
                  Member since {dateFmt.format(new Date(profile.createdAt))}
                </p>
              </div>
            </div>

            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-black hover:text-white transition-all shadow-2xs shrink-0"
            >
              <Package className="size-4" aria-hidden />
              <span>
                {profile.orderCount} {profile.orderCount === 1 ? "Order" : "Orders"}
              </span>
            </Link>
          </div>

          {/* Personal Details Form */}
          <form
            onSubmit={onSubmit}
            noValidate
            className="rounded-[20px] border border-black/10 bg-white p-6 sm:p-8 shadow-2xs space-y-6"
          >
            <div>
              <h2 className="font-heading text-xl font-bold text-black tracking-tight">
                Personal Details
              </h2>
              <p className="text-xs text-black/50 mt-1">
                Update your contact details for smooth delivery updates.
              </p>
            </div>

            {formError && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs font-medium text-destructive"
              >
                {formError}
              </p>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-semibold text-black uppercase tracking-wider">
                  Full Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  aria-invalid={!!errors.name}
                  className="h-11 rounded-xl border border-black/15 bg-white px-4 text-sm text-black focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black placeholder:text-black/40"
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-xs font-semibold text-black uppercase tracking-wider">
                  Mobile Number
                </label>
                <div className="flex h-11 w-full items-center overflow-hidden rounded-xl border border-black/15 bg-white text-sm focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                  <span className="flex h-full items-center border-r border-black/10 bg-black/[0.03] px-3.5 text-xs font-semibold text-black/70 select-none">
                    +91
                  </span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    maxLength={10}
                    aria-invalid={!!errors.phone}
                    className="h-full w-full bg-transparent px-3 text-sm text-black outline-none placeholder:text-black/40"
                    placeholder="10-digit mobile number"
                  />
                </div>
                {errors.phone ? (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                ) : (
                  <p className="text-[11px] text-black/50">Used for courier delivery and SMS updates.</p>
                )}
              </div>
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-black uppercase tracking-wider">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                value={profile.email}
                readOnly
                disabled
                className="h-11 rounded-xl border border-black/10 bg-black/[0.03] px-4 text-sm text-black/70 cursor-not-allowed select-none"
              />
              <p className="text-[11px] text-black/50">
                Linked to your Google account and cannot be modified.
              </p>
            </div>

            <Separator className="border-black/10" />

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={saving || !dirty}
                className="h-12 px-8 rounded-full bg-black text-white hover:bg-black/85 font-medium text-sm transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>

              {dirty && !saving && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-6 rounded-full border border-black/15 text-sm font-medium text-black hover:bg-black/5 transition-colors"
                  onClick={() => {
                    setName(profile.name);
                    setPhone(profile.phone);
                    setErrors({});
                    setFormError(undefined);
                  }}
                >
                  Discard
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your profile">
      <div className="rounded-[20px] border border-black/10 bg-white p-6 sm:p-8 flex items-center justify-between gap-6 shadow-2xs">
        <div className="flex items-center gap-5">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-4 w-52 rounded-lg" />
            <Skeleton className="h-3 w-32 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>

      <div className="rounded-[20px] border border-black/10 bg-white p-6 sm:p-8 space-y-6 shadow-2xs">
        <Skeleton className="h-6 w-44 rounded-lg" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-12 w-36 rounded-full" />
      </div>
    </div>
  );
}
