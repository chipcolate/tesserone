import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useTheme, typography } from '../../theme';
import {
  searchBrands,
  getBrandLogo,
  pickCustomLogo,
  takeCustomLogoPhoto,
  type BrandEntry,
} from '../../services/logos';

interface LogoPickerProps {
  /** Current query text (typically the card name). */
  query: string;
  onQueryChange: (text: string) => void;
  /** Called when a curated brand is selected. */
  onBrandSelect: (brand: BrandEntry) => void;
  /** Called when a custom logo is uploaded/photographed. */
  onCustomLogo: (uri: string) => void;
}

function BrandLogoThumbnail({ brand }: { brand: BrandEntry }) {
  const logo = getBrandLogo(brand.slug);
  return (
    <View style={[styles.logoBox, { backgroundColor: brand.primaryColor }]}>
      {logo ? (
        <Image
          source={logo}
          style={styles.logoImage}
          resizeMode="contain"
          accessibilityLabel={brand.alt}
        />
      ) : (
        <Text style={styles.logoFallback}>
          {brand.name.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

export function LogoPicker({
  query,
  onQueryChange,
  onBrandSelect,
  onCustomLogo,
}: LogoPickerProps) {
  const { colors } = useTheme();
  const [results, setResults] = useState<BrandEntry[]>([]);

  const handleSearch = useCallback(
    (text: string) => {
      onQueryChange(text);
      setResults(searchBrands(text));
    },
    [onQueryChange]
  );

  const handlePickImage = useCallback(async () => {
    const uri = await pickCustomLogo();
    if (uri) onCustomLogo(uri);
  }, [onCustomLogo]);

  const handleTakePhoto = useCallback(async () => {
    const uri = await takeCustomLogoPhoto();
    if (uri) onCustomLogo(uri);
  }, [onCustomLogo]);

  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.textSecondary,
          },
        ]}
        placeholder="Store name..."
        placeholderTextColor={colors.textSecondary}
        value={query}
        onChangeText={handleSearch}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.slug}
          keyboardShouldPersistTaps="handled"
          style={[styles.resultsList, { backgroundColor: colors.surface }]}
          renderItem={({ item }) => (
            <Pressable
              style={styles.resultRow}
              onPress={() => onBrandSelect(item)}
            >
              <BrandLogoThumbnail brand={item} />
              <Text style={[typography.label, { color: colors.text }]}>
                {item.name}
              </Text>
            </Pressable>
          )}
        />
      )}

      {query.length > 0 && results.length === 0 && (
        <Text
          style={[
            typography.caption,
            { color: colors.textSecondary, marginTop: 8 },
          ]}
        >
          No match — upload a custom logo below
        </Text>
      )}

      <View style={styles.uploadRow}>
        <Pressable
          style={[styles.uploadButton, { backgroundColor: colors.surface }]}
          onPress={handlePickImage}
        >
          <Text style={[typography.label, { color: colors.text }]}>
            Choose from gallery
          </Text>
        </Pressable>
        <Pressable
          style={[styles.uploadButton, { backgroundColor: colors.surface }]}
          onPress={handleTakePhoto}
        >
          <Text style={[typography.label, { color: colors.text }]}>
            Take photo
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  resultsList: {
    maxHeight: 200,
    borderRadius: 10,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  uploadButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoFallback: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
