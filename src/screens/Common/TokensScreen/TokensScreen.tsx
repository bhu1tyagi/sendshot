import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '@/core/sharedUI';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import { useAppSelector, useAppDispatch } from '@/shared/hooks/useReduxHooks';
import { fetchUserTokens, fetchAllTokens, TokenData } from '@/shared/state/tokens';

export default function TokensScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { address } = useAppSelector(state => state.auth);
  const { userTokens, allTokens, loading } = useAppSelector(state => state.tokens);
  const [activeTab, setActiveTab] = useState<'myTokens' | 'allTokens'>('myTokens');
  const [refreshing, setRefreshing] = useState(false);

  const myTokensList = address ? userTokens[address] || [] : [];

  useEffect(() => {
    loadTokens();
  }, [address]);

  const loadTokens = async () => {
    if (address) {
      dispatch(fetchUserTokens(address));
    }
    dispatch(fetchAllTokens());
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTokens();
    setRefreshing(false);
  };

  const renderTokenItem = ({ item }: { item: TokenData }) => {
    return (
      <TouchableOpacity style={styles.tokenItem}>
        <View style={styles.tokenIconContainer}>
          {item.logoURI ? (
            <Image source={{ uri: item.logoURI }} style={styles.tokenIcon} />
          ) : (
            <View style={[styles.tokenIcon, styles.tokenIconPlaceholder]}>
              <Text style={styles.tokenIconText}>{item.symbol.substring(0, 2)}</Text>
            </View>
          )}
        </View>
        <View style={styles.tokenInfo}>
          <Text style={styles.tokenName}>{item.name}</Text>
          <Text style={styles.tokenSymbol}>{item.symbol}</Text>
        </View>
        <View style={styles.tokenMetrics}>
          <Text style={styles.tokenPrice}>
            {item.currentPrice ? `$${item.currentPrice.toFixed(6)}` : `$${item.initialPrice.toFixed(6)}`}
          </Text>
          <View style={styles.protocolBadge}>
            <Text style={styles.protocolText}>{item.protocolType}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {activeTab === 'myTokens'
          ? "You haven't created any tokens yet"
          : "No tokens available"}
      </Text>
      {activeTab === 'myTokens' && (
        <TouchableOpacity
          style={styles.createTokenButton}
          onPress={() => navigation.navigate('LaunchModules' as never)}>
          <Text style={styles.createTokenButtonText}>Create a Token</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Tokens"
        showBackButton={false}
        showDefaultRightIcons={true}
      />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'myTokens' && styles.activeTabButton]}
          onPress={() => setActiveTab('myTokens')}>
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'myTokens' && styles.activeTabButtonText,
            ]}>
            My Tokens
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'allTokens' && styles.activeTabButton]}
          onPress={() => setActiveTab('allTokens')}>
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'allTokens' && styles.activeTabButtonText,
            ]}>
            All Tokens
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brandPrimary} />
          <Text style={styles.loadingText}>Loading tokens...</Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'myTokens' ? myTokensList : allTokens}
          renderItem={renderTokenItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: COLORS.lighterBackground,
    borderRadius: 10,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: COLORS.brandPrimary,
  },
  tabButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.medium),
    color: COLORS.greyLight,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  activeTabButtonText: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    minHeight: '100%',
  },
  tokenItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.lighterBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  tokenIconContainer: {
    marginRight: 12,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tokenIconPlaceholder: {
    backgroundColor: COLORS.brandBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenIconText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.bold),
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.semiBold),
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  tokenSymbol: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.greyLight,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  tokenMetrics: {
    alignItems: 'flex-end',
  },
  tokenPrice: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.semiBold),
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
    marginBottom: 4,
  },
  protocolBadge: {
    backgroundColor: COLORS.brandBlue,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  protocolText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.greyLight,
    fontFamily: TYPOGRAPHY.fontFamily,
    marginBottom: 16,
    textAlign: 'center',
  },
  createTokenButton: {
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createTokenButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.semiBold),
    fontFamily: TYPOGRAPHY.fontFamily,
  },
}); 