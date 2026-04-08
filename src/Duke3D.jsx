import React, { useEffect, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';

// NOTE: You must place your 'duke.glb' file in the 'public' folder!
export function Duke3D({ mood }) {
  const group = useRef();
  // 1. Load the model file
  const { nodes, materials, animations } = useGLTF('/duke.glb');
  const { actions } = useAnimations(animations, group);

  // 2. Manage Animations based on 'mood' prop
  useEffect(() => {
    // Stop all previous animations smoothly
    Object.values(actions).forEach(action => action?.fadeOut(0.5));

    // Select animation to play
    // (You must check your Blender file for exact animation names!)
    let actionToPlay = actions['Idle']; 

    if (mood === 'welcome') actionToPlay = actions['Wave'] || actions['Idle'];
    if (mood === 'deal') actionToPlay = actions['Bow'] || actions['Nod'];
    if (mood === 'idle') actionToPlay = actions['Idle'] || actions['Breathing'];

    // Play new animation
    if (actionToPlay) {
      actionToPlay.reset().fadeIn(0.5).play();
    }
  }, [mood, actions]);

  return (
    <group ref={group} dispose={null} position={[0, -2, 0]} scale={1.5}>
      {/* This part depends on your specific model structure. 
         If you downloaded a GLB, you can just dump the whole primitive here:
      */}
      <primitive object={nodes.Scene || nodes.root} />
    </group>
  );
}

// Pre-load the model to prevent stutter
useGLTF.preload('/duke.glb');