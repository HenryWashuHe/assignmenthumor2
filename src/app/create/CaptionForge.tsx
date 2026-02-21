"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";
import { createClient } from "@/lib/supabase/client";

/* ── types ── */

interface ImageRow {
  id: string;
  url: string | null;
  image_description: string | null;
  is_common_use: boolean | null;
}

interface HumorFlavorRow {
  id: number;
  slug: string;
  description: string | null;
}

interface CaptionForgeProps {
  images: ImageRow[];
  flavors: HumorFlavorRow[];
  userId: string | null;
  userEmail: string | null;
}

type ImageSource =
  | { kind: "gallery"; imageId: string; url: string; description: string }
  | { kind: "upload"; imageId: string; cdnUrl: string }
  | null;

type UploadPhase = "idle" | "uploading" | "generating" | "done" | "error";

interface CaptionRecord {
  id?: string;
  content?: string;
  caption?: string;
  [key: string]: unknown;
}

interface UploadResult {
  imageId: string;
  cdnUrl: string;
  captions: CaptionRecord[];
}

/* ── constants ── */

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const PHASE_LABELS: Record<UploadPhase, string> = {
  idle: "",
  uploading: "Uploading image...",
  generating: "Generating captions \u2014 this may take a moment...",
  done: "Done!",
  error: "Something went wrong",
};

/* ── component ── */

