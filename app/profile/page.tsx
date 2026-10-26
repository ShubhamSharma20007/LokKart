"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Package, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth-provider";
import { Field, FormError, SubmitButton } from "@/components/formField";
import { auth } from "@/hooks/useFirebaseAuth";
import { getProfile, updateProfile, type ProfileView } from "@/lib/profile-actions";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" });

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
        toast.success("Profile updated", { id: "profile" });
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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Profile</h1>

      {loading ? (
        <ProfileSkeleton />
      ) : !user ? (
        <div className="mx-auto mt-8 max-w-xl rounded-2xl border bg-card px-6 py-12 text-center shadow-sm">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-signal/30 ring-8 ring-signal/15">
            <UserRound className="size-7 text-primary" aria-hidden />
          </div>
          <h2 className="font-heading mt-5 text-xl font-bold">Sign in to see your profile</h2>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
            Your account details and contact number live here.
          </p>
          <Button className="mt-6 h-10 px-5" onClick={signIn} disabled={signingIn}>
            {signingIn && <Loader2 className="animate-spin" aria-hidden />}
            {signingIn ? "Signing in..." : "Sign in with Google"}
          </Button>
        </div>
      ) : loadError ? (
        <div role="alert" className="mt-8 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button variant="outline" className="mt-4" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : !profile ? (
        <ProfileSkeleton />
      ) : (
        <div className="mt-6 space-y-6">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-5">
              {profile.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photoUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-20 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <span
                  className="grid size-20 place-items-center rounded-full bg-brand text-3xl font-bold text-brand-foreground"
                  aria-hidden
                >
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading truncate text-xl font-bold">{profile.name}</p>
                  {profile.role === "ADMIN" && <Badge variant="signal">Admin</Badge>}
                </div>
                <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Member since {dateFmt.format(new Date(profile.createdAt))}
                </p>
              </div>
              <Link href="/orders" className={cn(buttonVariants({ variant: "outline" }), "h-9 gap-1.5")}>
                <Package aria-hidden />
                {profile.orderCount} {profile.orderCount === 1 ? "order" : "orders"}
              </Link>
            </CardContent>
          </Card>

          <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-xl border bg-card p-5">
            <h2 className="font-heading text-lg font-bold">Personal details</h2>
            <FormError message={formError} />

            <Field label="Full name" name="name" error={errors.name}>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                aria-invalid={!!errors.name}
              />
            </Field>

            <Field label="Mobile number" name="phone" error={errors.phone} hint="Optional. Used for delivery updates.">
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                aria-invalid={!!errors.phone}
              />
            </Field>

            <Field label="Email" name="email" hint="Linked to your Google account, so it can't be changed here.">
              <Input id="email" name="email" value={profile.email} readOnly disabled />
            </Field>

            <Separator />

            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton pending={saving}>Save changes</SubmitButton>
              {dirty && !saving && (
                <Button
                  type="button"
                  variant="ghost"
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
  const field = (hint = false) => (
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-full rounded-lg" />
      {hint && <Skeleton className="h-3 w-56 max-w-full" />}
    </div>
  );

  return (
    <div className="mt-6 space-y-6" aria-busy="true" aria-label="Loading your profile">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-5">
          <Skeleton className="size-20 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-44 max-w-full" />
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </CardContent>
      </Card>

      <div className="space-y-4 rounded-xl border bg-card p-5">
        <Skeleton className="h-6 w-40" />
        {field()}
        {field(true)}
        {field(true)}
        <Separator />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}