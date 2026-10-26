export default function Brand() {
  return (
    <div className="brand">
      <svg className="brand-logo" viewBox="525 400 865 855" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="tk-ring" gradientUnits="userSpaceOnUse" x1="580" y1="1200" x2="1300" y2="470">
            <stop offset="0" stopColor="#0A2FA8" />
            <stop offset="0.5" stopColor="#1668F0" />
            <stop offset="1" stopColor="#6FE3FF" />
          </linearGradient>
          <linearGradient id="tk-tee" gradientUnits="userSpaceOnUse" x1="900" y1="584" x2="1150" y2="1020">
            <stop offset="0" stopColor="#46C2FF" />
            <stop offset="0.55" stopColor="#2A7BFF" />
            <stop offset="1" stopColor="#1A4FE0" />
          </linearGradient>
        </defs>
        <path fill="url(#tk-tee)" d="M887 584H910A48 48 0 0 1 958 632V685H1060V705A40 40 0 0 1 1020 745H958V890C958 935 990 960 1035 960C1130 960 1235 890 1262 760L1290 780L1236 940C1170 1000 1100 1018 1030 1018C940 1018 887 960 887 890V745H802V725A40 40 0 0 1 842 685H887Z" />
        <circle cx="930" cy="806" r="366" stroke="url(#tk-ring)" strokeWidth="70" />
        <line x1="1189" y1="1065" x2="1347" y2="1213" stroke="url(#tk-ring)" strokeWidth="70" strokeLinecap="round" />
      </svg>
      <span className="brand-name">tilik</span>
    </div>
  );
}
