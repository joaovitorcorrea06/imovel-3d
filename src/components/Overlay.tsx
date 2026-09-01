import type { TourPoint } from '../data/tour';

type OverlayProps = {
  hero: {
    eyebrow: string;
    title: string[];
    description: string;
    cta: string;
  };
  points: TourPoint[];
  currentPoint: TourPoint;
  introPhase: 'visible' | 'exiting' | 'hidden';
  infoVisible: boolean;
  isTransitioning: boolean;
  menuOpen: boolean;
  showControlsHint: boolean;
  tourStarted: boolean;
  onStartTour: () => void;
  onToggleInfo: () => void;
  onToggleMenu: () => void;
  onRequestNavigate: (targetId: string) => void;
};

const Intro = ({
  hero,
  phase,
  onStartTour,
}: {
  hero: OverlayProps['hero'];
  phase: OverlayProps['introPhase'];
  onStartTour: () => void;
}) => (
  <section className={`intro-stage ${phase === 'exiting' ? 'is-exiting' : ''}`}>
    <div className="intro-panel">
      <span className="eyebrow">{hero.eyebrow}</span>
      <h1>
        {hero.title.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </h1>
      <p>{hero.description}</p>
      <button type="button" className="cta-button" onClick={onStartTour}>
        {hero.cta}
      </button>
    </div>
  </section>
);

const RoomInfo = ({
  points,
  point,
  visible,
  isTransitioning,
  onToggleInfo,
  onRequestNavigate,
}: {
  points: TourPoint[];
  point: TourPoint;
  visible: boolean;
  isTransitioning: boolean;
  onToggleInfo: () => void;
  onRequestNavigate: (targetId: string) => void;
}) => {
  if (!visible || isTransitioning) {
    return null;
  }

  const currentIndex = points.findIndex((item) => item.id === point.id);
  const previousPoint = currentIndex > 0 ? points[currentIndex - 1] : null;
  const nextPoint = currentIndex >= 0 && currentIndex < points.length - 1 ? points[currentIndex + 1] : null;

  return (
    <aside className="room-panel">
      <div className="room-panel__header">
        <span className="eyebrow">{point.eyebrow}</span>
        <div className="room-panel__actions">
          <div className="room-nav" aria-label="Navegação entre ambientes">
            <button
              type="button"
              className="room-nav__button"
              onClick={() => previousPoint && onRequestNavigate(previousPoint.id)}
              aria-label={previousPoint ? `Ir para ${previousPoint.name}` : 'Sem ambiente anterior'}
              disabled={!previousPoint}
            >
              ←
            </button>
            <button
              type="button"
              className="room-nav__button"
              onClick={() => nextPoint && onRequestNavigate(nextPoint.id)}
              aria-label={nextPoint ? `Ir para ${nextPoint.name}` : 'Sem próximo ambiente'}
              disabled={!nextPoint}
            >
              →
            </button>
          </div>
          <button type="button" className="ghost-button" onClick={onToggleInfo}>
            Ocultar
          </button>
        </div>
      </div>
      <h2>{point.title}</h2>
      <p>{point.description}</p>
      <ul className="feature-list">
        {point.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
    </aside>
  );
};

const RoomsMenu = ({
  points,
  currentPointId,
  menuOpen,
  onToggleMenu,
  onRequestNavigate,
}: {
  points: TourPoint[];
  currentPointId: string;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onRequestNavigate: (targetId: string) => void;
}) => (
  <div className={`rooms-menu ${menuOpen ? 'rooms-menu--open' : ''}`}>
    <button type="button" className="menu-trigger" onClick={onToggleMenu}>
      <span>☰</span>
      <span>Ambientes</span>
    </button>
    <div className="rooms-menu__panel" aria-hidden={!menuOpen}>
      <div className="rooms-menu__header">
        <span className="eyebrow">Navegação</span>
        <button type="button" className="ghost-button" onClick={onToggleMenu}>
          Fechar
        </button>
      </div>
      <div className="rooms-menu__list">
        {points.map((point) => (
          <button
            key={point.id}
            type="button"
            className={point.id === currentPointId ? 'is-active' : ''}
            onClick={() => {
              onRequestNavigate(point.id);
              onToggleMenu();
            }}
          >
            <span>{point.name}</span>
            <small>{point.eyebrow}</small>
          </button>
        ))}
      </div>
    </div>
  </div>
);

export const Overlay = ({
  hero,
  points,
  currentPoint,
  introPhase,
  infoVisible,
  isTransitioning,
  menuOpen,
  showControlsHint,
  tourStarted,
  onStartTour,
  onToggleInfo,
  onToggleMenu,
  onRequestNavigate,
}: OverlayProps) => (
  <div className="overlay-shell">
    <div className="overlay-grid">
      {introPhase !== 'hidden' ? (
        <Intro hero={hero} phase={introPhase} onStartTour={onStartTour} />
      ) : null}

      {tourStarted ? (
        <>
          <div className="room-chip">
            <span className="room-chip__label">Ambiente atual</span>
            <strong>{currentPoint.name}</strong>
          </div>

          <RoomsMenu
            points={points}
            currentPointId={currentPoint.id}
            menuOpen={menuOpen}
            onToggleMenu={onToggleMenu}
            onRequestNavigate={onRequestNavigate}
          />

          <RoomInfo
            points={points}
            point={currentPoint}
            visible={infoVisible}
            isTransitioning={isTransitioning}
            onToggleInfo={onToggleInfo}
            onRequestNavigate={onRequestNavigate}
          />

          {!infoVisible ? (
            <button type="button" className="info-toggle" onClick={onToggleInfo}>
              i
            </button>
          ) : null}

          {showControlsHint && !isTransitioning ? (
            <div className="controls-hint">
              <span className="controls-hint__icon" />
              <span>Clique e arraste para explorar</span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  </div>
);
