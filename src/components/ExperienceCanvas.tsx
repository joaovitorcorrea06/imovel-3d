import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Preload, useGLTF } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';
import {
  AUTO_ROTATE,
  CAMERA_CONFIG,
  DEBUG,
  modelInspection,
  modelSceneOffset,
  tourPoints,
} from '../data/tour';
import {
  buildPreviewWaypoints,
  buildRouteWaypoints,
  createTourPointIndex,
  findPointRoute,
  getForwardFromAngles,
  getLookAngles,
  getPointById,
  measurePathDistance,
  tupleToVector3,
} from '../lib/tour-routing';

type ExperienceCanvasProps = {
  modelUrl: string;
  currentPointId: string;
  requestedPointId: string | null;
  tourStarted: boolean;
  infoVisible: boolean;
  onRequestNavigate: (targetId: string) => void;
  onArrive: (pointId: string) => void;
  onTransitionChange: (isTransitioning: boolean) => void;
  onFirstDrag: () => void;
};

type CameraBridge = {
  adjustAngles: (yawDelta: number, pitchDelta: number) => void;
  adjustZoom: (deltaValue: number) => void;
  markInteraction: () => void;
};

type TransitionState = {
  curve: THREE.CatmullRomCurve3;
  progress: number;
  destinationTarget: THREE.Vector3;
  tween: gsap.core.Tween;
  targetId: string;
};

type CameraState = {
  position: THREE.Vector3;
  currentYaw: number;
  targetYaw: number;
  currentPitch: number;
  targetPitch: number;
  currentFov: number;
  targetFov: number;
};

type DebugSnapshotMode = 'position' | 'target' | 'hotspot' | 'point';

type CameraRigProps = {
  bridgeRef: MutableRefObject<CameraBridge | null>;
  currentPointId: string;
  requestedPointId: string | null;
  index: ReturnType<typeof createTourPointIndex>;
  tourStarted: boolean;
  dragging: boolean;
  freeCamera: boolean;
  onArrive: (pointId: string) => void;
  onTransitionChange: (isTransitioning: boolean) => void;
  debugSnapshotRef: MutableRefObject<((mode: DebugSnapshotMode) => Promise<void>) | null>;
};

const lookDistance = 4.8;
const dragThreshold = 3;
const horizontalDragDirection = CAMERA_CONFIG.invertHorizontalDrag ? 1 : -1;
const verticalDragDirection = CAMERA_CONFIG.invertVerticalDrag ? 1 : -1;

const LoadingState = () => (
  <Html center>
    <div className="loading-pill">Carregando modelo…</div>
  </Html>
);

const HouseModel = ({ modelUrl }: { modelUrl: string }) => {
  const { scene } = useGLTF(modelUrl);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((object) => {
      object.frustumCulled = true;

      const mesh = object as THREE.Mesh;
      if (!('material' in mesh) || !mesh.material) {
        return;
      }

      mesh.castShadow = false;
      mesh.receiveShadow = false;
    });

    clone.scale.setScalar(modelInspection.worldScaleMeters);
    clone.position.set(
      -modelSceneOffset[0],
      -modelSceneOffset[1],
      -modelSceneOffset[2],
    );

    return clone;
  }, [scene]);

  return <primitive object={clonedScene} />;
};

const DebugPanel = ({
  freeCamera,
  onToggleFreeCamera,
  onCopy,
}: {
  freeCamera: boolean;
  onToggleFreeCamera: () => void;
  onCopy: (mode: DebugSnapshotMode) => void;
}) => (
  <div className="debug-toolbar">
    <button type="button" onClick={onToggleFreeCamera}>
      {freeCamera ? 'Disable freecam' : 'Enable freecam'}
    </button>
    <button type="button" onClick={() => onCopy('position')}>
      Copy camera position
    </button>
    <button type="button" onClick={() => onCopy('target')}>
      Copy camera target
    </button>
    <button type="button" onClick={() => onCopy('hotspot')}>
      Copy hotspot position
    </button>
    <button type="button" onClick={() => onCopy('point')}>
      Add tour point
    </button>
  </div>
);

