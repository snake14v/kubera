/* Coffee loading screen — a cup that fills with espresso, steam wisps,
   and the ORBÉAN wordmark with the running-gold sweep. Pure CSS animation
   (no rAF dependence). Used by app/loading.tsx and the intro Splash. */

export default function BrewLoader({ tagline = "Brewing…" }: { tagline?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-forest-950">
      <svg viewBox="0 0 120 110" className="h-32 w-32" aria-hidden>
        {/* steam */}
        <g stroke="#D6B693" strokeWidth="2" strokeLinecap="round" fill="none">
          <path className="steam-1" d="M46 22c-3-4 3-7 0-11" />
          <path className="steam-2" d="M60 20c-3-4 3-7 0-11" />
          <path className="steam-3" d="M74 22c-3-4 3-7 0-11" />
        </g>
        {/* cup body (clip for the fill) */}
        <defs>
          <clipPath id="cupClip">
            <path d="M34 36h52v28a26 26 0 0 1-52 0V36z" />
          </clipPath>
        </defs>
        {/* coffee fill rises inside the cup */}
        <g clipPath="url(#cupClip)">
          <rect className="cup-coffee" x="30" y="36" width="60" height="58" fill="#8F5A2E" />
          <rect className="cup-coffee" x="30" y="36" width="60" height="8" fill="#D6B693" opacity="0.35" />
        </g>
        {/* cup outline */}
        <path d="M34 36h52v28a26 26 0 0 1-52 0V36z" fill="none" stroke="#B59556" strokeWidth="2.5" />
        {/* handle */}
        <path d="M86 42h6a9 9 0 0 1 0 18h-7" fill="none" stroke="#B59556" strokeWidth="2.5" />
        {/* saucer */}
        <path d="M28 98h64" stroke="#B59556" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      <p className="mt-6 font-display text-2xl font-bold tracking-tight text-cream">
        ORB<span className="rgb-text">É</span>AN
      </p>
      <p className="mt-2 font-body text-[11px] font-bold uppercase tracking-brand text-cream/45">
        {tagline}
      </p>
      <p className="mt-8 font-body text-[10px] uppercase tracking-brand text-cream/30">
        Powered by <span className="rgb-cyber font-bold">OORULOGIX</span>
      </p>
    </div>
  );
}
