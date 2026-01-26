import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category_id: string;
  active: boolean;
  badges: string[];
}

interface Category {
  id: string;
  name: string;
}

export default function ProductsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const restaurantsRes = await fetch(`${API_URL}/api/restaurants`);
      const restaurantsData = await restaurantsRes.json();
      
      if (restaurantsData.restaurants && restaurantsData.restaurants.length > 0) {
        const restId = restaurantsData.restaurants[0].id;
        setRestaurantId(restId);

        const categoriesRes = await fetch(`${API_URL}/api/restaurants/${restId}/categories`);
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories || []);

        const productsRes = await fetch(`${API_URL}/api/restaurants/${restId}/products`);
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !description.trim() || !price.trim() || !categoryId) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    const priceNum = parseFloat(price.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Erro', 'Preço inválido');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        category_id: categoryId,
        restaurant_id: restaurantId,
        image: image,
        badges: [],
        active: true,
        order: products.length + 1,
      };

      if (editingId) {
        // Update
        const res = await fetch(`${API_URL}/api/products/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.success) {
          Alert.alert('Sucesso', 'Produto atualizado!');
        }
      } else {
        // Create
        const res = await fetch(`${API_URL}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.success) {
          Alert.alert('Sucesso', 'Produto criado!');
        }
      }
      resetForm();
      loadData();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar produto');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setCategoryId('');
    setImage(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description);
    setPrice(product.price.toString());
    setCategoryId(product.category_id);
    setImage(product.image || null);
    setShowForm(true);
  };

  const handleToggle = async (productId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}/toggle`, {
        method: 'PATCH',
      });
      const result = await res.json();
      if (result.success) {
        loadData();
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao alternar status');
      console.error(error);
    }
  };

  const handleDelete = (productId: string, productName: string) => {
    Alert.alert(
      'Confirmar',
      `Deseja deletar o produto "${productName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/products/${productId}`, {
                method: 'DELETE',
              });
              const result = await res.json();
              if (result.success) {
                Alert.alert('Sucesso', 'Produto deletado!');
                loadData();
              }
            } catch (error) {
              Alert.alert('Erro', 'Falha ao deletar produto');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f5f5f5' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Produtos</Text>
          <TouchableOpacity
            onPress={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
            style={styles.addButton}
          >
            <Ionicons name={showForm ? 'close' : 'add'} size={24} color="#FF6B35" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {showForm && (
            <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
              <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>
                {editingId ? 'Editar Produto' : 'Novo Produto'}
              </Text>
              
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#000' : '#f9f9f9', color: isDark ? '#fff' : '#000' }]}
                placeholder="Nome do produto"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={name}
                onChangeText={setName}
              />
              
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: isDark ? '#000' : '#f9f9f9', color: isDark ? '#fff' : '#000' }]}
                placeholder="Descrição"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
              
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#000' : '#f9f9f9', color: isDark ? '#fff' : '#000' }]}
                placeholder="Preço (ex: 45.90)"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />

              <View style={styles.pickerContainer}>
                <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>Categoria:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryOption,
                        categoryId === cat.id && styles.categoryOptionSelected,
                        { backgroundColor: categoryId === cat.id ? '#FF6B35' : (isDark ? '#000' : '#f9f9f9') }
                      ]}
                      onPress={() => setCategoryId(cat.id)}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        { color: categoryId === cat.id ? '#fff' : (isDark ? '#fff' : '#000') }
                      ]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Ionicons name="image" size={24} color="#FF6B35" />
                <Text style={styles.imageButtonText}>
                  {image ? 'Trocar Imagem' : 'Adicionar Imagem'}
                </Text>
              </TouchableOpacity>

              {image && (
                <Image source={{ uri: image }} style={styles.imagePreview} />
              )}
              
              <TouchableOpacity
                style={[styles.primaryButton, { opacity: saving ? 0.5 : 1 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {editingId ? 'Atualizar' : 'Criar Produto'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>
              Produtos Cadastrados ({products.length})
            </Text>

            {products.length === 0 ? (
              <Text style={[styles.emptyText, { color: isDark ? '#aaa' : '#666' }]}>
                Nenhum produto cadastrado
              </Text>
            ) : (
              products.map((product) => (
                <View key={product.id} style={styles.productItem}>
                  <View style={styles.productInfo}>
                    {product.image && (
                      <Image source={{ uri: product.image }} style={styles.productThumb} />
                    )}
                    <View style={styles.productDetails}>
                      <Text style={[styles.productName, { color: isDark ? '#fff' : '#000' }]}>
                        {product.name}
                      </Text>
                      <Text style={[styles.productPrice, { color: '#FF6B35' }]}>
                        R$ {product.price.toFixed(2)}
                      </Text>
                      <Text style={[styles.productStatus, { color: product.active ? '#4CAF50' : '#999' }]}>
                        {product.active ? 'Ativo' : 'Inativo'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.productActions}>
                    <TouchableOpacity onPress={() => handleToggle(product.id)} style={styles.actionButton}>
                      <Ionicons name={product.active ? 'eye-off' : 'eye'} size={20} color="#2196F3" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleEdit(product)} style={styles.actionButton}>
                      <Ionicons name="pencil" size={20} color="#4CAF50" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(product.id, product.name)} style={styles.actionButton}>
                      <Ionicons name="trash" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryPicker: {
    flexDirection: 'row',
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryOptionSelected: {
    borderColor: '#FF6B35',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 12,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  imageButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#FF6B35',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  productThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productStatus: {
    fontSize: 12,
  },
  productActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
});
