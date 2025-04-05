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
        },
        animation: {
          shake: 'shake 0.3s ease-in-out',
        },
      },
    },
  };
  