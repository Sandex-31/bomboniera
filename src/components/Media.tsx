import { useState } from "react";

type Item = { src: string; alt: string; type?: "image" | "video" };

const resolve = (src: string) =>
  /^(https?:)?\/\//.test(src) ? src : import.meta.env.BASE_URL + src.replace(/^\//, "");

function Frame({ item }: { item: Item }) {
  const [failed, setFailed] = useState(false);
  const isVideo = item.type === "video" || /\.(mp4|webm)$/i.test(item.src);

  if (failed) {
    return (
      <figure>
        <div className="media__missing">
          <span aria-hidden="true">▢</span>
          <span>immagine non disponibile</span>
        </div>
        <figcaption>{item.alt}</figcaption>
      </figure>
    );
  }

  return (
    <figure>
      {isVideo ? (
        <video
          src={resolve(item.src)}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          aria-label={item.alt}
          onError={() => setFailed(true)}
        />
      ) : (
        <img
          src={resolve(item.src)}
          alt={item.alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      <figcaption>{item.alt}</figcaption>
    </figure>
  );
}

/** Renders screenshots/clips; a missing file degrades to a labelled placeholder. */
export default function Media({ items }: { items?: Item[] }) {
  if (!items?.length) return null;
  return (
    <div className="media">
      {items.map((item) => (
        <Frame key={item.src} item={item} />
      ))}
    </div>
  );
}
