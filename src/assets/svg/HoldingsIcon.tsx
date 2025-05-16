import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

type Props = {
    width?: number;
    height?: number;
    color?: string;
};

/**
 * Custom Holdings icon that visually represents a portfolio or assets collection
 */
const HoldingsIcon = ({ width = 24, height = 24, color = '#666' }: Props) => (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
        {/* Base coin/token */}
        <Circle cx="12" cy="14" r="6" fill={color} opacity="0.9" />
        <Path
            d="M12 10.5v7M9 14h6"
            stroke="#000"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.3"
        />

        {/* Stacked coins/tokens effect */}
        <Circle cx="9" cy="9" r="4.5" fill={color} opacity="0.7" />
        <Path
            d="M9 6.5v5M7 9h4"
            stroke="#000"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.3"
        />

        <Circle cx="15" cy="7" r="3.5" fill={color} opacity="0.8" />
        <Path
            d="M15 5v4M13.5 7h3"
            stroke="#000"
            strokeWidth="0.7"
            strokeLinecap="round"
            opacity="0.3"
        />

        {/* Small token at top */}
        <Circle cx="13.5" cy="3.5" r="2" fill={color} />
        <Path
            d="M13.5 2.5v2M12.5 3.5h2"
            stroke="#000"
            strokeWidth="0.5"
            strokeLinecap="round"
            opacity="0.3"
        />
    </Svg>
);

export default HoldingsIcon; 