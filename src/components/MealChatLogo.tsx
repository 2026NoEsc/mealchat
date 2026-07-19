import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';

interface MealChatLogoProps {
  size?: number;
  showBackground?: boolean;
}

export const MealChatLogo: React.FC<MealChatLogoProps> = ({
  size = 100,
  showBackground = false
}) => {
  const viewBoxSize = 512;

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        fill="none"
      >
        {/* Background rounded card if requested (e.g. for app icon demo) */}
        {showBackground && (
          <Path
            d="M96 0h320c53 0 96 43 96 96v320c0 53-43 96-96 96H96c-53 0-96-43-96-96V96C0 43 43 0 96 0z"
            fill="#FFFFFF"
          />
        )}

        {/* 1. Green bubble (top left) */}
        {/* Color: #34A853 (Vibrant grass green) */}
        <Circle cx="190" cy="180" r="95" fill="#34A853" />
        {/* Green face */}
        {/* Eyes */}
        <Circle cx="165" cy="140" r="7" fill="#1A1A1A" />
        <Circle cx="205" cy="140" r="7" fill="#1A1A1A" />
        {/* Spoon */}
        {/* Spoon Bowl */}
        <Path d="M142 182 C135 182, 131 190, 131 198 C131 206, 136 214, 143 214 C150 214, 154 206, 154 198 C154 190, 150 182, 142 182 Z" fill="#FFFFFF" />
        {/* Spoon Handle */}
        <Path d="M142.5 212 L149 250" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        {/* Fork */}
        {/* Fork Base & Stem */}
        <Path d="M188 200 L188 250" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        {/* Fork Head/Prongs */}
        <Path d="M178 180 L178 202 A 10 10 0 0 0 198 202 L198 180" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        <Path d="M188 180 L188 202" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />

        {/* 2. Blue speech bubble (top right) */}
        {/* Color: #00A3FF (Vibrant sky blue) */}
        {/* We can construct a speech bubble path: circle centered at (315, 185) with tail pointing bottom-left */}
        <G>
          {/* Main circle */}
          <Circle cx="315" cy="185" r="90" fill="#00A3FF" />
          {/* Speech bubble tail */}
          <Path d="M 245 228 L 225 265 L 273 248 Z" fill="#00A3FF" />
        </G>
        {/* Blue face */}
        {/* Left eye: standard black dot */}
        <Circle cx="295" cy="165" r="7" fill="#1A1A1A" />
        {/* Right eye: winking w / sideways v shape '>' */}
        <Path d="M328 158 L340 165 L328 172" fill="none" stroke="#1A1A1A" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Mouth: laughing shape */}
        <Path d="M 298 190 Q 315 218 332 190 Z" fill="#1A1A1A" />

        {/* 3. Yellow bubble (bottom right) */}
        {/* Color: #FFD600 (Vibrant yellow) */}
        <Circle cx="320" cy="335" r="85" fill="#FFD600" />
        {/* Yellow face */}
        {/* Eyes */}
        <Circle cx="298" cy="315" r="7" fill="#1A1A1A" />
        <Circle cx="338" cy="315" r="7" fill="#1A1A1A" />
        {/* Mouth: surprised circle */}
        <Circle cx="318" cy="342" r="10" fill="#1A1A1A" />

        {/* 4. Orange bubble (bottom left) - overlaps green, blue, yellow */}
        {/* Color: #FF7A00 (Vibrant orange) */}
        <Circle cx="195" cy="325" r="115" fill="#FF7A00" />
        {/* Orange face */}
        {/* Eyes */}
        <Circle cx="165" cy="300" r="8" fill="#1A1A1A" />
        <Circle cx="215" cy="300" r="8" fill="#1A1A1A" />
        {/* Mouth: large cute happy smile */}
        <Path d="M 150 338 Q 190 388 230 338" fill="none" stroke="#1A1A1A" strokeWidth="8" strokeLinecap="round" />
      </Svg>
    </View>
  );
};
