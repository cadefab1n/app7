import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Promotion {
  id: string;
  name: string;
  type: string;
  discount_type: string;
  discount_value: number;
  coupon_code?: string;
  start_time?: string;
  end_time?: string;
  active: boolean;
  usage_count?: number;
}

export default function PromotionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'coupon',
    discount_type: 'percent',
    discount_value: '',
    coupon_code: '',
    start_time: '',
    end_time: '',
    active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/restaurants`);
      const data = await res.json();
      
      if (data.restaurants?.length > 0) {
        const restId = data.restaurants[0].id;
        setRestaurantId(restId);
        
        const promoRes = await fetch(`${API_URL}/api/restaurants/${restId}/promotions`);
        const promoData = await promoRes.json();
        setPromotions(promoData.promotions || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleAdd = () => {
    setEditingPromo(null);
    setFormData({
      name: '',
      type: 'coupon',
      discount_type: 'percent',
      discount_value: '',
      coupon_code: '',
      start_time: '',
      end_time: '',
      active: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setFormData({
      name: promo.name,
      type: promo.type,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value.toString(),
      coupon_code: promo.coupon_code || '',
      start_time: promo.start_time || '',
      end_time: promo.end_time || '',
      active: promo.active,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.discount_value) {
      Alert.alert('Erro', 'Preencha os campos obrigatórios');
      return;
    }

    const promoData = {
      name: formData.name,
      restaurant_id: restaurantId,
      type: formData.type,
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      coupon_code: formData.coupon_code || null,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      active: formData.active,
    };

    try {
      const url = editingPromo
        ? `${API_URL}/api/promotions/${editingPromo.id}`
        : `${API_URL}/api/promotions`;
      
      const res = await fetch(url, {
        method: editingPromo ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promoData),
      });

      if (res.ok) {
        Alert.alert('Sucesso', editingPromo ? 'Promoção atualizada!' : 'Promoção criada!');
        setModalVisible(false);
        loadData();
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar');
    }
  };

  const handleDelete = (promo: Promotion) => {
    Alert.alert('Excluir', `Excluir "${promo.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await fetch(`${API_URL}/api/promotions/${promo.id}`, { method: 'DELETE' });
          loadData();
        },
      },
    ]);
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      coupon: '🎟️ Cupom',
      happy_hour: '🍺 Happy Hour',
      flash_sale: '⚡ Oferta Relâmpago',
      link_coupon: '🔗 Cupom por Link',
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/admin-dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Promoções</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#F59E0B' }]} onPress={handleAdd}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {promotions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Nenhuma promoção cadastrada</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleAdd}>
              <Text style={styles.emptyBtnText}>Criar Promoção</Text>
            </TouchableOpacity>
          </View>
        ) : (
          promotions.map(promo => (
            <TouchableOpacity
              key={promo.id}
              style={styles.card}
              onPress={() => handleEdit(promo)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardType}>{getTypeLabel(promo.type)}</Text>
                  <Text style={styles.cardName}>{promo.name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: promo.active ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Text style={[styles.statusText, { color: promo.active ? '#059669' : '#DC2626' }]}>
                    {promo.active ? 'Ativa' : 'Inativa'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.cardBody}>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>
                    {promo.discount_type === 'percent' 
                      ? `${promo.discount_value}% OFF`
                      : `R$ ${promo.discount_value} OFF`
                    }
                  </Text>
                </View>
                
                {promo.coupon_code && (
                  <View style={styles.couponBadge}>
                    <Text style={styles.couponText}>Código: {promo.coupon_code}</Text>
                  </View>
                )}
                
                {promo.start_time && promo.end_time && (
                  <Text style={styles.timeText}>⏰ {promo.start_time} - {promo.end_time}</Text>
                )}
              </View>
              
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(promo)}>
                  <Ionicons name="pencil-outline" size={18} color="#6B7280" />
                  <Text style={styles.actionText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(promo)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text style={[styles.actionText, { color: '#EF4444' }]}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtn}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingPromo ? 'Editar Promoção' : 'Nova Promoção'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveBtn}>Salvar</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Nome da Promoção *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Desconto de Inauguração"
              placeholderTextColor="#9CA3AF"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.typeOptions}>
              {[
                { value: 'coupon', label: '🎟️ Cupom' },
                { value: 'happy_hour', label: '🍺 Happy Hour' },
                { value: 'flash_sale', label: '⚡ Relâmpago' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.typeOption, formData.type === opt.value && styles.typeOptionActive]}
                  onPress={() => setFormData({ ...formData, type: opt.value })}
                >
                  <Text style={[styles.typeOptionText, formData.type === opt.value && styles.typeOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.label}>Tipo de Desconto</Text>
            <View style={styles.typeOptions}>
              <TouchableOpacity
                style={[styles.typeOption, formData.discount_type === 'percent' && styles.typeOptionActive]}
                onPress={() => setFormData({ ...formData, discount_type: 'percent' })}
              >
                <Text style={[styles.typeOptionText, formData.discount_type === 'percent' && styles.typeOptionTextActive]}>
                  % Porcentagem
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, formData.discount_type === 'fixed' && styles.typeOptionActive]}
                onPress={() => setFormData({ ...formData, discount_type: 'fixed' })}
              >
                <Text style={[styles.typeOptionText, formData.discount_type === 'fixed' && styles.typeOptionTextActive]}>
                  R$ Valor Fixo
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Valor do Desconto *</Text>
            <TextInput
              style={styles.input}
              placeholder={formData.discount_type === 'percent' ? 'Ex: 10' : 'Ex: 5.00'}
              placeholderTextColor="#9CA3AF"
              value={formData.discount_value}
              onChangeText={(text) => setFormData({ ...formData, discount_value: text })}
              keyboardType="decimal-pad"
            />
            
            {formData.type === 'coupon' && (
              <>
                <Text style={styles.label}>Código do Cupom</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: PROMO10"
                  placeholderTextColor="#9CA3AF"
                  value={formData.coupon_code}
                  onChangeText={(text) => setFormData({ ...formData, coupon_code: text.toUpperCase() })}
                  autoCapitalize="characters"
                />
              </>
            )}
            
            {formData.type === 'happy_hour' && (
              <View style={styles.timeInputs}>
                <View style={styles.timeInputWrapper}>
                  <Text style={styles.label}>Início</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="18:00"
                    placeholderTextColor="#9CA3AF"
                    value={formData.start_time}
                    onChangeText={(text) => setFormData({ ...formData, start_time: text })}
                  />
                </View>
                <View style={styles.timeInputWrapper}>
                  <Text style={styles.label}>Fim</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="20:00"
                    placeholderTextColor="#9CA3AF"
                    value={formData.end_time}
                    onChangeText={(text) => setFormData({ ...formData, end_time: text })}
                  />
                </View>
              </View>
            )}
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Promoção ativa</Text>
              <Switch
                value={formData.active}
                onValueChange={(value) => setFormData({ ...formData, active: value })}
                trackColor={{ false: '#E5E7EB', true: '#FDE68A' }}
                thumbColor={formData.active ? '#F59E0B' : '#9CA3AF'}
              />
            </View>
            
            <View style={{ height: 50 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  addBtn: { padding: 8, borderRadius: 8 },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
  emptyBtn: { marginTop: 16, backgroundColor: '#F59E0B', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardType: { fontSize: 12, color: '#6B7280' },
  cardName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '500' },
  cardBody: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  discountBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  discountText: { fontSize: 14, fontWeight: 'bold', color: '#D97706' },
  couponBadge: { backgroundColor: '#E0E7FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  couponText: { fontSize: 13, color: '#4338CA', fontWeight: '500' },
  timeText: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  actionText: { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelBtn: { fontSize: 16, color: '#6B7280' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#1F2937' },
  saveBtn: { fontSize: 16, fontWeight: '600', color: '#F59E0B' },
  modalContent: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  typeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  typeOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F3F4F6' },
  typeOptionActive: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B' },
  typeOptionText: { fontSize: 14, color: '#6B7280' },
  typeOptionTextActive: { color: '#D97706', fontWeight: '500' },
  timeInputs: { flexDirection: 'row', gap: 12 },
  timeInputWrapper: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  switchLabel: { fontSize: 15, color: '#1F2937' },
});
