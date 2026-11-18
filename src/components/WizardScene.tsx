export default function WizardScene() {
  return (
    <div className="wizard-scene" aria-label="女巫站在魔法棋盘上守护金币">
      <div className="scene-glow scene-glow-one" />
      <div className="scene-glow scene-glow-two" />
      <svg className="scene-art" viewBox="0 0 640 440" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="boardTop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbfaff" />
            <stop offset="1" stopColor="#e7e0ff" />
          </linearGradient>
          <linearGradient id="boardSide" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c5f1e3" />
            <stop offset="1" stopColor="#91d7c2" />
          </linearGradient>
          <linearGradient id="coin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a5f2df" />
            <stop offset=".55" stopColor="#79c8d8" />
            <stop offset="1" stopColor="#a38cf1" />
          </linearGradient>
          <linearGradient id="robe" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8172e8" />
            <stop offset="1" stopColor="#5545b7" />
          </linearGradient>
          <filter id="softShadow" x="-30%" y="-30%" width="160%" height="170%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
            <feOffset dy="10" />
            <feComponentTransfer><feFuncA type="linear" slope=".16" /></feComponentTransfer>
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g opacity=".72" stroke="#37314f" strokeWidth="2.5" strokeLinejoin="round">
          <path d="m78 280 274-144 210 108-277 150Z" fill="url(#boardTop)" />
          <path d="m78 280 207 114v28L78 308Z" fill="url(#boardSide)" />
          <path d="m285 394 277-150v28L285 422Z" fill="#9bdcc8" />
        </g>
        <path d="m155 274 197-103 144 75-199 105Z" fill="#d9d2fa" stroke="#342d4d" strokeWidth="3" />
        <path d="m155 274 142 78v18l-142-78Z" fill="#b6a9ed" stroke="#342d4d" strokeWidth="3" />
        <path d="m297 352 199-106v18L297 370Z" fill="#a294e2" stroke="#342d4d" strokeWidth="3" />

        <g stroke="#302a47" strokeWidth="3" strokeLinejoin="round">
          <path d="m174 228 26-14 26 14-26 15Z" fill="#fff" />
          <path d="m174 228 26 15v22l-26-15Z" fill="#c8bdf2" />
          <path d="m200 243 26-15v22l-26 15Z" fill="#e5e0ff" />
          <path d="m345 191 24-13 25 13-25 14Z" fill="#fff" />
          <path d="m345 191 24 14v21l-24-14Z" fill="#c8bdf2" />
          <path d="m369 205 25-14v21l-25 14Z" fill="#e5e0ff" />
          <path d="m410 229 24-13 26 13-26 15Z" fill="#fff" />
          <path d="m410 229 24 15v21l-24-14Z" fill="#c8bdf2" />
          <path d="m434 244 26-15v21l-26 15Z" fill="#e5e0ff" />
          <path d="m282 170 24-13 26 13-26 14Z" fill="#fff" />
          <path d="m282 170 24 14v20l-24-14Z" fill="#c8bdf2" />
          <path d="m306 184 26-14v20l-26 14Z" fill="#e5e0ff" />
          <path d="m323 301 43-23 42 23-43 24Z" fill="#fff" />
          <path d="m323 301 42 24v42l-42-24Z" fill="#c8bdf2" />
          <path d="m365 325 43-24v42l-43 24Z" fill="#e5e0ff" />
        </g>

        <g className="scene-trees" stroke="#3b5360" strokeWidth="2.5" strokeLinejoin="round">
          <path d="m107 257 17-47 18 47Z" fill="#72c8ad" />
          <path d="m124 210v55" fill="none" />
          <path d="m75 275 15-39 16 39Z" fill="#91ddc4" />
          <path d="m90 236v46" fill="none" />
          <path d="m546 286 15-42 17 42Z" fill="#8bd8bd" />
          <path d="m561 244v49" fill="none" />
          <path d="m570 294 12-33 14 33Z" fill="#66bda3" />
          <path d="m582 261v38" fill="none" />
        </g>

        <g filter="url(#softShadow)">
          <ellipse cx="212" cy="330" rx="60" ry="13" fill="#8b7cc7" opacity=".22" />
          <path d="m197 216 38-7 23 116-87 0Z" fill="url(#robe)" stroke="#29243f" strokeWidth="4" strokeLinejoin="round" />
          <path d="m232 220 21-4 23 91-20 9Z" fill="#6252c9" stroke="#29243f" strokeWidth="4" strokeLinejoin="round" />
          <path d="m192 190q18-25 42-2l12 30q-25 26-52 0Z" fill="#fff5e9" stroke="#29243f" strokeWidth="4" />
          <path d="m185 186 22-94q3-11 10-2l43 98q-38 20-75-2Z" fill="url(#robe)" stroke="#29243f" strokeWidth="4" strokeLinejoin="round" />
          <path d="m187 179q36 17 75 0l9 15q-42 20-91 0Z" fill="#f2c16d" stroke="#29243f" strokeWidth="4" />
          <path d="m221 117 6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2Z" fill="#ffe79a" />
          <path d="m199 198q16 8 35 1" fill="none" stroke="#29243f" strokeWidth="3" strokeLinecap="round" />
          <circle cx="207" cy="210" r="3" fill="#29243f" />
          <circle cx="231" cy="210" r="3" fill="#29243f" />
        </g>

        <g className="floating-coin" filter="url(#softShadow)">
          <circle cx="365" cy="254" r="34" fill="#4c4474" opacity=".16" />
          <circle cx="365" cy="244" r="34" fill="url(#coin)" stroke="#302a47" strokeWidth="4" />
          <circle cx="365" cy="244" r="26" fill="none" stroke="#f8f4ff" strokeWidth="2.5" opacity=".8" />
          <path d="m365 221 6 15 16 2-12 11 3 16-13-8-14 8 3-16-12-11 16-2Z" fill="#fff4bd" />
        </g>
        <g fill="#fff" opacity=".85">
          <path d="m305 100 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
          <path d="m475 164 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" />
          <circle cx="300" cy="256" r="3" />
          <circle cx="452" cy="310" r="3" />
        </g>
      </svg>
      <div className="scene-caption">
        <span className="scene-caption-dot" />
        <span>THE WIZARD'S KEEP</span>
        <span className="scene-caption-line" />
        <span>STUDIONET · 61999</span>
      </div>
    </div>
  );
}
