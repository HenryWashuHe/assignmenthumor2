"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";

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
}

export default function CaptionForge({ images, flavors }: CaptionForgeProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    images[0]?.id ?? null
  );
  const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(
    flavors[0]?.id ?? null
  );
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setIsSignedIn(Boolean(data.session));
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) ?? null,
    [images, selectedImageId]
  );

  const selectedFlavor = useMemo(
    () => flavors.find((flavor) => flavor.id === selectedFlavorId) ?? null,
    [flavors, selectedFlavorId]
  );

  const canSubmit =
    Boolean(selectedImageId) && caption.trim().length > 0 && isSignedIn;

  const handleSubmit = async () => {
    if (!canSubmit || busy || !selectedImageId) return;
    setBusy(true);
    setStatus(null);

    const { data: session } = await supabase.auth.getSession();
    const profileId = session.session?.user?.id;
    if (!profileId) {
      setStatus("Sign in to submit a caption.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("captions").insert({
      content: caption.trim(),
      is_public: false,
      profile_id: profileId,
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
        <h2>Pick an image signal</h2>
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
                onClick={() => setSelectedImageId(image.id)}
                type="button"
              >
                <div
                  className={styles.imageThumb}
                  style={{
                    backgroundImage: image.url ? `url(${image.url})` : "none",
                  }}
                />
                <div className={styles.imageMeta}>
                  {image.image_description ?? "No description yet."}
                </div>
              </button>
            ))}
          </div>
        )}

        <h2>Choose a humor flavor</h2>
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
                onClick={() => setSelectedFlavorId(flavor.id)}
              >
                {flavor.slug}
              </button>
            ))}
          </div>
        )}

        <h2>Write the caption</h2>
        <textarea
          className={styles.textArea}
          placeholder="Drop your best surreal line..."
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />

        <div className={styles.actionRow}>
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
          {!isSignedIn && (
            <div className={styles.status}>Sign in to submit.</div>
          )}
          {status && <div className={styles.status}>{status}</div>}
        </div>
      </div>

      <aside className={styles.preview}>
        <div className={styles.previewCard}>
          <h3>Preview</h3>
          <p>{caption.trim() || "Your caption preview lands here."}</p>
          <div className={styles.previewMeta}>
            {selectedFlavor?.slug ?? "No flavor"} ·{" "}
            {selectedImage?.image_description ?? "No image"}
          </div>
        </div>
        <div className={styles.panel}>
          <h2>Duels pull from public captions</h2>
          <p className={styles.subhead}>
            Submissions land private first. If approved, they can show up in the
            lightning duels and community feeds.
          </p>
        </div>
      </aside>
    </section>
  );
}
