module.exports = {
    theme: {
      extend: {
        keyframes: {
          shake: {
            '0%, 100%': { transform: 'translateX(0)' },
            '25%': { transform: 'translateX(-4px)' },
            '50%': { transform: 'translateX(4px)' },
            '75%': { transform: 'translateX(-4px)' },
          },
          shine: {
            '0%': { left: '-100%' },
            '20%': { left: '100%' },
            '100%': { left: '100%' },
          },
          glow: {
            '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: '0.5' },
            '50%': { transform: 'translate(-50%, -50%) scale(1.2)', opacity: '0.2' },
          },
        },
        animation: {
          shake: 'shake 0.3s ease-in-out',
          'shine': 'shine 3s infinite',
          'glow': 'glow 2s infinite',
        },
        backgroundImage: {
          'radial-red': 'radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0) 70%)',
          'radial-blue': 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0) 70%)',
          'dots': 'radial-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
        },
        backgroundSize: {
          'dots': '20px 20px',
        },
      },
    },
  };
