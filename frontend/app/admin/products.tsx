import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  Switch,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  promo_price?: number;
  image?: string;
  category_id: string;
  active: boolean;
  featured?: string;
  orders?: number;
  views?: number;
}

interface Category {
  id: string;
  name: string;
}

export default function ProductsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    promo_price: '',
    category_id: '',
    image: '',
    active: true,
    featured: '',
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
        
        const [catRes, prodRes] = await Promise.all([
          fetch(`${API_URL}/api/restaurants/${restId}/categories`),
          fetch(`${API_URL}/api/restaurants/${restId}/products`),
        ]);
        
        const catData = await catRes.json();
        const prodData = await prodRes.json();
        
        setCategories(catData.categories || []);
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

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      promo_price: '',
      category_id: categories[0]?.id || '',
      image: '',
      active: true,
      featured: '',
    });
    setModalVisible(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      promo_price: product.promo_price?.toString() || '',
      category_id: product.category_id,
      image: product.image || '',
      active: product.active,
      featured: product.featured || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.category_id) {
      Alert.alert('Erro', 'Preencha os campos obrigatórios');
      return;
    }

    const productData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      promo_price: formData.promo_price ? parseFloat(formData.promo_price) : null,
      category_id: formData.category_id,
      restaurant_id: restaurantId,
      image: formData.image,
      active: formData.active,
      featured: formData.featured || null,
    };

    try {
      const url = editingProduct
        ? `${API_URL}/api/products/${editingProduct.id}`
        : `${API_URL}/api/products`;
      
      const res = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (res.ok) {
        Alert.alert('Sucesso', editingProduct ? 'Produto atualizado!' : 'Produto criado!');
        setModalVisible(false);
        loadData();
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar produto');
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Excluir Produto',
      `Deseja excluir "${product.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/api/products/${product.id}`, { method: 'DELETE' });
              loadData();
            } catch (error) {
              Alert.alert('Erro', 'Falha ao excluir');
            }
          },
        },
      ]
    );
  };

  const handleDuplicate = async (product: Product) => {
    try {
      await fetch(`${API_URL}/api/products/${product.id}/duplicate`, { method: 'POST' });
      Alert.alert('Sucesso', 'Produto duplicado!');
      loadData();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao duplicar');
    }
  };

  const handleToggle = async (product: Product) => {
    try {
      await fetch(`${API_URL}/api/products/${product.id}/toggle`, { method: 'PATCH' });
      loadData();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao alterar status');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setFormData({ ...formData, image: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Sem categoria';
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || p.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/admin-dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Produtos</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddProduct}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search & Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar produto..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <TouchableOpacity
          style={[styles.filterPill, !filterCategory && styles.filterPillActive]}
          onPress={() => setFilterCategory(null)}
        >
          <Text style={[styles.filterText, !filterCategory && styles.filterTextActive]}>
            Todos ({products.length})
          </Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.filterPill, filterCategory === cat.id && styles.filterPillActive]}
            onPress={() => setFilterCategory(cat.id)}
          >
            <Text style={[styles.filterText, filterCategory === cat.id && styles.filterTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products List */}
      <ScrollView
        style={styles.productsList}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredProducts.map(product => (
          <TouchableOpacity
            key={product.id}
            style={styles.productCard}
            onPress={() => handleEditProduct(product)}
            activeOpacity={0.7}
          >
            <View style={styles.productRow}>
              {product.image ? (
                <Image source={{ uri: product.image }} style={styles.productImage} />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <Ionicons name="image-outline" size={24} color="#D1D5DB" />
                </View>
              )}
              
              <View style={styles.productInfo}>
                <View style={styles.productHeader}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  {product.featured && (
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredText}>
                        {product.featured === 'mais_vendido' ? '🔥' : product.featured === 'novo' ? '✨' : '⭐'}
                      </Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.productCategory}>{getCategoryName(product.category_id)}</Text>
                
                <View style={styles.priceRow}>
                  {product.promo_price ? (
                    <>
                      <Text style={styles.oldPrice}>R$ {product.price.toFixed(2)}</Text>
                      <Text style={styles.promoPrice}>R$ {product.promo_price.toFixed(2)}</Text>
                    </>
                  ) : (
                    <Text style={styles.price}>R$ {product.price.toFixed(2)}</Text>
                  )}
                </View>
                
                {(product.views || product.orders) && (
                  <Text style={styles.statsText}>
                    {product.views || 0} views • {product.orders || 0} vendas
                  </Text>
                )}
              </View>
              
              <View style={styles.productActions}>
                <Switch
                  value={product.active}
                  onValueChange={() => handleToggle(product)}
                  trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
                  thumbColor={product.active ? '#10B981' : '#9CA3AF'}
                />
              </View>
            </View>
            
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditProduct(product)}>
                <Ionicons name="pencil-outline" size={18} color="#6B7280" />
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDuplicate(product)}>
                <Ionicons name="copy-outline" size={18} color="#6B7280" />
                <Text style={styles.actionText}>Duplicar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(product)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={[styles.actionText, { color: '#EF4444' }]}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtn}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveBtn}>Salvar</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Image */}
            <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
              {formData.image ? (
                <Image source={{ uri: formData.image }} style={styles.uploadedImage} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.uploadText}>Adicionar foto</Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* Name */}
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do produto"
              placeholderTextColor="#9CA3AF"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            
            {/* Description */}
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Descrição do produto"
              placeholderTextColor="#9CA3AF"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              textAlignVertical="top"
            />
            
            {/* Category */}
            <Text style={styles.label}>Categoria *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    formData.category_id === cat.id && styles.categoryOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, category_id: cat.id })}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      formData.category_id === cat.id && styles.categoryOptionTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Prices */}
            <View style={styles.priceInputs}>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.label}>Preço *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0,00"
                  placeholderTextColor="#9CA3AF"
                  value={formData.price}
                  onChangeText={(text) => setFormData({ ...formData, price: text })}
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.priceInputWrapper}>
                <Text style={styles.label}>Preço Promo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0,00"
                  placeholderTextColor="#9CA3AF"
                  value={formData.promo_price}
                  onChangeText={(text) => setFormData({ ...formData, promo_price: text })}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            
            {/* Featured */}
            <Text style={styles.label}>Destaque</Text>
            <View style={styles.featuredOptions}>
              {[
                { value: '', label: 'Nenhum' },
                { value: 'mais_vendido', label: '🔥 Mais Vendido' },
                { value: 'recomendado', label: '⭐ Recomendado' },
                { value: 'novo', label: '✨ Novo' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.featuredOption,
                    formData.featured === opt.value && styles.featuredOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, featured: opt.value })}
                >
                  <Text
                    style={[
                      styles.featuredOptionText,
                      formData.featured === opt.value && styles.featuredOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Active */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Produto ativo</Text>
              <Switch
                value={formData.active}
                onValueChange={(value) => setFormData({ ...formData, active: value })}
                trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
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
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addBtn: {
    padding: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#1F2937',
  },
  filtersScroll: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
  },
  filterPillActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  productsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  featuredBadge: {
    marginLeft: 6,
  },
  featuredText: {
    fontSize: 14,
  },
  productCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#10B981',
  },
  oldPrice: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  promoPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  statsText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  productActions: {
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
  cancelBtn: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  imageUpload: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  uploadText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
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
  categoryPicker: {
    marginTop: 4,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryOptionActive: {
    backgroundColor: '#3B82F6',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryOptionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  priceInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInputWrapper: {
    flex: 1,
  },
  featuredOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  featuredOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  featuredOptionActive: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  featuredOptionText: {
    fontSize: 13,
    color: '#6B7280',
  },
  featuredOptionTextActive: {
    color: '#D97706',
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  switchLabel: {
    fontSize: 15,
    color: '#1F2937',
  },
});
