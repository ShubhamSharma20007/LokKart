"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/hooks/useFirebaseAuth";
import { getImageKitAuth } from "@/lib/imagekit";

const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  /** Form field for the image URL. The ImageKit file id is sent as `${name}FileId`. */
  name: string;
  defaultValue?: string;
  defaultFileId?: string;
  error?: string;
  onBusyChange?: (busy: boolean) => void;
};

export function ImageUpload({ name, defaultValue = "", defaultFileId = "", error, onBusyChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultValue);
  const [fileId, setFileId] = useState(defaultFileId);
  const [preview, setPreview] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  // Synchronize state when defaultValue or defaultFileId changes (e.g. opening different product to edit)
  useEffect(() => {
    setUrl(defaultValue);
    setFileId(defaultFileId);
    setPreview(defaultValue);
    setMessage(undefined);
  }, [defaultValue, defaultFileId]);

  useEffect(() => {
    onBusyChange?.(uploading);
  }, [uploading, onBusyChange]);

  // Free the temporary preview URL when it changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const clear = () => {
    setUrl("");
    setFileId("");
    setPreview("");
    setMessage(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file (JPG, PNG, WebP).");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setMessage("Image must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }

    setMessage(undefined);
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Sign in as an admin to upload images.");

      const a = await getImageKitAuth(idToken);
      if (!a.ok) throw new Error(a.message);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("fileName", file.name);
      fd.append("publicKey", a.publicKey);
      fd.append("signature", a.signature);
      fd.append("expire", String(a.expire));
      fd.append("token", a.token);
      fd.append("folder", "/products");
      fd.append("useUniqueFileName", "true");

      const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string" || typeof data.fileId !== "string") {
        throw new Error(data?.message || "Upload failed. Please try again.");
      }
      setUrl(data.url);
      setFileId(data.fileId);
    } catch (err) {
      setUrl(defaultValue);
      setFileId(defaultFileId);
      setPreview(defaultValue);
      setMessage(err instanceof Error ? err.message : "Upload failed. Please try again.");
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  const shown = message || error;

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={url} />
      <input type="hidden" name={`${name}FileId`} value={fileId} />

      {preview ? (
        <div className="space-y-2">
          {/* Main preview box with hover effects */}
          <div className="group relative w-36 h-36 overflow-hidden rounded-xl border border-border bg-muted shadow-sm transition-all hover:border-primary/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Product preview"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Uploading Spinner */}
            {uploading && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-background/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-1.5">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span className="text-[11px] font-medium text-foreground">Uploading...</span>
                </div>
              </div>
            )}

            {/* Desktop Hover Overlay: Change & Remove actions */}
            {!uploading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-black/60 p-2 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  className="w-full gap-1 text-[11px] font-medium shadow bg-white text-black hover:bg-white/90"
                  onClick={() => inputRef.current?.click()}
                >
                  <Pencil className="size-3" />
                  Change
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  className="w-full gap-1 text-[11px] font-medium shadow"
                  onClick={clear}
                >
                  <Trash2 className="size-3" />
                  Remove
                </Button>
              </div>
            )}

            {/* Top-Right Quick Close button (always accessible) */}
            {!uploading && (
              <button
                type="button"
                onClick={clear}
                className="absolute top-1.5 right-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-black/70 text-white shadow-sm transition-all hover:bg-destructive group-hover:opacity-0"
                aria-label="Remove image"
                title="Remove image"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Quick-action buttons below image (convenient on mobile and touch devices) */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="gap-1 text-xs"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Pencil className="size-3" />
              Change image
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={clear}
              disabled={uploading}
            >
              <Trash2 className="size-3" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={`${name}-file`}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
        >
          <ImagePlus className="size-6 text-primary" aria-hidden />
          <span className="font-medium text-foreground">Choose an image</span>
          <span>JPG, PNG or WebP, up to 5 MB</span>
        </label>
      )}

      <input
        ref={inputRef}
        id={`${name}-file`}
        type="file"
        accept="image/*"
        onChange={onPick}
        disabled={uploading}
        className="sr-only"
        aria-invalid={!!shown}
      />

      {shown && <p className="text-sm text-destructive">{shown}</p>}
    </div>
  );
}
