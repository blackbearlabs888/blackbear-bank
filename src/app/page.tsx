      {/* Shine Animation Style */}
      <style jsx global>{`
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(12deg); }
          50%, 100% { transform: translateX(200%) skewX(12deg); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-30px) translateX(5px); }
        }
        
        @keyframes float-medium {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); }
          33% { transform: translateY(-15px) translateX(-15px) scale(1.05); }
          66% { transform: translateY(-25px) translateX(10px) scale(0.95); }
        }
        
        @keyframes float-fast {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(20px); }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        
        .animate-float-slow {
          animation: float-slow 20s ease-in-out infinite;
        }
        
        .animate-float-medium {
          animation: float-medium 15s ease-in-out infinite;
        }
        
        .animate-float-fast {
          animation: float-fast 10s ease-in-out infinite;
        }
        
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>
      </div>
    </>
  );
}
