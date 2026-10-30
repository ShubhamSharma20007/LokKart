"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { auth } from "@/hooks/useFirebaseAuth";
import { getImageKitAuth } from "@/lib/imagekit";

const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 3;

export type UploadedImage = {
  url: string;
  fileId: string;
};

type Props = {
  defaultImages?: string[];
  defaultFileIds?: string[];
  error?: string;
  onBusyChange?: (busy: boolean) => void;
};

export function MultiImageUpload({
  defaultImages = [],
  defaultFileIds = [],
  error,
  onBusyChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize items from defaults
  const [images, setImages] = useState<UploadedImage[]>(() => {
    return defaultImages.map((url, idx) => ({
      url,
      fileId: defaultFileIds[idx] || "",
    })).slice(0, MAX_IMAGES);
  });

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  // Compute a content-based key so reference changes to [] don't reset state
  const defaultKey = (defaultImages || []).join(";") + "::" + (defaultFileIds || []).join(";");
  const lastKeyRef = useRef(defaultKey);

  // Synchronize ONLY when defaultImages/defaultFileIds actually change content (e.g. modal opens for editing different product)
  useEffect(() => {
    if (lastKeyRef.current !== defaultKey) {
      lastKeyRef.current = defaultKey;
      const initial = (defaultImages || []).map((url, idx) => ({
        url,
        fileId: defaultFileIds?.[idx] || "",
      })).slice(0, MAX_IMAGES);
      setImages(initial);
      setMessage(undefined);
    }
  }, [defaultKey, defaultImages, defaultFileIds]);

  useEffect(() => {
    onBusyChange?.(uploading);
  }, [uploading, onBusyChange]);

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setMessage(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  const setPrimary = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - images.length;
    if (remainingSlots <= 0) {
      setMessage(`Maximum of ${MAX_IMAGES} images allowed.`);
      e.target.value = "";
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);

    // Validate files
    for (const f of filesToUpload) {
      if (!f.type.startsWith("image/")) {
        setMessage("Please select valid image files (JPG, PNG, WebP).");
        e.target.value = "";
        return;
      }
      if (f.size > MAX_BYTES) {
        setMessage(`"${f.name}" is larger than 5 MB.`);
        e.target.value = "";
        return;
      }
    }

    setMessage(undefined);
    setUploading(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Sign in as an admin to upload images.");

      // ImageKit requires a unique one-time token for every single file upload.
      // We upload all files in parallel with their own fresh auth token.
      const newlyUploaded = await Promise.all(
        filesToUpload.map(async (file) => {
          const authData = await getImageKitAuth(idToken);
          if (!authData.ok) throw new Error(authData.message);

          const fd = new FormData();
          fd.append("file", file);
          fd.append("fileName", file.name);
          fd.append("publicKey", authData.publicKey);
          fd.append("signature", authData.signature);
          fd.append("expire", String(authData.expire));
          fd.append("token", authData.token);
          fd.append("folder", "/products");
          fd.append("useUniqueFileName", "true");

          const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || typeof data.url !== "string" || typeof data.fileId !== "string") {
            throw new Error(data?.message || `Failed to upload "${file.name}".`);
          }

          return { url: data.url, fileId: data.fileId };
        })
      );

      setImages((prev) => [...prev, ...newlyUploaded].slice(0, MAX_IMAGES));
      toast.success(`${newlyUploaded.length} ${newlyUploaded.length === 1 ? "image" : "images"} uploaded`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const shown = message || error;

  return (
    <div className="space-y-3">
      {/* Hidden inputs for form submission */}
      <input
        type="hidden"
        name="imagesJson"
        value={JSON.stringify(images.map((i) => i.url))}
      />
      <input
        type="hidden"
        name="imageFileIdsJson"
        value={JSON.stringify(images.map((i) => i.fileId))}
      />
      {/* Backward-compatibility inputs */}
      <input type="hidden" name="imageUrl" value={images[0]?.url || ""} />
      <input type="hidden" name="imageUrlFileId" value={images[0]?.fileId || ""} />

      {/* Hidden File Input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        multiple
        onChange={onPick}
        className="hidden"
        id="multi-image-input"
        disabled={uploading || images.length >= MAX_IMAGES}
      />

      {/* Image Grid / Slots */}
      <div className="grid grid-cols-3 gap-3">
        {images.map((item, index) => (
          <div
            key={item.fileId || item.url || index}
            className="group relative aspect-square overflow-hidden rounded-xl border bg-muted/30 transition-all hover:border-primary/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={`Product preview ${index + 1}`}
              className="size-full object-cover"
            />

            {/* Badge for Primary / Cover Image */}
            {index === 0 ? (
              <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs">
                <Star className="size-2.5 fill-current" />
                Primary
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setPrimary(index)}
                className="absolute top-1.5 left-1.5 hidden rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs hover:bg-black group-hover:inline-flex"
                title="Set as main cover image"
              >
                Set Main
              </button>
            )}

            {/* Remove Button */}
            <button
              type="button"
              onClick={() => removeImage(index)}
              disabled={uploading}
              className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-black/70 text-white shadow-xs transition-transform hover:scale-110 hover:bg-destructive focus-visible:outline-none"
              title="Delete image"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}

        {/* Upload Button Slot (if < MAX_IMAGES) */}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/10 p-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-foreground disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="size-5 animate-spin text-primary" />
                <span className="text-[11px]">Uploading...</span>
              </>
            ) : (
              <>
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ImagePlus className="size-4" />
                </div>
                <span>Add Image</span>
                <span className="text-[10px] text-muted-foreground/75">
                  ({images.length}/{MAX_IMAGES})
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Helpful Hint */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Upload up to 3 photos (Max 5 MB each). The 1st photo will be the main cover.</span>
        <span className="font-medium text-foreground">{images.length} of {MAX_IMAGES} photos</span>
      </div>

      {/* Error Message */}
      {shown && <p className="text-xs text-destructive font-medium">{shown}</p>}
    </div>
  );
}

