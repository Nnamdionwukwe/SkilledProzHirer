// src/components/LanguagePicker.jsx
// Drop anywhere in settings screen

import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useAppLocale } from '../i18n/useAppLocale';

export default function LanguagePicker() {
  const { currentLocale, changeLocale, locales } = useAppLocale();

  return (
    <FlatList
      data={locales}
      keyExtractor={(item) => item.code}
      renderItem={({ item }) => {
        const active = item.code === currentLocale.code;
        return (
          <TouchableOpacity
            style={[styles.item, active && styles.itemActive]}
            onPress={() => changeLocale(item.code)}
          >
            <Text style={[styles.name, active && styles.nameActive]}>
              {item.nativeName}
            </Text>
            <Text style={styles.sub}>{item.name}</Text>
            {active && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  item:       { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderColor: '#222' },
  itemActive: { backgroundColor: 'rgba(249,115,22,0.1)' },
  name:       { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff' },
  nameActive: { color: '#f97316' },
  sub:        { fontSize: 12, color: '#888', marginRight: 8 },
  check:      { color: '#f97316', fontWeight: '800' },
});
