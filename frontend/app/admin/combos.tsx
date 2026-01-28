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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
}

interface Combo {
  id: string;
  name: string;
  description?: string;
  image?: string;
  products: Array<{ product_id: string; quantity: number }>;
  original_price: number;
  combo_price: number;
  discount_percent?: number;
  active: boolean;
}

export default function CombosScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Array<{ product_id: string; quantity: number }>>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    combo_price: '',
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
        
        const [comboRes, prodRes] = await Promise.all([
          fetch(`${API_URL}/api/restaurants/${restId}/combos`),
          fetch(`${API_URL}/api/restaurants/${restId}/products`),
        ]);
        
        const comboData = await comboRes.json();
        const prodData = await prodRes.json();
        
        setCombos(comboData.combos || []);
        setProducts(prodData.products || []);
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
    setEditingCombo(null);
    setSelectedProducts([]);
    setFormData({
      name: '',
      description: '',
      combo_price: '',
      active: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (combo: Combo) => {
    setEditingCombo(combo);
    setSelectedProducts(combo.products || []);
    setFormData({
      name: combo.name,
      description: combo.description || '',
      combo_price: combo.combo_price.toString(),
      active: combo.active,
    });
    setModalVisible(true);
  };

  const toggleProduct = (productId: string) => {
    const existing = selectedProducts.find(p => p.product_id === productId);
    if (existing) {
      setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, { product_id: productId, quantity: 1 }]);
    }
  };

  const getOriginalPrice = () => {
    return selectedProducts.reduce((total, sp) => {
      const product = products.find(p => p.id === sp.product_id);
      return total + (product?.price || 0) * sp.quantity;
    }, 0);
  };

  const getDiscount = () => {
    const original = getOriginalPrice();
    const combo = parseFloat(formData.combo_price) || 0;
    if (original > 0 && combo > 0) {
      return Math.round((1 - combo / original) * 100);
    }
    return 0;
  };

  const handleSave = async () => {
    if (!formData.name || !formData.combo_price || selectedProducts.length < 2) {
      Alert.alert('Erro', 'Preencha o nome, preço e selecione pelo menos 2 produtos');
      return;
    }

    const comboData = {
      name: formData.name,
      description: formData.description,
      restaurant_id: restaurantId,
      products: selectedProducts,
      original_price: getOriginalPrice(),
      combo_price: parseFloat(formData.combo_price),
      active: formData.active,
    };

    try {
      const url = editingCombo
        ? `${API_URL}/api/combos/${editingCombo.id}`
        : `${API_URL}/api/combos`;
      
      const res = await fetch(url, {
        method: editingCombo ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comboData),
      });

      if (res.ok) {
        Alert.alert('Sucesso', editingCombo ? 'Combo atualizado!' : 'Combo criado!');
        setModalVisible(false);
        loadData();
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar');
    }
  };

  const handleDelete = (combo: Combo) => {
    Alert.alert('Excluir', `Excluir "${combo.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await fetch(`${API_URL}/api/combos/${combo.id}`, { method: 'DELETE' });
          loadData();
        },
      },
    ]);
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Produto';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/admin-dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Combos</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#10B981' }]} onPress={handleAdd}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {combos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="layers-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Nenhum combo cadastrado</Text>
            <Text style={styles.emptySubtext}>Combos aumentam o ticket médio!</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleAdd}>
              <Text style={styles.emptyBtnText}>Criar Combo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          combos.map(combo => (
            <TouchableOpacity
              key={combo.id}
              style={styles.card}
              onPress={() => handleEdit(combo)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardName}>{combo.name}</Text>
                  {combo.description && (
                    <Text style={styles.cardDesc} numberOfLines={2}>{combo.description}</Text>
                  )}
                </View>
                {combo.discount_percent && combo.discount_percent > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{combo.discount_percent}% OFF</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.cardProducts}>
                {combo.products?.slice(0, 3).map((cp, idx) => (
                  <Text key={idx} style={styles.productItem}>• {getProductName(cp.product_id)}</Text>
                ))}
                {combo.products?.length > 3 && (
                  <Text style={styles.moreProducts}>+{combo.products.length - 3} mais</Text>
                )}
              </View>
              
              <View style={styles.cardPrices}>
                <Text style={styles.originalPrice}>De R$ {combo.original_price.toFixed(2)}</Text>
                <Text style={styles.comboPrice}>Por R$ {combo.combo_price.toFixed(2)}</Text>
              </View>
              
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(combo)}>
                  <Ionicons name="pencil-outline" size={18} color="#6B7280" />
                  <Text style={styles.actionText}>Editar</Text>
                </TouchableOpacity>
                <View style={styles.statusSwitch}>
                  <Text style={[styles.statusText, { color: combo.active ? '#10B981' : '#9CA3AF' }]}>
                    {combo.active ? 'Ativo' : 'Inativo'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(combo)}>
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
              {editingCombo ? 'Editar Combo' : 'Novo Combo'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveBtn}>Salvar</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Nome do Combo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Combo Família"
              placeholderTextColor="#9CA3AF"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Descrição do combo"
              placeholderTextColor="#9CA3AF"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              textAlignVertical="top"
            />
            
            <Text style={styles.label}>Selecione os Produtos *</Text>
            <Text style={styles.labelHint}>Selecione pelo menos 2 produtos</Text>
            
            <View style={styles.productsGrid}>
              {products.map(product => {
                const isSelected = selectedProducts.some(p => p.product_id === product.id);
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productOption, isSelected && styles.productOptionSelected]}
                    onPress={() => toggleProduct(product.id)}
                  >
                    <View style={styles.checkCircle}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#10B981" />}
                    </View>
                    <Text style={styles.productOptionName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.productOptionPrice}>R$ {product.price.toFixed(2)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {selectedProducts.length > 0 && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Resumo do Combo</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Preço original:</Text>
                  <Text style={styles.summaryValue}>R$ {getOriginalPrice().toFixed(2)}</Text>
                </View>
              </View>
            )}
            
            <Text style={styles.label}>Preço do Combo *</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor="#9CA3AF"
              value={formData.combo_price}
              onChangeText={(text) => setFormData({ ...formData, combo_price: text })}
              keyboardType="decimal-pad"
            />
            
            {getDiscount() > 0 && (
              <View style={styles.discountPreview}>
                <Ionicons name="pricetag" size={18} color="#10B981" />
                <Text style={styles.discountPreviewText}>
                  Cliente economiza {getDiscount()}%
                </Text>
              </View>
            )}
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Combo ativo</Text>
              <Switch
                value={formData.active}
                onValueChange={(value) => setFormData({ ...formData, active: value })}
                trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                thumbColor={formData.active ? '#10B981' : '#9CA3AF'}
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
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  emptyBtn: { marginTop: 16, backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
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
  cardName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  cardDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  discountBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  discountText: { fontSize: 12, fontWeight: 'bold', color: '#059669' },
  cardProducts: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  productItem: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  moreProducts: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  cardPrices: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  originalPrice: { fontSize: 14, color: '#9CA3AF', textDecorationLine: 'line-through' },
  comboPrice: { fontSize: 18, fontWeight: 'bold', color: '#10B981' },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  actionText: { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  statusSwitch: { flex: 1, alignItems: 'center' },
  statusText: { fontSize: 13, fontWeight: '500' },
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
  saveBtn: { fontSize: 16, fontWeight: '600', color: '#10B981' },
  modalContent: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  labelHint: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
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
  productsGrid: { gap: 8 },
  productOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productOptionSelected: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productOptionName: { flex: 1, fontSize: 14, color: '#1F2937' },
  productOptionPrice: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  summaryBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: '#059669', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  discountPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  discountPreviewText: { fontSize: 14, fontWeight: '500', color: '#059669' },
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
