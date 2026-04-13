type Props = {
  priming: boolean;
  charging: boolean;
};

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Z" fill="currentColor" />
      <path
        d="M18 16V11a6 6 0 1 0-12 0v5l-2 2h16l-2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M19 11a7 7 0 0 1-14 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 18v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9 21h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M8 7h8l1.4 2H20a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2.6L8 7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16.5 16.5 21 21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return <span className="linkGoogleSpinner" aria-hidden="true" />;
}

export function GoogleMockPage({ priming, charging }: Props) {
  return (
    <div className="linkGoogleRoot" aria-label="search">
      <div className="linkGoogleTop">
        <div className="linkGoogleTopRight">
          <button type="button" className="linkGoogleIconBtn" aria-label="notifications">
            <BellIcon />
          </button>
          <div className="linkGoogleAvatar" aria-label="profile">
            Д
          </div>
        </div>
        <div className="linkGoogleLogo" aria-hidden="true">
          Google
        </div>
      </div>

      <div className="linkGoogleSearch">
        <div className="linkGoogleSearchInner" aria-label="search bar">
          <div className="linkGoogleSearchIcon">
            <SearchIcon />
          </div>
          <div className="linkGoogleSearchText" aria-hidden="true" />
          <div className="linkGoogleSearchActions" aria-hidden="true">
            <MicIcon />
            <CameraIcon />
          </div>
        </div>
      </div>

      <div className="linkGoogleTabs" aria-hidden="true">
        <div className="linkGoogleTab">Режим ИИ</div>
        <div className="linkGoogleTab">Все</div>
        <div className="linkGoogleTab linkGoogleTabActive">Картинки</div>
        <div className="linkGoogleTab">Видео</div>
        <div className="linkGoogleTab">Покупки</div>
      </div>

      <div className="linkGoogleBody" aria-hidden="true" />

      <div className="linkGoogleBottom" aria-label="bottom search bar">
        <div className="linkGoogleBottomLeft" aria-hidden="true">
          <MenuIcon />
        </div>
        <div className="linkGoogleBottomField" aria-hidden="true" />
        <div className="linkGoogleBottomRight" aria-hidden="true">
          {(priming || charging) && <Spinner />}
        </div>
      </div>
    </div>
  );
}
