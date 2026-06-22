// ============================================================
// src/hooks/useAnimationPlayer.ts
// 通用的动画帧播放控制 Hook —— UI 与算法的唯一桥梁
//
// 职责：
//   1. 管理播放状态机 (idle → playing → paused → finished)
//   2. 根据 playSpeed 使用 setTimeout 自动递进帧
//   3. 暴露所有控制方法给 UI 层
//   4. 处理边界条件（首帧、末帧、空状态数组）
//
// 设计约束：
//   - 绝对不包含任何算法逻辑
//   - 绝对不操作 DOM
//   - 只做"当前播到第几帧"的状态管理
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnimationState, PlaySpeed } from '@/types';

// ---- Hook 配置 ----

export interface UseAnimationPlayerOptions {
  /** 由 Core Generator 生成的全量状态快照数组 */
  states: AnimationState[];
  /** 初始播放速度（毫秒/帧），默认 1000 */
  initialSpeed?: PlaySpeed;
  /** 是否在 states 就绪后自动播放，默认 false */
  autoPlay?: boolean;
  /** states 变化后的初始帧索引，默认 0。设为 -1 表示最后一帧 */
  initialIndex?: number;
}

// ---- Hook 返回值 ----

export interface UseAnimationPlayerReturn {
  /** 当前帧的完整状态快照；states 为空时返回 null */
  currentState: AnimationState | null;
  /** 当前帧索引 (0-based) */
  currentIndex: number;
  /** 总帧数 */
  totalFrames: number;
  /** 是否正在自动播放 */
  isPlaying: boolean;
  /** 当前播放速度 (ms/帧) */
  playSpeed: PlaySpeed;
  /** 是否已经播放到最后一帧 */
  isFinished: boolean;

  // --- 控制方法 ---
  /** 开始/继续自动播放 */
  play: () => void;
  /** 暂停自动播放（保持当前帧） */
  pause: () => void;
  /** 前进一帧（自动暂停） */
  stepForward: () => void;
  /** 后退一帧（自动暂停） */
  stepBack: () => void;
  /** 跳转到指定帧 */
  jumpTo: (index: number) => void;
  /** 重置到第 0 帧并暂停 */
  reset: () => void;
  /** 切换播放/暂停 */
  togglePlay: () => void;
  /** 修改播放速度 */
  setSpeed: (speed: PlaySpeed) => void;
}

// ---- Hook 实现 ----

export function useAnimationPlayer(
  options: UseAnimationPlayerOptions,
): UseAnimationPlayerReturn {
  const { states, initialSpeed = 1000, autoPlay = false, initialIndex } = options;

  // ---------- 核心状态 ----------
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playSpeed, setPlaySpeedState] = useState<PlaySpeed>(initialSpeed);

  // 用 ref 存储最新值，避免 setTimeout / useEffect 闭包过期问题
  const playSpeedRef = useRef(playSpeed);
  playSpeedRef.current = playSpeed;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const totalFrames = states.length;
  const isFinished = totalFrames > 0 && currentIndex >= totalFrames - 1;

  // ---------- 边界守卫 ----------
  // states 数组变化时重置到 initialIndex（默认 0），-1 表示最后一帧
  useEffect(() => {
    const idx = initialIndex === -1
      ? Math.max(0, states.length - 1)
      : (initialIndex ?? 0);
    setCurrentIndex(Math.min(idx, Math.max(0, states.length - 1)));
    setIsPlaying(autoPlay);
  }, [states, autoPlay, initialIndex]);

  // ---------- 自动播放引擎 ----------
  useEffect(() => {
    if (!isPlaying || totalFrames === 0 || currentIndex >= totalFrames - 1) {
      return;
    }

    const timerId = setTimeout(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= totalFrames - 1) {
          setIsPlaying(false);
        }
        return next;
      });
    }, playSpeedRef.current);

    return () => clearTimeout(timerId);
  }, [isPlaying, currentIndex, totalFrames]);

  // ---------- 控制方法 ----------

  const play = useCallback(() => {
    if (totalFrames === 0) return;
    // 用函数式 setter 获取最新 currentIndex，避免闭包滞后
    setCurrentIndex((prev) => prev >= totalFrames - 1 ? 0 : prev);
    setIsPlaying(true);
  }, [totalFrames]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const stepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex((prev) =>
      Math.min(prev + 1, Math.max(0, totalFrames - 1)),
    );
  }, [totalFrames]);

  const stepBack = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const jumpTo = useCallback(
    (index: number) => {
      setIsPlaying(false);
      const clamped = Math.max(
        0,
        Math.min(index, Math.max(0, totalFrames - 1)),
      );
      setCurrentIndex(clamped);
    },
    [totalFrames],
  );

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      setIsPlaying(false);
    } else {
      if (totalFrames === 0) return;
      // 函数式 setter：从最后一帧自动回绕到第 0 帧
      setCurrentIndex((prev) => prev >= totalFrames - 1 ? 0 : prev);
      setIsPlaying(true);
    }
  }, [totalFrames]);

  const setSpeed = useCallback((speed: PlaySpeed) => {
    setPlaySpeedState(speed);
  }, []);

  // ---------- 派生：当前帧快照 ----------
  const currentState: AnimationState | null =
    totalFrames > 0 ? states[currentIndex] : null;

  return {
    currentState,
    currentIndex,
    totalFrames,
    isPlaying,
    playSpeed,
    isFinished,
    play,
    pause,
    stepForward,
    stepBack,
    jumpTo,
    reset,
    togglePlay,
    setSpeed,
  };
}
