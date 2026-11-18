import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, AppState, PanResponder, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop, Text as SvgText } from "react-native-svg";
import { colors, fonts } from "@/core/theme/tokens";
import { fibonacciSphere, greatCircle, latLonToVec, project, yawFacing, type Vec3 } from "../lib/globe";

export type GlobePlace = { code: string; lat: number; lon: number };

const DOTS = 340;
const ARC_STEPS = 44;
const TILT = 0.38; // look slightly down on the globe (radians)
const AUTO_SPIN = 0.12; // radians per second
const FRAME_MS = 1000 / 30;
const PLANE_LOOP_MS = 3600;

/**
 * A slowly spinning dotted 3D globe with flight arcs from the traveller's city.
 * Drag to spin (with a little inertia). Pauses off-screen / in background, and
 * holds still for "Reduce Motion". Pure SVG — runs in Expo Go.
 */
export function Globe3D({ size, origin, destinations }: { size: number; origin: GlobePlace; destinations: GlobePlace[] }) {
  const R = size * 0.42;
  const c = size / 2;
  const dots = useMemo(() => fibonacciSphere(DOTS), []);
  const originVec = useMemo(() => latLonToVec(origin.lat, origin.lon), [origin.lat, origin.lon]);
  const routes = useMemo(
    () =>
      destinations.map((d, i) => ({
        code: d.code,
        vec: latLonToVec(d.lat, d.lon),
        arc: greatCircle(originVec, latLonToVec(d.lat, d.lon), ARC_STEPS),
        offset: i / destinations.length,
      })),
    [destinations, originVec],
  );

  // Start facing a point between the origin and the routes, so arcs are in view.
  const homeYaw = useMemo(() => {
    const lons = [origin.lon, ...destinations.map((d) => d.lon)];
    const mid = lons.reduce((a, b) => a + b, 0) / lons.length;
    return yawFacing((origin.lon * 2 + mid) / 3);
  }, [origin.lon, destinations]);

  const yaw = useRef(homeYaw);
  const velocity = useRef(0);
  const dragging = useRef(false);
  // What the SVG draws from: the spin angle and a clock for the planes/pulse.
  const [frame, setFrame] = useState({ yaw: homeYaw, time: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const running = useRef(false);

  useEffect(() => {
    yaw.current = homeYaw;
    velocity.current = 0;
  }, [homeYaw]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  // Animation loop (30 fps), only while the screen is focused and the app is active.
  const loop = useCallback(() => {
    let raf = 0;
    let last = Date.now();
    let acc = 0;
    running.current = true;
    const tick = () => {
      if (!running.current) return;
      const now = Date.now();
      const dt = Math.min(64, now - last);
      last = now;
      if (!dragging.current) {
        velocity.current *= 0.94;
        yaw.current += (reduceMotion ? 0 : AUTO_SPIN * (dt / 1000)) + velocity.current * (dt / 16);
      }
      acc += dt;
      if (acc >= FRAME_MS) {
        acc = 0;
        setFrame({ yaw: yaw.current, time: now });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      running.current = false;
      cancelAnimationFrame(raf);
    };
  }, [reduceMotion]);

  useFocusEffect(
    useCallback(() => {
      let stop = loop();
      const sub = AppState.addEventListener("change", (s) => {
        stop();
        if (s === "active") stop = loop();
      });
      return () => {
        stop();
        sub.remove();
      };
    }, [loop]),
  );

  // Built once; the handlers only touch refs/state when a drag happens, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => {
          dragging.current = true;
          velocity.current = 0;
        },
        onPanResponderMove: (_e, g) => {
          yaw.current += g.vx * 0.06;
          velocity.current = g.vx * 0.02;
          const y = yaw.current;
          setFrame((f) => ({ yaw: y, time: f.time }));
        },
        onPanResponderRelease: () => {
          dragging.current = false;
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
        },
      }),
  );

  const toScreen = (v: Vec3) => {
    const p = project(v, frame.yaw, TILT);
    return { x: c + p.x * R, y: c + p.y * R, z: p.z };
  };

  // Dots: back ones faint and small, front ones brighter and bigger → depth.
  const dotEls = dots.map((d, i) => {
    const p = toScreen(d);
    const front = p.z > 0;
    const r = front ? 0.9 + 1.5 * p.z : 0.7;
    const opacity = front ? 0.22 + 0.6 * p.z : 0.07;
    return <Circle key={i} cx={p.x} cy={p.y} r={r} fill={colors.ink} opacity={opacity} />;
  });

  const arcEls = routes.map((route) => {
    const pts = route.arc.map(toScreen);
    // Only draw the parts of the arc on the visible side.
    let d = "";
    let pen = false;
    for (const p of pts) {
      if (p.z > -0.08) {
        d += `${pen ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)} `;
        pen = true;
      } else pen = false;
    }
    const t = ((frame.time / PLANE_LOOP_MS + route.offset) % 1 + 1) % 1;
    const plane = pts[Math.round(t * ARC_STEPS)];
    const dest = toScreen(route.vec);
    return (
      <G key={route.code}>
        {d ? <Path d={d} stroke={colors.accent} strokeWidth={1.6} strokeOpacity={0.75} fill="none" strokeLinecap="round" /> : null}
        {plane.z > 0 && !reduceMotion ? (
          <>
            <Circle cx={plane.x} cy={plane.y} r={6} fill={colors.accent} opacity={0.18} />
            <Circle cx={plane.x} cy={plane.y} r={2.6} fill={colors.accent} />
          </>
        ) : null}
        {dest.z > 0 ? (
          <>
            <Circle cx={dest.x} cy={dest.y} r={3.2} fill={colors.card} stroke={colors.accent} strokeWidth={1.5} />
            <SvgText x={dest.x + 6} y={dest.y - 6} fontSize={10} fontFamily={fonts.bodySemi} fill={colors.ink} opacity={0.4 + 0.6 * dest.z}>
              {route.code}
            </SvgText>
          </>
        ) : null}
      </G>
    );
  });

  const o = toScreen(originVec);
  const pulse = (frame.time % 1800) / 1800;

  return (
    <View
      style={{ width: size, height: size }}
      {...pan.panHandlers}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Globe showing flights from ${origin.code} to ${destinations.map((d) => d.code).join(", ")}. Drag to spin.`}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="sphere" cx="42%" cy="36%" r="62%">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="0.7" stopColor={colors.bgGlow} stopOpacity="1" />
            <Stop offset="1" stopColor="#cfe3ee" stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0.78" stopColor={colors.accent} stopOpacity="0" />
            <Stop offset="0.9" stopColor={colors.accent} stopOpacity="0.14" />
            <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={R * 1.18} fill="url(#halo)" />
        <Circle cx={c} cy={c} r={R} fill="url(#sphere)" />
        {dotEls}
        {arcEls}
        {o.z > 0 ? (
          <G>
            {!reduceMotion ? <Circle cx={o.x} cy={o.y} r={5 + pulse * 12} fill={colors.accent} opacity={0.35 * (1 - pulse)} /> : null}
            <Circle cx={o.x} cy={o.y} r={5} fill={colors.ink} stroke={colors.card} strokeWidth={2} />
            <SvgText x={o.x + 8} y={o.y + 14} fontSize={11} fontFamily={fonts.bodyBold} fill={colors.ink}>
              {origin.code}
            </SvgText>
          </G>
        ) : null}
      </Svg>
    </View>
  );
}
