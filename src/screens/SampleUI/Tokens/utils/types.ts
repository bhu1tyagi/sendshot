import { TokenData, TrendingTokenData } from '@/shared/state/tokens';

// Type definition for display tokens (combines community and trending tokens)
export type TokenDisplay = TokenData | TrendingTokenData;

// TokenFeedListItem Props
export interface TokenFeedListItemProps {
    item: TokenDisplay;
    onPress: (token: TokenDisplay) => void;
    isCommunityToken?: boolean;
    onBuyPress: (token: TokenDisplay) => void;
}

// Search Bar Props
export interface SearchBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

// Token Details Sheet Props
export interface TokenDetailsProps {
    visible: boolean;
    onClose: () => void;
    token: TokenDisplay;
}

// Swap Drawer Props
export interface SwapDrawerProps {
    visible: boolean;
    onClose: () => void;
    targetToken: TokenDisplay;
    onSwapComplete: () => void;
}

// Custom Tab Bar Props
export interface CustomTabBarProps {
    index: number;
    setIndex: (index: number) => void;
}

// Props for Stable FlatLists
export interface StableFlatListProps {
    data: TokenDisplay[];
    renderItem: (item: { item: TokenDisplay; index: number }) => JSX.Element;
    keyExtractor: (item: TokenDisplay) => string;
    getItemLayout: (data: any, index: number) => { length: number; offset: number; index: number };
    handleLoadMore?: () => void;
    handleScroll?: (event: any) => void;
    handleScrollEnd?: () => void;
    renderFooter?: () => JSX.Element | null;
    loadingMoreTrendingTokens?: boolean;
    searchQuery?: string;
}

// Props for Tab Components
export interface TabComponentProps {
    searchQuery?: string;
    setSearchQuery?: (query: string) => void;
} 