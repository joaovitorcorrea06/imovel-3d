import { useEffect, useMemo, useState } from 'react';
import { ExperienceCanvas } from './components/ExperienceCanvas';
import { Overlay } from './components/Overlay';
import { heroCopy, initialPointId, tourPoints } from './data/tour';

const modelUrl = new URL('../3d-model/3_bedroom_house.glb', import.meta.url).href;
const INTRO_FADE_DURATION_MS = 420;

const getInitialPointIdFromLocation = () => {
  const hash = window.location.hash.replace('#', '').trim();
  return tourPoints.some((point) => point.id === hash) ? hash : initialPointId;
};

const App = () => {
  const pointsById = useMemo(
    () => new Map(tourPoints.map((point) => [point.id, point])),
    [],
  );
  const [tourStarted, setTourStarted] = useState(false);
  const [currentPointId, setCurrentPointId] = useState(getInitialPointIdFromLocation);
  const [requestedPointId, setRequestedPointId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [infoVisible, setInfoVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [controlsHintDismissed, setControlsHintDismissed] = useState(false);
  const [introPhase, setIntroPhase] = useState<'visible' | 'exiting' | 'hidden'>('visible');

  const currentPoint = pointsById.get(currentPointId) ?? tourPoints[0];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.hash = currentPointId;
    window.history.replaceState({}, '', url);
  }, [currentPointId]);

  const requestNavigation = (targetId: string) => {
    if (isTransitioning || targetId === currentPointId) {
      return;
    }

    setRequestedPointId(targetId);
    setInfoVisible(false);
  };

  return (
    <main className="app-shell">
      <ExperienceCanvas
        modelUrl={modelUrl}
        currentPointId={currentPointId}
        requestedPointId={requestedPointId}
        tourStarted={tourStarted}
        infoVisible={infoVisible}
        onRequestNavigate={requestNavigation}
        onArrive={(pointId) => {
          setCurrentPointId(pointId);
          setRequestedPointId(null);
          setInfoVisible(true);
        }}
        onTransitionChange={setIsTransitioning}
        onFirstDrag={() => setControlsHintDismissed(true)}
      />

      <Overlay
        hero={heroCopy}
        points={tourPoints}
        currentPoint={currentPoint}
        introPhase={introPhase}
        infoVisible={infoVisible}
        isTransitioning={isTransitioning}
        menuOpen={menuOpen}
        showControlsHint={!controlsHintDismissed}
        tourStarted={tourStarted}
        onStartTour={() => {
          if (introPhase !== 'visible') {
            return;
          }

          setIntroPhase('exiting');
          window.setTimeout(() => {
            setTourStarted(true);
            setRequestedPointId(null);
            setInfoVisible(true);
            setMenuOpen(false);
            setIntroPhase('hidden');
          }, INTRO_FADE_DURATION_MS);
        }}
        onToggleInfo={() => setInfoVisible((value) => !value)}
        onToggleMenu={() => setMenuOpen((value) => !value)}
        onRequestNavigate={requestNavigation}
      />
    </main>
  );
};

export default App;
