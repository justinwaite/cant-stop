interface ColorPickerProps {
  onSelect: (color: string, name: string) => void;
  takenColors?: string[];
  initialColor?: string | null;
  initialName?: string;
  isEditing?: boolean;
}

const playerColors = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#fbbf24', // yellow
  '#9333ea', // purple
];

import { useState, useEffect } from 'react';

export function ColorPicker({
  onSelect,
  takenColors = [],
  initialColor = null,
  initialName = '',
  isEditing = false,
}: ColorPickerProps) {
  // Try to load from localStorage if not provided
  const getInitialName = () => {
    if (initialName) return initialName;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('peakpursuit_name') || '';
    }
    return '';
  };
  const getInitialColor = () => {
    if (initialColor) return initialColor;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('peakpursuit_color') || null;
    }
    return null;
  };

  const [name, setName] = useState(getInitialName());
  const [selectedColor, setSelectedColor] = useState<string | null>(
    getInitialColor(),
  );

  // Update state when initial values change (for editing)
  useEffect(() => {
    setName(initialName || getInitialName());
    setSelectedColor(initialColor || getInitialColor());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialName, initialColor]);

  const canSubmit =
    name.trim().length > 0 &&
    selectedColor &&
    !takenColors.includes(selectedColor);

  function handleSubmit() {
    if (canSubmit && selectedColor) {
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('peakpursuit_name', name.trim());
        localStorage.setItem('peakpursuit_color', selectedColor);
      }
      onSelect(selectedColor, name.trim());
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(132,38,22,0.28)', // warm brown overlay
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <div
        style={{
          background: '#FBF0E3',
          border: '2px solid #E85E37',
          borderRadius: 18,
          boxShadow: '0 4px 24px rgba(132,38,22,0.13)',
          color: '#842616',
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          width: '100%',
          maxWidth: 340,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            fontSize: 20,
            marginBottom: 8,
            color: '#842616',
          }}
        >
          {isEditing ? 'Edit your color & name' : 'Pick your color & name'}
        </div>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            fontSize: 16,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #E2BFA3',
            marginBottom: 12,
            width: '100%',
            background: '#FFF',
            color: '#842616',
            fontWeight: 500,
          }}
          maxLength={20}
        />
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginBottom: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {playerColors.map((color) => {
            const taken = takenColors.includes(color);
            return (
              <div
                key={color}
                style={{
                  position: 'relative',
                  width: 40,
                  height: 40,
                  display: 'inline-block',
                }}
              >
                <button
                  onClick={() => !taken && setSelectedColor(color)}
                  disabled={taken}
                  style={{
                    width: 40,
                    height: 40,
                    background: color,
                    border:
                      selectedColor === color
                        ? '3px solid #E85E37'
                        : '2px solid #E2BFA3',
                    borderRadius: 8,
                    cursor: taken ? 'not-allowed' : 'pointer',
                    overflow: 'hidden',
                    opacity: taken ? 0.5 : 1,
                    position: 'relative',
                  }}
                  aria-label={`Pick color ${color}`}
                >
                  {taken && (
                    <svg
                      width="44"
                      height="44"
                      viewBox="0 0 44 44"
                      style={{
                        position: 'absolute',
                        top: -2,
                        left: -2,
                        pointerEvents: 'none',
                      }}
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="44"
                        y2="44"
                        stroke="#B98A68"
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity="1"
                      />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            fontSize: 16,
            padding: '8px 24px',
            borderRadius: 8,
            border: 'none',
            background: canSubmit ? '#E85E37' : '#F5E4D5',
            color: canSubmit ? '#FBF0E3' : '#B98A68',
            fontWeight: 'bold',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            marginTop: 8,
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => {
            if (canSubmit) e.currentTarget.style.background = '#DF4A2B';
          }}
          onMouseOut={(e) => {
            if (canSubmit) e.currentTarget.style.background = '#E85E37';
          }}
        >
          {isEditing ? 'Update' : 'Join Game'}
        </button>
      </div>
    </div>
  );
}
