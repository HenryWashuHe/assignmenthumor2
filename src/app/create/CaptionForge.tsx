"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { createClient } from "@/lib/supabase/client";

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

export default function CaptionForge({
  images,
  flavors,
  userId,
  userEmail,
}: CaptionForgeProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    images[0]?.id ?? null
  );
  const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(
    flavors[0]?.id ?? null
  );
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) ?? null,
    [images, selectedImageId]
  );

  const selectedFlavor = useMemo(
    () => flavors.find((flavor) => flavor.id === selectedFlavorId) ?? null,
    [flavors, selectedFlavorId]
  );

  const canSubmit =
    Boolean(selectedImageId) && caption.trim().length > 0 && Boolean(userId);
  const captionLength = caption.trim().length;
  const vibe =
    captionLength < 18
      ? "Warm-up"
      : captionLength < 48
        ? "Punchy"
        : captionLength < 96
          ? "Story-mode"
          : "Epic";

  const promptSeeds = useMemo(() => {
    const flavorWord = selectedFlavor?.slug ?? "absurd";
    return [
      `Breaking: ${flavorWord} experts confirm this is normal.`,
      `POV: you thought this would be subtle.`,
      `No one asked, but ${flavorWord} won today.`,
      `Me acting calm while this scene unfolds.`,
    ];
  }, [selectedFlavor]);

  const randomFrom = <T,>(list: T[]): T | null => {
    if (list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)] ?? null;
  };

  const pickRandomImage = useCallback(() => {
    const pick = randomFrom(images);
    if (!pick) return;
    setSelectedImageId(pick.id);
  }, [images]);

  const pickRandomFlavor = useCallback(() => {
    const pick = randomFrom(flavors);
    if (!pick) return;
    setSelectedFlavorId(pick.id);
  }, [flavors]);

  const injectPrompt = useCallback(() => {
    const seed = randomFrom(promptSeeds);
    if (!seed) return;
    setCaption((prev) => (prev.trim().length > 0 ? `${prev}\n${seed}` : seed));
    setActiveStep(3);
  }, [promptSeeds]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "INPUT" ||
        target?.isContentEditable;
      if (isTypingTarget) return;

      if (event.key.toLowerCase() === "r") pickRandomImage();
      if (event.key.toLowerCase() === "f") pickRandomFlavor();
      if (event.key.toLowerCase() === "p") injectPrompt();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [injectPrompt, pickRandomFlavor, pickRandomImage]);

  const handleSubmit = async () => {
    if (!canSubmit || busy || !selectedImageId || !userId) return;
    setBusy(true);
    setStatus(null);

    const supabase = createClient();
    const { error } = await supabase.from("captions").insert({
      content: caption.trim(),
      is_public: false,
      profile_id: userId,
      image_id: selectedImageId,
      humor_flavor_id: selectedFlavorId,
    });

    if (error) {
      setStatus(`Could not submit: ${error.message}`);
    } else {
      setCaption("");
      setStatus("Caption submitted for review.");
    }
    setBusy(false);
  };

  return (
    <section className={styles.layout}>
      <div className={styles.panel}>
        <div className={styles.stageHeader}>
          <h2>Create mode</h2>
          <div className={styles.hotkeys}>
            <span>R random image</span>
            <span>F random style</span>
            <span>P prompt</span>
          </div>
        </div>
        <div className={styles.stepper}>
          <button
            className={`${styles.stepChip} ${activeStep === 1 ? styles.selected : ""} ${selectedImageId ? styles.stepDone : ""}`}
            type="button"
            onClick={() => setActiveStep(1)}
          >
            1 image
          </button>
          <button
            className={`${styles.stepChip} ${activeStep === 2 ? styles.selected : ""} ${selectedFlavorId ? styles.stepDone : ""}`}
            type="button"
            onClick={() => setActiveStep(2)}
          >
            2 style
          </button>
          <button
            className={`${styles.stepChip} ${activeStep === 3 ? styles.selected : ""} ${captionLength > 0 ? styles.stepDone : ""}`}
            type="button"
            onClick={() => setActiveStep(3)}
          >
            3 write
          </button>
        </div>

        {activeStep === 1 && <h2>Pick an image signal</h2>}
        {images.length === 0 ? (
          <div className={styles.empty}>
            No public or common-use images yet. Add rows to{" "}
            <code>images</code> with <code>is_public</code> or{" "}
            <code>is_common_use</code> set to true.
          </div>
        ) : (
          <div className={styles.selectGrid}>
            {images.map((image) => (
              <button
                key={image.id}
                className={`${styles.imageCard} ${
                  selectedImageId === image.id ? styles.selected : ""
                }`}
                onClick={() => {
                  setSelectedImageId(image.id);
                  setActiveStep(2);
                }}
                type="button"
              >
                <div
                  className={styles.imageThumb}
                  style={{
                    backgroundImage: image.url ? `url(${image.url})` : "none",
                  }}
                />
                <div className={styles.imageMeta}>
                  {(image.image_description ?? "No description yet.").slice(0, 64)}
                  {(image.image_description ?? "").length > 64 ? "..." : ""}
                </div>
              </button>
            ))}
          </div>
        )}
        <div className={styles.quickActions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={pickRandomImage}
          >
            Random image
          </button>
        </div>

        {activeStep === 2 && <h2>Choose a humor flavor</h2>}
        {flavors.length === 0 ? (
          <div className={styles.empty}>
            No humor flavors yet. Add rows to <code>humor_flavors</code>.
          </div>
        ) : (
          <div className={styles.flavorRow}>
            {flavors.map((flavor) => (
              <button
                key={flavor.id}
                className={`${styles.flavorChip} ${
                  selectedFlavorId === flavor.id ? styles.selected : ""
                }`}
                type="button"
                onClick={() => {
                  setSelectedFlavorId(flavor.id);
                  setActiveStep(3);
                }}
              >
                {flavor.slug}
              </button>
            ))}
          </div>
        )}
        <div className={styles.quickActions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={pickRandomFlavor}
          >
            Random style
          </button>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={injectPrompt}
          >
            Prompt me
          </button>
        </div>

        {activeStep === 3 && <h2>Write the caption</h2>}
        <textarea
          className={styles.textArea}
          placeholder="Drop your best surreal line..."
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />

        <div className={styles.actionRow}>
          <span className={styles.vibeBadge}>
            {captionLength} chars · {vibe}
          </span>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || busy}
          >
            {busy ? "Submitting..." : "Submit caption"}
          </button>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => setCaption("")}
          >
            Clear draft
          </button>
          {!userId && (
            <div className={styles.status}>Sign in to submit.</div>
          )}
          {userId && userEmail && (
            <div className={styles.status}>Signed in as {userEmail}</div>
          )}
          {status && <div className={styles.status}>{status}</div>}
        </div>
      </div>

      <aside className={styles.preview}>
        <div className={styles.previewCard}>
          <h3>Live card</h3>
          {selectedImage?.url && (
            <div
              className={styles.previewImage}
              style={{ backgroundImage: `url(${selectedImage.url})` }}
            />
          )}
          <p>{caption.trim() || "Your caption preview lands here."}</p>
          <div className={styles.previewMeta}>
            {selectedFlavor?.slug ?? "No flavor"} ·{" "}
            {selectedImage?.image_description ?? "No image"}
          </div>
        </div>
        <div className={styles.panel}>
          <h2>Flow</h2>
          <p className={styles.subhead}>Submit &rarr; review &rarr; public duels.</p>
        </div>
      </aside>
    </section>
  );
}
