"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Bola partikel dekoratif untuk hero.
 *
 * Tiga hal yang sebelumnya salah dan membuat visual ini tampak seperti gagal
 * render (bidang putih pipih di kanan hero):
 *
 * 1. `alpha: false` membuat Canvas opaque, jadi WebGL melukis latar putih
 *    default di atas hero yang gelap. Sekarang transparan.
 * 2. Partikel disebar acak dalam KUBUS 8×8×8 dengan hue cyan (0.6–1.0),
 *    sehingga tidak berbentuk bola sama sekali dan warnanya bertabrakan dengan
 *    brand oranye. Sekarang distribusi permukaan sphere + palet brand.
 * 3. `OrbitControls` menangkap event pointer di seluruh area Canvas — di mobile
 *    itu memblokir scroll halaman. Rotasi kini dilakukan di useFrame, tanpa
 *    controls, jadi tidak ada perebutan gesture.
 */

const PARTICLE_COUNT = 600;

function ParticleSphere() {
  const points = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    // Palet brand: oranye → amber. Diambil sebagai literal karena WebGL tidak
    // bisa membaca CSS custom property; nilainya mengikuti --primary/--brand-2.
    const brand = new THREE.Color("#fb7a23");
    const brandAlt = new THREE.Color("#fbbf24");

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribusi seragam di permukaan sphere (metode Marsaglia) supaya
      // siluetnya benar-benar bulat, bukan awan kubus.
      const u = Math.random() * 2 - 1;
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);

      // Sedikit variasi radius memberi kedalaman tanpa merusak siluet.
      const radius = 1.75 + Math.random() * 0.22;

      positions[i * 3] = radius * r * Math.cos(theta);
      positions[i * 3 + 1] = radius * u;
      positions[i * 3 + 2] = radius * r * Math.sin(theta);

      const c = brand.clone().lerp(brandAlt, Math.random());
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    return { positions, colors };
  }, []);

  useFrame((_, delta) => {
    if (!points.current) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    points.current.rotation.y += delta * 0.12;
    points.current.rotation.x += delta * 0.08;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function HeroOrb() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      // pointer-events-none: elemen ini murni dekoratif dan tidak boleh
      // mencuri gesture scroll/tap dari konten di sekitarnya.
      className="pointer-events-none"
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: false, alpha: true, powerPreference: "default" }}
      dpr={[1, 1.25]}
    >
      <ParticleSphere />
    </Canvas>
  );
}
