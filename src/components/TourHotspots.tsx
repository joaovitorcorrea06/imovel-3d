import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { resolveHotspotPosition, tupleToVector3 } from '../lib/tour-routing';
import type { TourConnection, TourPoint } from '../data/tour';
import type { TourPointIndex } from '../lib/tour-routing';

type TourHotspotsProps = {
  point: TourPoint | null;
  index: TourPointIndex;
  visible: boolean;
  disabled: boolean;
  onNavigate: (targetId: string) => void;
  onSuppressDrag: () => void;
  debug: boolean;
};

type TourHotspotProps = {
  destination: TourPoint;
  connection: TourConnection;
  hotspotPosition: THREE.Vector3;
  onNavigate: (targetId: string) => void;
  onSuppressDrag: () => void;
};

type ResolvedHotspot = {
  connection: TourConnection;
  destination: TourPoint;
  hotspotPosition: THREE.Vector3;
};

const markerGeometry = new THREE.SphereGeometry(0.08, 18, 18);
const hitGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.14, 24);
const HOTSPOT_DEDUPE_DISTANCE = 0.48;

const getHotspotLabel = (connection: TourConnection, destination: TourPoint) =>
  connection.label ?? destination.name;

const resolvePointHotspots = (
  point: TourPoint,
  index: TourPointIndex,
) => {
  const hotspots: ResolvedHotspot[] = [];
  const warnings: string[] = [];

  point.connections.forEach((connection) => {
    const destination = index.map.get(connection.targetId);

    if (!destination) {
      return;
    }

    const hotspotPosition = resolveHotspotPosition(point, destination, connection);
    const duplicate = hotspots.find(
      (item) => item.hotspotPosition.distanceTo(hotspotPosition) < HOTSPOT_DEDUPE_DISTANCE,
    );

    if (duplicate) {
      warnings.push(
        `Two hotspots are too close: ${point.id} -> ${duplicate.connection.targetId} / ${point.id} -> ${connection.targetId}`,
      );
      return;
    }

    hotspots.push({
      connection,
      destination,
      hotspotPosition,
    });
  });

  return { hotspots, warnings };
};

const TourHotspot = ({
  destination,
  connection,
  hotspotPosition,
  onNavigate,
  onSuppressDrag,
}: TourHotspotProps) => {
  const visualRef = useRef<THREE.Group | null>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_state, delta) => {
    if (!visualRef.current) {
      return;
    }

    const targetScale = hovered ? 1.05 : 1;
    visualRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      1 - Math.exp(-delta * 12),
    );
  });

  return (
    <group position={hotspotPosition}>
      <mesh
        geometry={hitGeometry}
        position={[0, 0.02, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSuppressDrag();
        }}
        onPointerEnter={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerLeave={(event) => {
          event.stopPropagation();
          setHovered(false);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onNavigate(destination.id);
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={visualRef}>
        <mesh geometry={markerGeometry}>
          <meshBasicMaterial color="#f4ddaf" transparent opacity={hovered ? 0.95 : 0.72} />
        </mesh>
      </group>

      <Html position={[0, 0.18, 0]} center distanceFactor={8}>
        <div className={`hotspot-label ${hovered ? 'is-hovered' : ''}`}>
          <span className="hotspot-label__arrow">↑</span>
          <strong>{getHotspotLabel(connection, destination)}</strong>
        </div>
      </Html>
    </group>
  );
};

const DebugVisuals = ({ index }: { index: TourPointIndex }) => (
  <group>
    {index.order.map((point) => {
      const origin = tupleToVector3(point.position);
      const { hotspots, warnings } = resolvePointHotspots(point, index);

      return (
        <group key={point.id}>
          <mesh position={origin.clone().setY(0.08)}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
          <Html position={origin.clone().setY(0.28)} center distanceFactor={12}>
            <div className="debug-label">{point.id}</div>
          </Html>
          {warnings.map((warning, warningIndex) => (
            <Html
              key={`${point.id}-warning-${warningIndex}`}
              position={origin.clone().setY(0.42 + warningIndex * 0.12)}
              center
              distanceFactor={12}
            >
              <div className="debug-label debug-label--warning">{warning}</div>
            </Html>
          ))}
          {hotspots.map(({ connection, destination, hotspotPosition }, connectionIndex) => {
            const linePoints = [
              origin.clone().setY(0.05),
              hotspotPosition.clone(),
              ...(connection.path?.map(tupleToVector3) ?? []),
              tupleToVector3(destination.position).setY(0.05),
            ];

            return (
              <group key={`${point.id}-${connection.targetId}`}>
                <Line points={linePoints} color="#f8fafc" lineWidth={1.5} transparent opacity={0.45} />
                <mesh position={hotspotPosition}>
                  <boxGeometry args={[0.12, 0.04, 0.12]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
                <Html
                  position={hotspotPosition.clone().add(new THREE.Vector3(0, 0.16 + connectionIndex * 0.08, 0))}
                  center
                  distanceFactor={12}
                >
                  <div className="debug-label">
                    HOTSPOT: {getHotspotLabel(connection, destination)}
                  </div>
                </Html>
              </group>
            );
          })}
        </group>
      );
    })}
  </group>
);

export const TourHotspots = ({
  point,
  index,
  visible,
  disabled,
  onNavigate,
  onSuppressDrag,
  debug,
}: TourHotspotsProps) => {
  if (!point) {
    return debug ? <DebugVisuals index={index} /> : null;
  }

  const { hotspots } = resolvePointHotspots(point, index);

  return (
    <group visible={visible && !disabled}>
      {hotspots.map(({ connection, destination, hotspotPosition }) => (
        <TourHotspot
          key={`${point.id}-${connection.targetId}`}
          destination={destination}
          connection={connection}
          hotspotPosition={hotspotPosition}
          onNavigate={onNavigate}
          onSuppressDrag={onSuppressDrag}
        />
      ))}

      {debug ? <DebugVisuals index={index} /> : null}
    </group>
  );
};
