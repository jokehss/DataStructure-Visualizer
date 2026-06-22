import React, { useState, useEffect, useRef } from 'react';
import DataStructureApp from './App.tsx';

// ==========================================
// 1. 物理仿真引擎 (Physics Particle Simulation - Antigravity Parallax)
// ==========================================

class Particle {
  constructor(canvasWidth, canvasHeight) {
    // 空间位置向量 P = [x, y]^T
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    
    // 基础巡航速度（极微小的环境漂移）
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    
    // 质量/视觉半径。这里将其作为 3D Z轴深度因子：越大离屏幕越近
    this.radius = Math.random() * 2.5 + 0.5; 
    
    // 璀璨星空色板：星钻白、香槟金、极光蓝、紫罗兰
    const colors = [
      'rgba(255, 255, 255, 0.95)',  // 星钻白
      'rgba(253, 230, 138, 0.85)',  // 香槟金 (Amber 200)
      'rgba(147, 197, 253, 0.8)',   // 极光蓝 (Blue 300)
      'rgba(216, 180, 254, 0.8)'    // 紫罗兰 (Purple 300)
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  // 视差运动学更新方程 (Parallax Kinematics Update)
  update(canvasWidth, canvasHeight, smoothMouse) {
    // 1. 基础环境漂移
    this.x += this.vx;
    this.y += this.vy;

    // 2. 全局视差随动 (Global Parallax Following)
    if (smoothMouse.x !== -1000) {
      // 计算鼠标偏离屏幕中心的距离 (Offset from center)
      const offsetX = smoothMouse.x - canvasWidth / 2;
      const offsetY = smoothMouse.y - canvasHeight / 2;
      
      // 核心算法：目标漂移流速。鼠标偏离中心越远，星空整体移动越快。
      // 使用 this.radius 作为深度权重，制造 3D 错觉（近处星星移动幅度大，远处小）
      const panSpeedX = (offsetX * 0.006) * this.radius;
      const panSpeedY = (offsetY * 0.006) * this.radius;

      this.x += panSpeedX;
      this.y += panSpeedY;
    }

    // 3. 刚性边界无缝回绕 (Seamless Wrap-around edges)
    // 使得星空看起来是无限延伸的宇宙
    if (this.x < 0) this.x += canvasWidth;
    if (this.x > canvasWidth) this.x -= canvasWidth;
    if (this.y < 0) this.y += canvasHeight;
    if (this.y > canvasHeight) this.y -= canvasHeight;
  }

  // 实体发光渲染
  draw(ctx) {
    // 开启物理辉光 (Bloom Effect) 制造星星的璀璨感
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    
    // 渲染完毕重置辉光，防止性能衰减与污染连线
    ctx.shadowBlur = 0; 
  }
}

const ParticleBackground = () => {
  const canvasRef = useRef(null);
  
  // 引入信号过滤：targetMouse 为真实鼠标输入，currentMouse 为经过低通滤波后的平滑坐标
  const targetMouseRef = useRef({ x: -1000, y: -1000 });
  const currentMouseRef = useRef({ x: -1000, y: -1000 });
  
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      // 动态计算星空密度
      const density = Math.floor((canvas.width * canvas.height) / 8000);
      const particleCount = Math.min(Math.max(density, 80), 200);
      particlesRef.current = Array.from({ length: particleCount }, () => new Particle(canvas.width, canvas.height));
      
      // 初始化鼠标位置在屏幕正中央，避免初次加载时星空乱窜
      targetMouseRef.current = { x: canvas.width / 2, y: canvas.height / 2 };
      currentMouseRef.current = { x: canvas.width / 2, y: canvas.height / 2 };
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 核心渲染主循环 (Main Animation Loop)
    const renderLoop = () => {
      // 制造轻微的视觉拖影残影（增加太空深邃感）
      ctx.fillStyle = 'rgba(5, 5, 15, 0.4)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 1. 鼠标输入信号的低通滤波 (Low-Pass Filter for Control Signal)
      // 使用线性插值(Lerp)平滑鼠标的急停急起，制造飞船转向般的阻尼惯性
      currentMouseRef.current.x += (targetMouseRef.current.x - currentMouseRef.current.x) * 0.04;
      currentMouseRef.current.y += (targetMouseRef.current.y - currentMouseRef.current.y) * 0.04;

      const particles = particlesRef.current;
      const smoothMouse = currentMouseRef.current;

      // 2. 状态推演与拓扑连线渲染
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update(canvas.width, canvas.height, smoothMouse);
        p1.draw(ctx);

        // 仅对临近粒子绘制极细微的星座连线
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < 12000) { 
            const dist = Math.sqrt(distSq);
            const alpha = 1 - dist / 109;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(216, 180, 254, ${alpha * 0.12})`; 
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleMouseMove = (e) => {
    targetMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseLeave = () => {
    // 鼠标离开时，目标点缓慢回归屏幕中心，星空停止随动漂移
    if (canvasRef.current) {
      targetMouseRef.current = { 
        x: window.innerWidth / 2, 
        y: window.innerHeight / 2 
      };
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="absolute inset-0 z-0 pointer-events-auto block"
    />
  );
};


// ==========================================
// 2. 入口视觉层 (Landing Page UI - For Miss Tong)
// ==========================================

const LandingPage = ({ onEnter }) => {
  return (
    // 使用极深的夜空蓝作为宇宙背景
    <div className="relative w-full h-screen bg-[#05050f] overflow-hidden flex flex-col items-center justify-center font-sans">
      
      {/* 动态视差星空引擎 */}
      <ParticleBackground />

      {/* 顶层交互蒙版与专属定制排版 */}
      <div className="z-10 flex flex-col items-center pointer-events-none mt-[-5vh]">
        
        {/* 浪漫徽标 */}
        <div className="mb-8 w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center backdrop-blur-md shadow-[0_0_50px_rgba(99,102,241,0.2)] animate-[pulse_3s_ease-in-out_infinite]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbcfe8" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            <circle cx="12" cy="12" r="2" fill="#c084fc" stroke="none" />
            <line x1="12" y1="12" x2="16" y2="8" stroke="#c084fc" strokeWidth="1" strokeDasharray="2 2" />
          </svg>
        </div>

        {/* 专属高亮标题 */}
        <h1 className="text-6xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-300 to-indigo-300 tracking-tight mb-6 drop-shadow-[0_0_20px_rgba(192,132,252,0.4)]">
          仝小姐的专属星空
        </h1>
        
        {/* 极致浪漫的副标题 */}
        <p className="text-indigo-200/80 text-sm md:text-base font-medium tracking-widest uppercase mb-16 flex items-center gap-4">
          <span className="w-16 h-[1px] bg-gradient-to-r from-transparent to-indigo-400/60"></span>
          漫天星辰，皆随你指尖流转
          <span className="w-16 h-[1px] bg-gradient-to-l from-transparent to-indigo-400/60"></span>
        </p>

        {/* 交互按钮 */}
        <button 
          onClick={onEnter}
          className="pointer-events-auto group relative px-12 py-4 bg-gradient-to-r from-indigo-500/80 to-purple-500/80 hover:from-indigo-400 hover:to-purple-400 text-white font-bold rounded-full overflow-hidden transition-all duration-500 backdrop-blur-sm border border-white/10 shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_60px_rgba(168,85,247,0.7)] hover:-translate-y-1"
        >
          {/* 按钮光泽扫过特效 */}
          <div className="absolute inset-0 w-1/4 h-full bg-white/30 skew-x-[45deg] -left-full group-hover:left-[150%] transition-all duration-1000 ease-in-out"></div>
          <span className="relative flex items-center gap-3 text-sm md:text-base tracking-widest uppercase">
            开启专属旅程 (Enter Universe)
            <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </button>

      </div>
      
      {/* 底部架构与制作人声明 */}
      <div className="absolute bottom-6 w-full px-8 flex justify-between items-end pointer-events-none">
        <div className="text-indigo-300/40 text-xs font-mono font-semibold tracking-wider">
          Engineered with Love & Kinematics API
        </div>
        <div className="text-right">
          <div className="text-indigo-200/90 text-sm font-medium tracking-[0.2em] drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
            制作人：黄先生
          </div>
        </div>
      </div>
    </div>
  );
};


export default function App() {
  const [hasEntered, setHasEntered] = useState(false);

  if (!hasEntered) {
    return <LandingPage onEnter={() => setHasEntered(true)} />;
  }

  return <DataStructureApp />;
}
