import React from 'react';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';

type Props = {
    width?: number;
    height?: number;
    color?: string;
};

/**
 * Custom Send Funds icon that represents sending crypto to another wallet
 */
const SendFundsIcon = ({ width = 24, height = 24, color = '#fff' }: Props) => (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
        <Defs>
            <LinearGradient id="gradSend" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={color} stopOpacity="1" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.8" />
            </LinearGradient>
        </Defs>

        {/* Wallet base */}
        <Path
            d="M19.5 8h-15A2.5 2.5 0 002 10.5v7A2.5 2.5 0 004.5 20h15a2.5 2.5 0 002.5-2.5v-7A2.5 2.5 0 0019.5 8z"
            fill="url(#gradSend)"
            opacity="0.9"
        />

        {/* Wallet top flap */}
        <Path
            d="M19.5 8h-15c-.32 0-.62-.06-.9-.17l6.9-4.28c1.3-.8 2.9-.8 4.2 0l6.7 4.28c-.28.11-.58.17-.9.17z"
            fill="url(#gradSend)"
            opacity="0.8"
        />

        {/* Card/money inside wallet */}
        <Path
            d="M20 13h-4c-1.1 0-2 .9-2 2s.9 2 2 2h4v-4z"
            fill={color === '#fff' ? '#2ED594' : '#fff'}
            opacity="0.9"
        />

        {/* Send arrow */}
        <G transform="translate(12, 13) scale(0.5)">
            <Circle cx="0" cy="0" r="10" fill={color === '#fff' ? '#2ED594' : '#fff'} />
            <Path
                d="M-4,0 L4,0 M0,-4 L4,0 L0,4"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </G>
    </Svg>
);

export default SendFundsIcon; 