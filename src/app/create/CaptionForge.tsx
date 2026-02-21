"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { createClient } from "@/lib/supabase/client";

/* ── types ── */

interface ImageRow {
  id: string;
  url: string | null;
  image_description: string | null;
  is_common_use: boolean | null;
}

interface TermRow {
  id: number;
  term: string;
  definition: string;
  example: string;
}

interface CaptionForgeProps {
  images: ImageRow[];
  userId: string | null;
  userEmail: string | null;
  terms: TermRow[];
  currentVibe: string | null;
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
  generating: "Generating captions — this may take a moment...",
  done: "Done!",
  error: "Something went wrong",
};

/* ── component ── */

export default function CaptionForge({
  images,
  userId,
  userEmail,
  terms,
  currentVibe,
}: CaptionForgeProps) {
  const [imageSource, setImageSource] = useState<ImageSource>(null);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [sampleCaptionsLoading, setSampleCaptionsLoading] = useState(false);
  const [generatingForGallery, setGeneratingForGallery] = useState(false);
  const [submitSuccessPulse, setSubmitSuccessPulse] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitPulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const imageUrl = useMemo(() => {
    if (!imageSource) return null;
    return imageSource.kind === "gallery" ? imageSource.url : imageSource.cdnUrl;
  }, [imageSource]);

  const captionLength = caption.trim().length;
  const canSubmit = imageSource !== null && captionLength > 0 && Boolean(userId);
  const isGenerating = uploadPhase === "generating" || generatingForGallery;
  const isProcessing = uploadPhase === "uploading" || isGenerating;
  const suggestionsLabel =
    imageSource?.kind === "upload" ? "AI suggestions" : "Sample captions";
  const generationBackdrop = useMemo(() => {
    if (uploadPhase === "generating" && uploadPreview) return uploadPreview;
    return imageUrl ?? uploadPreview;
  }, [imageUrl, uploadPhase, uploadPreview]);
  const generationLabel =
    uploadPhase === "generating"
      ? PHASE_LABELS.generating
      : "Generating fresh captions for this image...";
  const currentVibeText =
    currentVibe && currentVibe.length > 320
      ? `${currentVibe.slice(0, 320)}...`
      : currentVibe;

  /* ── toast helper ── */

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (submitPulseTimer.current) clearTimeout(submitPulseTimer.current);
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
      const message = err instanceof Error ? err.message : "Unknown error occurred";
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
      const message = err instanceof Error ? err.message : "Generation failed";
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
    });

    if (error) {
      setStatus(`Could not submit: ${error.message}`);
    } else {
      setCaption("");
      setGeneratedCaptions([]);
      setImageSource(null);
      setUploadPhase("idle");
      setUploadPreview(null);
      setSubmitSuccessPulse(true);
      if (submitPulseTimer.current) clearTimeout(submitPulseTimer.current);
      submitPulseTimer.current = setTimeout(() => {
        setSubmitSuccessPulse(false);
      }, 1700);
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

        {/* ── Uploading state ── */}
        {uploadPhase === "uploading" && (
          <div className={styles.processing}>
            {uploadPreview && (
              <img src={uploadPreview} alt="Preview" className={styles.uploadPreviewImg} />
            )}
            <div className={styles.shimmerBar} />
            <div className={styles.spinner} />
            <span className={styles.phaseLabel}>{PHASE_LABELS.uploading}</span>
          </div>
        )}

        {/* ── Upload error ── */}
        {uploadPhase === "error" && (
          <div className={styles.errorState}>
            {uploadPreview && (
              <img src={uploadPreview} alt="Preview" className={styles.uploadPreviewImg} />
            )}
            <p className={styles.errorText}>{uploadError}</p>
            <button className={styles.secondaryButton} type="button" onClick={resetUpload}>
              Try again
            </button>
          </div>
        )}

        {/* ── Selected image banner ── */}
        {imageSource !== null && !isProcessing && (
          <div className={styles.selectedImageBanner}>
            {imageUrl && <img src={imageUrl} alt="Selected" />}
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
                <button className={styles.secondaryButton} type="button" onClick={resetUpload}>
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
                {showGallery ? "▾" : "▸"}
              </span>
              <span className={styles.galleryToggleText}>Browse image gallery</span>
              <span className={styles.galleryToggleCount}>{images.length} images</span>
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
                    <div className={styles.imageThumb}>
                      {image.url && (
                        <img
                          src={image.url}
                          alt={image.image_description ?? "Gallery image"}
                          className={styles.imageThumbImg}
                        />
                      )}
                    </div>
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

        {sampleCaptionsLoading && (
          <div className={styles.processing}>
            <div className={styles.spinner} />
            <span className={styles.phaseLabel}>Loading sample captions...</span>
          </div>
        )}

        <div className={styles.panelWriter}>
          <div className={styles.writerHeader}>Writer room</div>
          <div className={styles.writerGrid}>
            {currentVibeText && (
              <div className={`${styles.writerCard} ${styles.currentVibeCard}`}>
                <h3 className={styles.fuelTitle}>Current vibe</h3>
                <p className={styles.currentVibeText}>{currentVibeText}</p>
              </div>
            )}

            {terms.length > 0 && (
              <div className={styles.writerCard}>
                <h3 className={styles.fuelTitle}>Humor vocabulary</h3>
                {terms.map((term) => (
                  <div key={term.id} className={styles.vocabItem}>
                    <p className={styles.vocabTerm}>{term.term}</p>
                    <p className={styles.vocabMeaning}>{term.definition}</p>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.writerCard}>
              <h3 className={styles.fuelTitle}>Explore</h3>
              <p className={styles.fuelContext}>Need random inspiration first?</p>
              <Link href="/chaos-wall" className={styles.flowLink}>
                Open Chaos Wall &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right column: combined preview + inspiration ── */}
      <aside className={styles.preview}>
        <div
          className={`${styles.previewCard} ${
            submitSuccessPulse ? styles.previewCardCelebrating : ""
          }`}
        >
          {submitSuccessPulse && (
            <div className={styles.submitSuccessBadge} aria-hidden="true">
              ✓
            </div>
          )}
          <h3>Live preview + caption picks</h3>
          {imageUrl ? (
            <div className={styles.previewImageFrame}>
              <img src={imageUrl} alt="Selected image preview" className={styles.previewImage} />
            </div>
          ) : (
            <div className={styles.previewImageEmpty}>
              <span>No image selected</span>
            </div>
          )}
          <p className={styles.previewCaption}>
            {caption.trim() || "Your caption preview lands here."}
          </p>

          {generatedCaptions.length > 0 && (
            <div className={styles.previewSuggestions}>
              <p className={styles.suggestionsHint}>
                {suggestionsLabel}: tap a line to instantly preview and edit.
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

          <div className={styles.previewEditor}>
            <h4 className={styles.previewEditorTitle}>Your caption</h4>
            <textarea
              className={`${styles.textArea} ${styles.previewTextArea}`}
              placeholder="Write your line and preview it above in real time..."
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
            </div>

            <div className={styles.previewStatusRow}>
              {!userId && <div className={styles.status}>Sign in to submit.</div>}
              {userId && userEmail && (
                <div className={styles.status}>Signed in as {userEmail}</div>
              )}
              {status && <div className={styles.status}>{status}</div>}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Full-screen generation overlay ── */}
      {isGenerating && (
        <div className={styles.generationOverlay} role="status" aria-live="polite">
          {generationBackdrop && (
            <div
              className={styles.generationBackdrop}
              style={{ backgroundImage: `url(${generationBackdrop})` }}
            />
          )}
          <div className={styles.generationScrim} />
          <div className={styles.generationCenter}>
            <div className={styles.generationVisual}>
              {generationBackdrop && (
                <div className={styles.generationImageFrame}>
                  <img
                    src={generationBackdrop}
                    alt="Generating preview"
                    className={styles.generationImage}
                  />
                </div>
              )}
              <div className={styles.generationHalo} />
              <div className={styles.generationRing} />
              <div className={styles.generationDot} />
            </div>
            <p className={styles.generationEyebrow}>Studio in progress</p>
            <p className={styles.generationTitle}>{generationLabel}</p>
            <p className={styles.generationText}>
              Building a fresh caption set with tone and context baked in.
            </p>
          </div>
        </div>
      )}

      {/* ── Toast notification ── */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </section>
  );
}