const CameraRig = ({
  bridgeRef,
  currentPointId,
  requestedPointId,
  index,
  tourStarted,
  dragging,
  freeCamera,
  onArrive,
  onTransitionChange,
  debugSnapshotRef,
}: CameraRigProps) => {
  const transitionRef = useRef<TransitionState | null>(null);
  const currentPointIdRef = useRef<string | null>(null);
  const activeTransitionTargetRef = useRef<string | null>(null);
  const lastInteractionRef = useRef(Date.now());
  const movementRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    fast: false,
  });

  const initialPoint = useMemo(() => getPointById(index, currentPointId), [currentPointId, index]);
  const initialPosition = useMemo(
    () => tupleToVector3(initialPoint.position),
    [initialPoint.position],
  );
  const initialTarget = useMemo(
    () => tupleToVector3(initialPoint.defaultTarget),
    [initialPoint.defaultTarget],
  );
  const initialAngles = useMemo(
    () => getLookAngles(initialPosition, initialTarget),
    [initialPosition, initialTarget],
  );
  const cameraStateRef = useRef<CameraState>({
    position: initialPosition.clone(),
    currentYaw: initialAngles.yaw,
    targetYaw: initialAngles.yaw,
    currentPitch: initialAngles.pitch,
    targetPitch: initialAngles.pitch,
    currentFov: CAMERA_CONFIG.defaultFov,
    targetFov: CAMERA_CONFIG.defaultFov,
  });

  useEffect(() => {
    bridgeRef.current = {
      adjustAngles: (yawDelta, pitchDelta) => {
        if (!tourStarted || transitionRef.current) {
          return;
        }

        cameraStateRef.current.targetYaw += yawDelta;
        cameraStateRef.current.targetPitch = THREE.MathUtils.clamp(
          cameraStateRef.current.targetPitch + pitchDelta,
          CAMERA_CONFIG.minPitch,
          CAMERA_CONFIG.maxPitch,
        );
        lastInteractionRef.current = Date.now();
      },
      adjustZoom: (deltaValue) => {
        if (!tourStarted) {
          return;
        }

        cameraStateRef.current.targetFov = THREE.MathUtils.clamp(
          cameraStateRef.current.targetFov + deltaValue,
          CAMERA_CONFIG.minFov,
          CAMERA_CONFIG.maxFov,
        );
        lastInteractionRef.current = Date.now();
      },
      markInteraction: () => {
        lastInteractionRef.current = Date.now();
      },
    };

    debugSnapshotRef.current = async (mode) => {
      const state = cameraStateRef.current;
      const target = state.position
        .clone()
        .add(
          getForwardFromAngles(state.currentYaw, state.currentPitch).multiplyScalar(
            lookDistance,
          ),
        );
      const round = (value: number) => Number(value.toFixed(3));
      const payload =
        mode === 'position'
          ? JSON.stringify(
              [round(state.position.x), round(state.position.y), round(state.position.z)],
              null,
              2,
            )
          : mode === 'target'
            ? JSON.stringify([round(target.x), round(target.y), round(target.z)], null, 2)
            : mode === 'hotspot'
              ? `hotspotPosition: ${JSON.stringify(
                  [round(state.position.x), round(state.position.y), round(state.position.z)],
                  null,
                  2,
                )}`
            : JSON.stringify(
                {
                  id: 'novo-ponto',
                  name: 'Novo ambiente',
                  position: [
                    round(state.position.x),
                    round(state.position.y),
                    round(state.position.z),
                  ],
                  defaultTarget: [round(target.x), round(target.y), round(target.z)],
                  connections: [],
                },
                null,
                2,
              );

      try {
        await navigator.clipboard.writeText(payload);
      } catch {
        console.info(payload);
      }
    };

    return () => {
      bridgeRef.current = null;
      debugSnapshotRef.current = null;
    };
  }, [bridgeRef, debugSnapshotRef, tourStarted]);

  useEffect(() => {
    if (!DEBUG || !freeCamera) {
      return undefined;
    }

    const setMovement = (event: KeyboardEvent, active: boolean) => {
      switch (event.code) {
        case 'KeyW':
          movementRef.current.forward = active;
          break;
        case 'KeyS':
          movementRef.current.backward = active;
          break;
        case 'KeyA':
          movementRef.current.left = active;
          break;
        case 'KeyD':
          movementRef.current.right = active;
          break;
        case 'KeyQ':
          movementRef.current.down = active;
          break;
        case 'KeyE':
          movementRef.current.up = active;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          movementRef.current.fast = active;
          break;
        default:
          break;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => setMovement(event, true);
    const handleKeyUp = (event: KeyboardEvent) => setMovement(event, false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [freeCamera]);

  useEffect(() => {
    if (!tourStarted) {
      const point = getPointById(index, currentPointId);
      const position = tupleToVector3(point.position);
      const angles = getLookAngles(position, tupleToVector3(point.defaultTarget));

      cameraStateRef.current.position.copy(position);
      cameraStateRef.current.currentYaw = angles.yaw;
      cameraStateRef.current.targetYaw = angles.yaw;
      cameraStateRef.current.currentPitch = angles.pitch;
      cameraStateRef.current.targetPitch = angles.pitch;
      currentPointIdRef.current = point.id;
      return;
    }

    if (currentPointIdRef.current !== null) {
      return;
    }

    const point = getPointById(index, currentPointId);
    const position = tupleToVector3(point.position);
    const angles = getLookAngles(position, tupleToVector3(point.defaultTarget));

    cameraStateRef.current.position.copy(position);
    cameraStateRef.current.currentYaw = angles.yaw;
    cameraStateRef.current.targetYaw = angles.yaw;
    cameraStateRef.current.currentPitch = angles.pitch;
    cameraStateRef.current.targetPitch = angles.pitch;
    currentPointIdRef.current = point.id;
  }, [currentPointId, index, tourStarted]);

  useEffect(() => {
    if (!tourStarted || !requestedPointId || activeTransitionTargetRef.current === requestedPointId) {
      return;
    }

    if (requestedPointId === currentPointIdRef.current && currentPointIdRef.current !== null) {
      return;
    }

    const destination = getPointById(index, requestedPointId);
    const route =
      currentPointIdRef.current === null
        ? [destination.id]
        : findPointRoute(index, currentPointIdRef.current, destination.id);
    const waypoints =
      currentPointIdRef.current === null
        ? buildPreviewWaypoints(cameraStateRef.current.position.clone(), destination)
        : buildRouteWaypoints(index, route);

    if (waypoints[0].distanceTo(cameraStateRef.current.position) > 0.04) {
      waypoints.unshift(cameraStateRef.current.position.clone());
    }

    onTransitionChange(true);
    activeTransitionTargetRef.current = destination.id;

    const transition: TransitionState = {
      curve: new THREE.CatmullRomCurve3(waypoints, false, 'catmullrom', 0.18),
      progress: 0,
      destinationTarget: tupleToVector3(destination.defaultTarget),
      tween: gsap.to({ value: 0 }, { duration: 0 }),
      targetId: destination.id,
    };

    transition.tween.kill();
    transition.tween = gsap.to(transition, {
      progress: 1,
      duration: THREE.MathUtils.clamp(
        measurePathDistance(waypoints) * CAMERA_CONFIG.transitionDistanceFactor,
        CAMERA_CONFIG.minTransitionDuration,
        CAMERA_CONFIG.maxTransitionDuration,
      ),
      ease: 'power2.inOut',
      onComplete: () => {
        const point = getPointById(index, destination.id);
        const position = tupleToVector3(point.position);
        const angles = getLookAngles(position, tupleToVector3(point.defaultTarget));

        cameraStateRef.current.position.copy(position);
        cameraStateRef.current.currentYaw = angles.yaw;
        cameraStateRef.current.targetYaw = angles.yaw;
        cameraStateRef.current.currentPitch = angles.pitch;
        cameraStateRef.current.targetPitch = angles.pitch;
        currentPointIdRef.current = point.id;
        transitionRef.current = null;
        activeTransitionTargetRef.current = null;
        lastInteractionRef.current = Date.now();
        onArrive(point.id);
        onTransitionChange(false);
      },
    });

    transitionRef.current = transition;
  }, [currentPointId, index, onArrive, onTransitionChange, requestedPointId, tourStarted]);

  useFrame((state, delta) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const transition = transitionRef.current;

    if (DEBUG && freeCamera) {
      const forward = getForwardFromAngles(
        cameraStateRef.current.currentYaw,
        cameraStateRef.current.currentPitch,
      );
      const flatForward = new THREE.Vector3(forward.x, 0, forward.z).normalize();
      const right = new THREE.Vector3(flatForward.z, 0, -flatForward.x).normalize();
      const velocity = (movementRef.current.fast ? 4.2 : 2.1) * delta;
      const offset = new THREE.Vector3();

      if (movementRef.current.forward) {
        offset.add(flatForward.clone().multiplyScalar(velocity));
      }
      if (movementRef.current.backward) {
        offset.add(flatForward.clone().multiplyScalar(-velocity));
      }
      if (movementRef.current.left) {
        offset.add(right.clone().multiplyScalar(-velocity));
      }
      if (movementRef.current.right) {
        offset.add(right.clone().multiplyScalar(velocity));
      }
      if (movementRef.current.up) {
        offset.y += velocity;
      }
      if (movementRef.current.down) {
        offset.y -= velocity;
      }

      cameraStateRef.current.position.add(offset);
    } else if (transition) {
      const position = transition.curve.getPoint(transition.progress);
      const ahead = transition.curve.getPoint(Math.min(transition.progress + 0.025, 1));
      const travelTarget =
        ahead.distanceTo(position) > 0.02 ? ahead : transition.destinationTarget;
      const settle = THREE.MathUtils.smoothstep(transition.progress, 0.82, 1);
      const desiredTarget = travelTarget
        .clone()
        .lerp(transition.destinationTarget, settle);
      const angles = getLookAngles(position, desiredTarget);

      cameraStateRef.current.position.copy(position);
      cameraStateRef.current.currentYaw = THREE.MathUtils.lerp(
        cameraStateRef.current.currentYaw,
        angles.yaw,
        1 - Math.exp(-delta * 10),
      );
      cameraStateRef.current.targetYaw = cameraStateRef.current.currentYaw;
      cameraStateRef.current.currentPitch = THREE.MathUtils.lerp(
        cameraStateRef.current.currentPitch,
        angles.pitch,
        1 - Math.exp(-delta * 10),
      );
      cameraStateRef.current.targetPitch = cameraStateRef.current.currentPitch;
    } else if (tourStarted && currentPointIdRef.current) {
      const point = getPointById(index, currentPointIdRef.current);
      cameraStateRef.current.position.copy(tupleToVector3(point.position));

      if (AUTO_ROTATE && !dragging) {
        const idleTime = Date.now() - lastInteractionRef.current;
        if (idleTime > CAMERA_CONFIG.idleDelayMs) {
          cameraStateRef.current.targetYaw += delta * CAMERA_CONFIG.autoRotateSpeed;
        }
      }
    }

    cameraStateRef.current.currentYaw = THREE.MathUtils.lerp(
      cameraStateRef.current.currentYaw,
      cameraStateRef.current.targetYaw,
      1 - Math.exp(-delta * (1 / CAMERA_CONFIG.damping) * 0.72),
    );
    cameraStateRef.current.currentPitch = THREE.MathUtils.lerp(
      cameraStateRef.current.currentPitch,
      cameraStateRef.current.targetPitch,
      1 - Math.exp(-delta * (1 / CAMERA_CONFIG.damping) * 0.72),
    );
    cameraStateRef.current.currentFov = THREE.MathUtils.lerp(
      cameraStateRef.current.currentFov,
      cameraStateRef.current.targetFov,
      1 - Math.exp(-delta * (1 / CAMERA_CONFIG.zoomDamping)),
    );

    camera.position.copy(cameraStateRef.current.position);
    camera.fov = cameraStateRef.current.currentFov;
    camera.updateProjectionMatrix();

    const direction = getForwardFromAngles(
      cameraStateRef.current.currentYaw,
      cameraStateRef.current.currentPitch,
    );

    camera.lookAt(camera.position.clone().add(direction.multiplyScalar(lookDistance)));
  });

  return null;
};

export const ExperienceCanvas = ({
  modelUrl,
  currentPointId,
  requestedPointId,
  tourStarted,
  infoVisible,
  onRequestNavigate,
  onArrive,
  onTransitionChange,
  onFirstDrag,
}: ExperienceCanvasProps) => {
  const index = useMemo(() => createTourPointIndex(tourPoints), []);
  const [dragging, setDragging] = useState(false);
  const [freeCamera, setFreeCamera] = useState(false);
  const bridgeRef = useRef<CameraBridge | null>(null);
  const debugSnapshotRef = useRef<
    ((mode: DebugSnapshotMode) => Promise<void>) | null
  >(null);
  const pointerRef = useRef({
    active: false,
    pointerId: -1,
    x: 0,
    y: 0,
    moved: false,
  });
  const touchRef = useRef({
    mode: 'none' as 'none' | 'drag' | 'pinch',
    lastDistance: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
  });

  const startPointerDrag = (clientX: number, clientY: number) => {
    if (!tourStarted) {
      return;
    }

    pointerRef.current.active = true;
    pointerRef.current.x = clientX;
    pointerRef.current.y = clientY;
    pointerRef.current.moved = false;
    setDragging(true);
    bridgeRef.current?.markInteraction();
  };

  const movePointerDrag = (clientX: number, clientY: number, sensitivity: number) => {
    if (!pointerRef.current.active || !bridgeRef.current) {
      return;
    }

    const dx = clientX - pointerRef.current.x;
    const dy = clientY - pointerRef.current.y;
    pointerRef.current.x = clientX;
    pointerRef.current.y = clientY;

    if (!pointerRef.current.moved && Math.hypot(dx, dy) > dragThreshold) {
      pointerRef.current.moved = true;
      onFirstDrag();
    }

    bridgeRef.current.adjustAngles(
      dx * sensitivity * horizontalDragDirection,
      dy * sensitivity * verticalDragDirection,
    );
    bridgeRef.current.markInteraction();
  };

  const endPointerDrag = () => {
    pointerRef.current.active = false;
    pointerRef.current.pointerId = -1;
    setDragging(false);
  };

  return (
    <div
      className={`canvas-shell ${tourStarted ? 'canvas-shell--interactive' : ''} ${
        dragging ? 'canvas-shell--dragging' : ''
      } ${infoVisible ? '' : 'canvas-shell--clean'}`}
      onPointerDown={(event) => {
        if (event.pointerType === 'touch' || event.button !== 0) {
          return;
        }

        pointerRef.current.pointerId = event.pointerId;
        startPointerDrag(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (event.pointerType === 'touch' || event.pointerId !== pointerRef.current.pointerId) {
          return;
        }

        movePointerDrag(event.clientX, event.clientY, CAMERA_CONFIG.sensitivity);
      }}
      onPointerUp={endPointerDrag}
      onPointerLeave={endPointerDrag}
      onWheel={(event) => {
        if (!tourStarted) {
          return;
        }

        event.preventDefault();
        bridgeRef.current?.adjustZoom(event.deltaY * CAMERA_CONFIG.zoomStep);
        bridgeRef.current?.markInteraction();
      }}
      onTouchStart={(event) => {
        if (!tourStarted) {
          return;
        }

        if (event.touches.length === 1) {
          const touch = event.touches[0];
          touchRef.current.mode = 'drag';
          touchRef.current.lastX = touch.clientX;
          touchRef.current.lastY = touch.clientY;
          touchRef.current.moved = false;
          setDragging(true);
          bridgeRef.current?.markInteraction();
        }

        if (event.touches.length === 2) {
          const dx = event.touches[0].clientX - event.touches[1].clientX;
          const dy = event.touches[0].clientY - event.touches[1].clientY;
          touchRef.current.mode = 'pinch';
          touchRef.current.lastDistance = Math.hypot(dx, dy);
          setDragging(false);
          bridgeRef.current?.markInteraction();
        }
      }}
      onTouchMove={(event) => {
        if (!tourStarted) {
          return;
        }

        event.preventDefault();

        if (touchRef.current.mode === 'drag' && event.touches.length === 1) {
          const touch = event.touches[0];
          const dx = touch.clientX - touchRef.current.lastX;
          const dy = touch.clientY - touchRef.current.lastY;
          touchRef.current.lastX = touch.clientX;
          touchRef.current.lastY = touch.clientY;

          if (!touchRef.current.moved && Math.hypot(dx, dy) > dragThreshold) {
            touchRef.current.moved = true;
            onFirstDrag();
          }

          bridgeRef.current?.adjustAngles(
            dx * CAMERA_CONFIG.touchSensitivity * horizontalDragDirection,
            dy * CAMERA_CONFIG.touchSensitivity * verticalDragDirection,
          );
          bridgeRef.current?.markInteraction();
        }

        if (touchRef.current.mode === 'pinch' && event.touches.length === 2) {
          const dx = event.touches[0].clientX - event.touches[1].clientX;
          const dy = event.touches[0].clientY - event.touches[1].clientY;
          const distance = Math.hypot(dx, dy);
          bridgeRef.current?.adjustZoom(-(distance - touchRef.current.lastDistance) * 0.05);
          touchRef.current.lastDistance = distance;
          bridgeRef.current?.markInteraction();
        }
      }}
      onTouchEnd={() => {
        touchRef.current.mode = 'none';
        setDragging(false);
      }}
    >
      <Canvas
        camera={{ fov: CAMERA_CONFIG.defaultFov, near: 0.1, far: 80 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        className="experience-canvas"
        onCreated={({ gl, scene }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
          scene.background = null;
        }}
      >
        <color attach="background" args={['#0f1311']} />
        <fog attach="fog" args={['#0f1311', 11, 27]} />
        <ambientLight intensity={0.62} />
        <directionalLight position={[5, 9, 3]} intensity={0.45} />
        <Suspense fallback={<LoadingState />}>
          <HouseModel modelUrl={modelUrl} />
        </Suspense>
        <CameraRig
          bridgeRef={bridgeRef}
          currentPointId={currentPointId}
          requestedPointId={requestedPointId}
          index={index}
          tourStarted={tourStarted}
          dragging={dragging}
          freeCamera={DEBUG && freeCamera}
          onArrive={onArrive}
          onTransitionChange={onTransitionChange}
          debugSnapshotRef={debugSnapshotRef}
        />
        <Preload all />
      </Canvas>

      {DEBUG ? (
        <DebugPanel
          freeCamera={freeCamera}
          onToggleFreeCamera={() => setFreeCamera((value) => !value)}
          onCopy={(mode) => {
            void debugSnapshotRef.current?.(mode);
          }}
        />
      ) : null}
    </div>
  );
};

useGLTF.preload(new URL('../../3d-model/3_bedroom_house.glb', import.meta.url).href);
