import React, { useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import { Colors } from '../Theme';
import { useTranslation } from 'react-i18next';

export default function WorkOrderArchiveScreen() {
    const { t } = useTranslation();
    const { workOrders, products } = useContext(AppContext);
    const [search, setSearch] = React.useState('');

    const closedWorkOrders = workOrders.filter(wo => {
        const isClosed = wo.status === 'CLOSED';
        if (!isClosed) return false;

        if (search === '') return true;

        const product = products.find(p => p.id === wo.product_id);
        const searchLower = search.toLowerCase();
        const dateStr = wo.closed_at ? new Date(wo.closed_at).toLocaleDateString('tr-TR') : '';

        return (
            (wo.wo_number && wo.wo_number.toLowerCase().includes(searchLower)) ||
            (product?.name && product.name.toLowerCase().includes(searchLower)) ||
            (product?.code && product.code.toLowerCase().includes(searchLower)) ||
            dateStr.includes(searchLower)
        );
    });

    const renderWoItem = ({ item }) => {
        const product = products.find(p => p.id === item.product_id);
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.cardWoNumber}>{item.wo_number || 'No-#'}</Text>
                        <Text style={styles.cardTitle}>{product?.name || 'Bilinmeyen Ürün'}</Text>
                        <Text style={styles.cardSubtitle}>Hedef: {item.target_quantity} | Üretilen: {item.actual_quantity || item.target_quantity}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={[styles.statusText, { color: '#64748B' }]}>KAPALI</Text>
                    </View>
                </View>
                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color="#94A3B8" />
                        <Text style={styles.infoText}>
                            Kapanış: {item.closed_at ? new Date(item.closed_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="hourglass-outline" size={16} color="#94A3B8" />
                        <Text style={styles.infoText}>Toplam Süre: {item.total_duration || 0} dk</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="construct-outline" size={16} color="#94A3B8" />
                        <Text style={styles.infoText}>Proses: {item.processes?.length || 0}</Text>
                    </View>
                    {item.raw_material_id && (
                        <View style={styles.infoRow}>
                            <Ionicons name="cube-outline" size={16} color="#94A3B8" />
                            <Text style={styles.infoText}>
                                Tüketilen Hammadde: {products.find(p => p.id === item.raw_material_id)?.name || 'Bilinmeyen'} ({(item.raw_material_usage * (item.actual_quantity || item.target_quantity)).toFixed(2)} {products.find(p => p.id === item.raw_material_id)?.unit || 'Adet'})
                            </Text>
                        </View>
                    )}
                    {item.notes && (
                        <View style={styles.notesContainer}>
                            <Text style={styles.notesText}>{item.notes}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>İş Emri Arşivi</Text>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="İş emri no, ürün adı veya tarih ara..."
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search !== '' && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={closedWorkOrders}
                renderItem={renderWoItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="archive-outline" size={64} color="#CBD5E1" />
                        <Text style={styles.emptyText}>Arşivlenmiş iş emri bulunamadı.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { padding: 24 },
    title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    cardWoNumber: { fontSize: 11, fontWeight: '800', color: Colors.primary, marginBottom: 4 },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    cardSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 10, fontWeight: '800' },
    cardBody: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, height: 48, marginTop: 16, borderWidth: 1, borderColor: '#E2E8F0' },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1E293B' },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    infoText: { fontSize: 14, color: '#475569', marginLeft: 8 },
    notesContainer: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginTop: 8 },
    notesText: { fontSize: 13, color: '#64748B', fontStyle: 'italic' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, color: '#94A3B8', fontSize: 16 }
});
