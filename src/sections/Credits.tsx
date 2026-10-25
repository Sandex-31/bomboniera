import { useEffect, useRef } from "react";
import { creditRoll, credits } from "../data/credits";
import { graduationConfig } from "../config";

/**
 * Vertical closing scene. Blocks fade in as they enter the panel viewport;
 * with reduced motion the CSS keeps them all visible from the start.
 */
export default function Credits() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const blocks = root.current?.querySelectorAll(".credits__block");
    if (!blocks?.length) return;

    if (!("IntersectionObserver" in window)) {
      blocks.forEach((b) => b.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("is-in");
        }),
      // a share of the block would never be reached by one taller than the panel: its top coming in is enough
      { rootMargin: "0px 0px -20% 0px" },
    );
    blocks.forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, []);

  return (
    <div className="credits" ref={root}>
      {credits.map((block) => (
        <section
          key={block.id}
          className={`credits__block${block.emphasis ? " credits__block--emphasis" : ""}`}
        >
          {block.heading && <h3>{block.heading}</h3>}
          <p>{block.body}</p>
        </section>
      ))}

      <div className="credits__roll">
        {creditRoll.map((group) => (
          <section key={group.heading}>
            <h3>{group.heading}</h3>
            <ul>
              {group.names.map((name, i) => (
                <li key={`${name}-${i}`}>{name}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="credits__seal">
        <div className="credits__years">
          {graduationConfig.startYear} → {graduationConfig.year}
        </div>
        SYSTEM STATUS
        <br />
        <span className="credits__ok">DEGREE COMPLETED ✓</span>
        <br />
        {graduationConfig.name}
      </div>
    </div>
  );
}
