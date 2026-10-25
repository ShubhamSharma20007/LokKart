"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
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
      setUrl("");
      setFileId("");
      setPreview("");
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
        <div className="relative w-full max-w-xs overflow-hidden rounded-lg border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Product preview" className="aspect-square w-full object-cover w-20 " />
          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-background/70">
              <Loader2 className="size-6 animate-spin text-primary" aria-label="Uploading" />
            </div>
          )}
          {!uploading && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="absolute top-2 right-2"
              aria-label="Remove image"
              onClick={clear}
            >
              <X />
            </Button>
          )}
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