export default function CaptionForge({
  images,
  flavors,
  userId,
  userEmail,
}: CaptionForgeProps) {
  const [imageSource, setImageSource] = useState<ImageSource>(null);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>([]);
  const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(
    flavors[0]?.id ?? null
  );
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [sampleCaptionsLoading, setSampleCaptionsLoading] = useState(false);
  const [generatingForGallery, setGeneratingForGallery] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedFlavor = useMemo(
    () => flavors.find((f) => f.id === selectedFlavorId) ?? null,
    [flavors, selectedFlavorId]
  );

  const imageUrl = useMemo(() => {
    if (!imageSource) return null;
    return imageSource.kind === "gallery"
      ? imageSource.url
      : imageSource.cdnUrl;
  }, [imageSource]);

  const captionLength = caption.trim().length;
  const canSubmit =
    imageSource !== null && captionLength > 0 && Boolean(userId);
  const isProcessing =
    uploadPhase === "uploading" || uploadPhase === "generating";
  const suggestionsLabel =
    imageSource?.kind === "upload"
      ? "AI suggestions"
      : "Sample captions for this image";

  /* ── toast helper ── */

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  /* ── cleanup object URLs on unmount ── */
  useEffect(() => {
    return () => {
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    };
  }, [uploadPreview]);

  /* ── upload logic ── */

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.has(file.type)) {
      return `Unsupported file type: ${file.type}. Use JPEG, PNG, WebP, GIF, or HEIC.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 10 MB.";
    }
    return null;
  };

  const resetUpload = useCallback(() => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setImageSource(null);
    setUploadPhase("idle");
    setUploadError(null);
    setUploadPreview(null);
    setGeneratedCaptions([]);
    setCaption("");
    setStatus(null);
    setGeneratingForGallery(false);
  }, [uploadPreview]);

  const uploadFile = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      setUploadPhase("error");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setUploadPreview(objectUrl);
    setUploadError(null);
    setUploadPhase("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setUploadPhase("generating");

      const res = await fetch("/api/pipeline", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: "Upload failed" }));
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }

      const data: UploadResult = await res.json();

      const captionTexts = (data.captions ?? [])
        .map((cap: CaptionRecord) => cap.content ?? cap.caption ?? "")
        .filter((text: string) => text.length > 0);

      setImageSource({
        kind: "upload",
        imageId: data.imageId,
        cdnUrl: data.cdnUrl,
      });
      setGeneratedCaptions(captionTexts);
      setCaption(captionTexts[0] ?? "");
      setUploadPhase("done");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      setUploadError(message);
      setUploadPhase("error");
    }
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      const file = event.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  /* ── gallery selection ── */

  const fetchSampleCaptions = useCallback(async (imageId: string) => {
    setSampleCaptionsLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("captions")
        .select("content")
        .eq("image_id", imageId)
        .eq("is_public", true)
        .order("like_count", { ascending: false })
        .limit(5);

      const texts = (data ?? [])
        .map((row: { content: string | null }) => row.content ?? "")
        .filter((t: string) => t.length > 0);

      setGeneratedCaptions(texts);
    } catch {
      setGeneratedCaptions([]);
    }
    setSampleCaptionsLoading(false);
  }, []);

  const selectGalleryImage = useCallback(
    (image: ImageRow) => {
      setImageSource({
        kind: "gallery",
        imageId: image.id,
        url: image.url ?? "",
        description: image.image_description ?? "",
      });
      setGeneratedCaptions([]);
      setUploadPhase("idle");
      setUploadError(null);
      setShowGallery(false);
      setGeneratingForGallery(false);
      fetchSampleCaptions(image.id);
    },
    [fetchSampleCaptions]
  );

  /* ── generate AI captions for gallery image ── */

  const generateForGalleryImage = useCallback(async () => {
    if (!imageSource || imageSource.kind !== "gallery") return;

    setGeneratingForGallery(true);
    try {
      const res = await fetch("/api/pipeline/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imageSource.url }),
      });

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: "Generation failed" }));
        throw new Error(body.error ?? `Generation failed (${res.status})`);
      }

      const data = await res.json();
      const captionTexts = (data.captions ?? [])
        .map((cap: CaptionRecord) => cap.content ?? cap.caption ?? "")
        .filter((text: string) => text.length > 0);

      if (captionTexts.length > 0) {
        setGeneratedCaptions(captionTexts);
        setCaption(captionTexts[0]);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Generation failed";
      setUploadError(message);
    }
    setGeneratingForGallery(false);
  }, [imageSource]);

  /* ── submit ── */

  const handleSubmit = async () => {
    if (!canSubmit || busy || !imageSource || !userId) return;
    setBusy(true);
    setStatus(null);

    const supabase = createClient();
    const { error } = await supabase.from("captions").insert({
      content: caption.trim(),
      is_public: false,
      profile_id: userId,
      image_id: imageSource.imageId,
      humor_flavor_id: selectedFlavorId,
    });

    if (error) {
      setStatus(`Could not submit: ${error.message}`);
    } else {
      setCaption("");
      setGeneratedCaptions([]);
      setImageSource(null);
      setUploadPhase("idle");
      setUploadPreview(null);
      showToast("Caption submitted!");
    }
    setBusy(false);
  };

  /* ── render ── */

  return (
    <section className={styles.layout}>
      {/* ── Left column: controls ── */}
      <div className={styles.panel}>

        {/* ── Image source: upload zone ── */}
        {imageSource === null && !isProcessing && uploadPhase !== "error" && (
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionLabel}>
              <span className={styles.sectionAccent} />
              Upload an image
            </h3>
            <div
              className={`${styles.dropZone} ${dragOver ? styles.dragOver : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className={styles.dropIcon}>+</div>
              <span>Drop an image here or click to browse</span>
              <span className={styles.uploadHint}>
                JPEG, PNG, WebP, GIF, or HEIC &middot; Max 10 MB
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
                onChange={handleFileChange}
                className={styles.hiddenInput}
              />
            </div>
          </div>
        )}

        {/* ── Processing spinner ── */}
        {isProcessing && (
          <div className={styles.processing}>
            {uploadPreview && (
              <img
                src={uploadPreview}
                alt="Preview"
                className={styles.uploadPreviewImg}
              />
            )}
            <div className={styles.shimmerBar} />
            <div className={styles.spinner} />
            <span className={styles.phaseLabel}>
              {PHASE_LABELS[uploadPhase]}
            </span>
          </div>
        )}

        {/* ── Upload error ── */}
        {uploadPhase === "error" && (
          <div className={styles.errorState}>
            {uploadPreview && (
              <img
                src={uploadPreview}
                alt="Preview"
                className={styles.uploadPreviewImg}
              />
            )}
            <p className={styles.errorText}>{uploadError}</p>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={resetUpload}
            >
              Try again
            </button>
          </div>
        )}

        {/* ── Selected image banner ── */}
        {imageSource !== null && !isProcessing && (
          <div className={styles.selectedImageBanner}>
            {imageUrl && (
              <img src={imageUrl} alt="Selected" />
            )}
            <div className={styles.bannerBody}>
              <p className={styles.bannerLabel}>Image ready</p>
              <div className={styles.bannerActions}>
                {imageSource.kind === "gallery" && (
                  <button
                    className={styles.generateButton}
                    type="button"
                    onClick={generateForGalleryImage}
                    disabled={generatingForGallery}
                  >
                    {generatingForGallery ? (
                      <>
                        <span className={styles.spinnerSmall} />
                        Generating...
                      </>
                    ) : (
                      "Generate AI captions"
                    )}
                  </button>
                )}
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={resetUpload}
                >
                  Change image
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Gallery toggle ── */}
        {!isProcessing && (
          <div className={styles.sectionCard}>
            <button
              className={`${styles.galleryToggle} ${showGallery ? styles.galleryToggleOpen : ""}`}
              type="button"
              onClick={() => setShowGallery((prev) => !prev)}
            >
              <span className={styles.galleryToggleIcon}>
                {showGallery ? "\u25BE" : "\u25B8"}
              </span>
              <span className={styles.galleryToggleText}>
                Browse image gallery
              </span>
              <span className={styles.galleryToggleCount}>
                {images.length} images
              </span>
            </button>

            {showGallery && images.length > 0 && (
              <div className={styles.selectGrid}>
                {images.map((image) => (
                  <button
                    key={image.id}
                    className={`${styles.imageCard} ${
                      imageSource?.imageId === image.id ? styles.selected : ""
                    }`}
                    onClick={() => selectGalleryImage(image)}
                    type="button"
                  >
                    <div
                      className={styles.imageThumb}
                      style={{
                        backgroundImage: image.url
                          ? `url(${image.url})`
                          : "none",
                      }}
                    />
                    <div className={styles.imageMeta}>
                      {(image.image_description ?? "No description").slice(0, 64)}
                      {(image.image_description ?? "").length > 64 ? "..." : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Caption suggestions (AI or sample) ── */}
        {sampleCaptionsLoading && (
          <div className={styles.processing}>
            <div className={styles.spinner} />
            <span className={styles.phaseLabel}>Loading sample captions...</span>
          </div>
        )}

        {generatingForGallery && (
          <div className={styles.processing}>
            <div className={styles.shimmerBar} />
            <div className={styles.spinner} />
            <span className={styles.phaseLabel}>Generating AI captions...</span>
          </div>
        )}

        {generatedCaptions.length > 0 && !generatingForGallery && (
          <div className={styles.suggestionsSection}>
            <h3 className={styles.sectionLabel}>
              <span className={styles.sectionAccent} />
              {suggestionsLabel}
            </h3>
            <p className={styles.suggestionsHint}>
              {imageSource?.kind === "upload"
                ? "Click a suggestion to use it, then edit to make it yours"
                : "See what others wrote \u2014 click one for inspiration, or write your own"}
            </p>
            <div className={styles.suggestionsList}>
              {generatedCaptions.map((text, idx) => (
                <button
                  key={idx}
                  className={`${styles.suggestionChip} ${
                    caption === text ? styles.active : ""
                  }`}
                  type="button"
                  onClick={() => setCaption(text)}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  &ldquo;{text}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Flavor selector ── */}
        {flavors.length > 0 && (
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionLabel}>
              <span className={styles.sectionAccent} />
              Humor flavor
            </h3>
            <div className={styles.flavorRow}>
              {flavors.map((flavor) => (
                <button
                  key={flavor.id}
                  className={`${styles.flavorChip} ${
                    selectedFlavorId === flavor.id ? styles.selected : ""
                  }`}
                  type="button"
                  onClick={() => setSelectedFlavorId(flavor.id)}
                >
                  {flavor.slug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Caption editor ── */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionLabel}>
            <span className={styles.sectionAccent} />
            Your caption
          </h3>
          <textarea
            className={styles.textArea}
            placeholder={
              imageSource?.kind === "gallery"
                ? "Write your best line for this image..."
                : "Pick a suggestion above or write your own..."
            }
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />

          <div className={styles.actionRow}>
            <span className={styles.vibeBadge}>{captionLength} chars</span>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || busy}
            >
              {busy ? "Submitting..." : "Submit caption"}
            </button>
            {caption.length > 0 && (
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setCaption("")}
              >
                Clear
              </button>
            )}
            {!userId && (
              <div className={styles.status}>Sign in to submit.</div>
            )}
            {userId && userEmail && (
              <div className={styles.status}>Signed in as {userEmail}</div>
            )}
            {status && <div className={styles.status}>{status}</div>}
          </div>
        </div>
      </div>

      {/* ── Right column: sidebar ── */}
      <aside className={styles.preview}>
        <div className={styles.previewCard}>
          <h3>Live preview</h3>
          {imageUrl ? (
            <div
              className={styles.previewImage}
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          ) : (
            <div className={styles.previewImageEmpty}>
              <span>No image selected</span>
            </div>
          )}
          <p className={styles.previewCaption}>
            {caption.trim() || "Your caption preview lands here."}
          </p>
          <div className={styles.previewMeta}>
            {selectedFlavor?.slug ?? "No flavor"} &middot;{" "}
            {imageSource
              ? imageSource.kind === "gallery"
                ? imageSource.description || "Gallery image"
                : "Uploaded image"
              : "No image"}
          </div>
        </div>

        <div className={styles.flowCard}>
          <h3 className={styles.flowTitle}>How it works</h3>
          <ol className={styles.flowSteps}>
            <li className={imageSource ? styles.flowStepDone : styles.flowStepActive}>
              Upload or pick an image
            </li>
            <li className={generatedCaptions.length > 0 ? styles.flowStepDone : imageSource ? styles.flowStepActive : ""}>
              Generate or browse captions
            </li>
            <li className={caption.length > 0 ? styles.flowStepDone : generatedCaptions.length > 0 ? styles.flowStepActive : ""}>
              Edit your caption
            </li>
            <li className={caption.length > 0 ? styles.flowStepActive : ""}>
              Submit
            </li>
          </ol>
        </div>
      </aside>

      {/* ── Toast notification ── */}
      {toast && (
        <div className={styles.toast}>
          {toast}
        </div>
      )}
    </section>
  );
}
