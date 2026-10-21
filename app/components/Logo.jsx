export default function Logo({ size = 'md' }) {
  const iconSizes = {
    sm: 'h-10 w-11',
    md: 'h-14 w-16',
    lg: 'h-24 w-28',
  };

  return (
    <div className="flex items-center gap-3">
      {/* 3D "B" Book Cut-Out (Zero Bounding Boxes/Squares) */}
      <svg
        className={`${iconSizes[size]} flex-shrink-0 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)]`}
        viewBox="0 0 100 85"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Deep Under-Shadow / Spine Extension (For volumetric depth) */}
        <path
          d="M 12 79 L 10 79 L 10 6 L 15 4"
          stroke="#1e1b4b"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* BACK COVER LAYER (B Outline shifted right/up) */}
        <path
          d="M 17 76 
             L 50 76 
             C 66 76, 73 68, 73 57 
             C 73 49, 68 44, 59 42 
             C 67 40, 72 34, 72 25 
             C 72 14, 65 8, 48 8 
             L 17 8 Z"
          fill="#1e1b4b"
        />

        {/* 3D PACKED PAGES (The sandwiched core - styled as stacked vertical paper lines) */}
        {/* Core cream base */}
        <path
          d="M 14 74 L 52 74 C 68 74 74 65 74 54 C 74 46 68 41 59 39 C 67 37 72 31 72 22 C 72 12 65 6 48 6 L 14 6 Z"
          fill="#fef3c7"
          className="dark:fill-amber-100"
        />

        {/* Page End Lines (Outer rounded contours mimicking stacked paper) */}
        <g stroke="#d97706" strokeWidth="0.8" opacity="0.45" className="dark:stroke-amber-600">
          <path d="M 48 7.5 C 62 7.5 69.5 12 69.5 22.5 C 69.5 30 65.5 35 57 37.5" />
          <path d="M 49 9 C 63 9 70.5 13 70.5 23 C 70.5 30.5 66.5 35.5 58 38" />
          <path d="M 50 10.5 C 64 10.5 71.5 14 71.5 23.5 C 71.5 31 67.5 36 59 38.5" />
          
          <path d="M 57 40.5 C 66 42 71.5 48 71.5 56 C 71.5 64 64 72.5 50 72.5" />
          <path d="M 58 42 C 67 43.5 72.5 49 72.5 56.5 C 72.5 64.5 65 73.5 51 73.5" />
          <path d="M 59 43.5 C 68 45 73.5 50 73.5 57 C 73.5 65 66 74.5 52 74.5" />
        </g>

        {/* Inner cutout pages (Boles) */}
        <g stroke="#d97706" strokeWidth="0.5" opacity="0.4">
          {/* Top hole internal curves */}
          <path d="M 27 15 L 43 15 C 47 15 49 17 49 21 C 49 25 47 27 43 27 L 27 27" fill="#1e1b4b" />
          <path d="M 28 16.5 L 42 16.5 C 45 16.5 47 18 47 21 C 47 24 45 25.5 42 25.5 L 28 25.5" />
          {/* Bottom hole internal curves */}
          <path d="M 27 41 L 47 41 C 51 41 54 44 54 49 C 54 54 51 57 47 57 L 27 57" fill="#1e1b4b" />
          <path d="M 28 42.5 L 45 42.5 C 49 42.5 51.5 45 51.5 49 C 51.5 53 49 55.5 45 55.5 L 28 55.5" />
        </g>

        {/* FRONT COVER LAYER (Classic "B" offset down and left to emphasize the depth) */}
        <g>
          {/* Spine / Outermost cover rim */}
          <path
            d="M 12 79 L 10 79 L 10 6 L 15 4 Z"
            fill="#312e81"
            className="dark:fill-indigo-950"
          />
          <path
            d="M 12 79 L 12 4"
            stroke="#4338ca"
            strokeWidth="1.5"
            className="dark:stroke-indigo-800"
          />

          {/* Main front cover face */}
          <path
            d="M 12 79 
               L 48 79 
               C 64 79, 71 70, 71 59 
               C 71 51, 66 46, 57 44 
               C 65 42, 70 36, 70 27 
               C 70 16, 63 10, 46 10 
               L 12 10 Z"
            fill="#4f46e5"
            className="dark:fill-indigo-500"
            stroke="#3730a3"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Cover decorative border / bevel lines */}
          <path
            d="M 16 75 
               L 46 75 
               C 59 75, 66 68, 66 59 
               C 66 52, 62 48, 54 46 
               C 61 44, 65 39, 65 27 
               C 65 18, 59 14, 45 14 
               L 16 14 Z"
            stroke="#6366f1"
            strokeWidth="1"
            opacity="0.65"
            className="dark:stroke-indigo-300"
          />

          {/* Top Hole (B shape cut-outs) */}
          <path
            d="M 24 21 
               L 42 21 
               C 46 21, 48 23, 48 27 
               C 48 31, 46 33, 42 33 
               L 24 33 Z"
            fill="#f8fafc"
            className="dark:fill-slate-950"
            stroke="#3730a3"
            strokeWidth="1.5"
          />
          {/* Inner hole highlight */}
          <path d="M 27 24 L 40 24 C 42 24 43 25 43 27 C 43 29 42 30 40 30 L 27 30 Z" stroke="#6366f1" strokeWidth="0.8" opacity="0.5" />

          {/* Bottom Hole */}
          <path
            d="M 24 47 
               L 46 47 
               C 50 47, 52 49, 52 54 
               C 52 59, 50 61, 46 61 
               L 24 61 Z"
            fill="#f8fafc"
            className="dark:fill-slate-950"
            stroke="#3730a3"
            strokeWidth="1.5"
          />
          {/* Inner hole highlight */}
          <path d="M 27 50 L 44 50 C 46 50 47 51 47 53.5 C 47 56 46 57.5 44 57.5 L 27 57.5 Z" stroke="#6366f1" strokeWidth="0.8" opacity="0.5" />
        </g>
      </svg>

      {/* Brand Title / Text Typography */}
      <div className="flex flex-col select-none">
        <span className="font-extrabold tracking-tight text-slate-900 dark:text-white text-xl leading-none">
          Book<span className="text-indigo-600 dark:text-indigo-400">Borrowers</span>
        </span>
        <span className="text-[9px] text-slate-400 tracking-widest font-semibold uppercase mt-0.5">
          Friendly Library
        </span>
      </div>
    </div>
  );
}