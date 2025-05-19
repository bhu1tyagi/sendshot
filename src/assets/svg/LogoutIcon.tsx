import React from 'react';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';

type Props = {
    width?: number;
    height?: number;
    color?: string;
};

/**
 * Custom Logout icon with a door and arrow design
 */
const LogoutIcon = ({ width = 24, height = 24, color = '#fff' }: Props) => (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
        <Defs>
            <LinearGradient id="gradLogout" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={color} stopOpacity="1" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.8" />
            </LinearGradient>
        </Defs>

        {/* Door frame */}
        <Path
            d="M17 3H7c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
            stroke="url(#gradLogout)"
            strokeWidth="1.5"
            fill="none"
        />

        {/* Door */}
        <Path
            d="M15.5 3.5v17"
            stroke="url(#gradLogout)"
            strokeWidth="1.5"
            strokeLinecap="round"
        />

        {/* Exit arrow */}
        <G>
            <Path
                d="M13.5 12H3.5"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <Path
                d="M6.5 8L3 12l3.5 4"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </G>

        {/* Door handle */}
        <Circle
            cx="17"
            cy="12"
            r="1"
            fill={color}
        />
    </Svg>
);

export default LogoutIcon; 