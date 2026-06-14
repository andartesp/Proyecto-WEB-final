'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  stock: number;
  image?: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');

  const [isHovered, setIsHovered] = useState(false);

  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState('user'); // Por defecto usuario normal

  const [userToken, setUserToken] = useState<string | null>(null);
  const [loggedUser, setLoggedUser] = useState<any>(null);

  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdStock, setNewProdStock] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('chineseFury_token');
    const savedUser = localStorage.getItem('chineseFury_user');

    if (savedToken && savedUser) {
      setUserToken(savedToken);
      setLoggedUser(JSON.parse(savedUser));
    }
  }, []);

  const fetchProducts = async (query = '') => {
    try {
      const url = query
        ? `http://localhost:3000/products?query=${encodeURIComponent(query)}`
        : 'http://localhost:3000/products';
      const res = await fetch(url);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(search);
  };

  // Lógica interactiva para añadir al carrito BLINDADA con el stock actual
  const addToCart = (product: Product) => {
    let alcanzadoMaximo = false;

    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem && existingItem.quantity >= product.stock) {
      alcanzadoMaximo = true;
    } else if (product.stock <= 0) {
      alcanzadoMaximo = true;
    }

    if (alcanzadoMaximo) {
      alert(`¡No puedes añadir más unidades de "${product.name}"! Has alcanzado el límite del stock disponible (${product.stock} uds).`);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });

    alert(`¡${product.name} añadido al carrito!`);
  };

  const removeFromCart = (id: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };
  const clearCart = () => {
  setCart([]);
};

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, profile }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('¡Registro completado con éxito! Ya puedes loguearte.');
        setIsRegisterOpen(false);
        setIsLoginOpen(true);
        setPassword('');
      } else {
        alert(`Error: ${data.message || 'No se pudo completar el registro'}`);
      }
    } catch (error) {
      alert('Error al conectar con el backend');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserToken(data.access_token);
        setLoggedUser(data.user);

        localStorage.setItem('chineseFury_token', data.access_token);
        localStorage.setItem('chineseFury_user', JSON.stringify(data.user));

        alert(`¡Bienvenido a ChineseFury! Perfil: ${data.user.profile}`);
        setIsLoginOpen(false);
        setEmail('');
        setPassword('');
      } else {
        alert(`Error: ${data.message || 'Credenciales incorrectas'}`);
      }
    } catch (error) {
      alert('Error al conectar con el backend');
    }
  };

  const handleLogout = () => {
    setUserToken(null);
    setLoggedUser(null);
    setIsAdminPanelOpen(false);

    localStorage.removeItem('chineseFury_token');
    localStorage.removeItem('chineseFury_user');

    alert('Sesión cerrada');
  };

  const handleCheckout = async () => {
    if (!userToken || !loggedUser) {
      alert('¡Tienes que iniciar sesión o registrarte primero para comprar en ChineseFury!');
      setIsCartOpen(false);
      setIsLoginOpen(true);
      return;
    }

    const orderData = {
      userId: loggedUser.id,
      products: cart.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }))
    };

    try {
      const res = await fetch('http://localhost:3000/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(orderData),
      });

      const data = await res.json();

      if (res.ok) {
        alert('¡Pedido realizado con éxito! Tu compra se ha registrado en la base de datos.');
        setCart([]);
        setIsCartOpen(false);
        fetchProducts();
      } else {
        alert(`Error al procesar el pedido: ${data.message || 'Error en el servidor'}`);
      }
    } catch (error) {
      alert('Error al conectar con el backend al tramitar el pedido');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToken) return;

    // Construimos la estructura JSON limpia que espera el backend
    const productData = {
      name: newProdName,
      price: parseFloat(newProdPrice),
      description: newProdDesc,
      stock: parseInt(newProdStock),
      // Si seleccionó archivo, mandamos su nombre apuntando a la carpeta /public. Si no, el gato por defecto
      image: selectedFile ? `/${selectedFile.name}` : '/gatodelasuerte.jpg'
    };

    try {
      const res = await fetch('http://localhost:3000/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(productData)
      });

      if (res.ok) {
        alert('¡Producto añadido con éxito al catálogo de ChineseFury!');
        setNewProdName('');
        setNewProdPrice('');
        setNewProdDesc('');
        setNewProdStock('');
        setSelectedFile(null);
        setPreviewUrl(null);
        fetchProducts();
      } else {
        const data = await res.json();
        alert(`Error al crear producto: ${data.message || 'Fallo de validación'}`);
      }
    } catch (error) {
      alert('Error de conexión con el backend al intentar crear el producto');
    }
  };

  const totalItemsInCart = cart.reduce((total, item) => total + item.quantity, 0);

  const totalPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans flex flex-col">

      <nav className="bg-[#4C9E49] text-white shadow-lg flex justify-between items-center sticky top-0 z-40 h-16">

        <div
          className="flex items-center cursor-pointer h-full select-none pl-2"
          onClick={() => { setSearch(''); fetchProducts(''); }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="w-[70px] h-[64px] flex items-center justify-center overflow-hidden">
            <Image
              src={isHovered ? "/ElchinoCHINCHUNFuegoArdido.png" : "/ElchinoCHINCHUN.png"}
              alt="Logo ChineseFury"
              width={70}
              height={64}
              className="object-cover h-full w-full transition-all duration-200"
              priority
            />
          </div>
          <span className="text-2xl font-black tracking-wider drop-shadow-md ml-3 pr-4">ChineseFury</span>
        </div>

        {/* Buscador intermedio */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full max-w-md mx-6">
          <input
            type="text"
            placeholder="Buscar baratijas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-full text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition shadow-inner"
          />
          <button type="submit" className="bg-[#499E71] hover:bg-[#3d855f] text-white font-bold px-5 py-2 rounded-full text-sm transition shadow">
            Buscar
          </button>
        </form>

        {/* Botones de navegación */}
        <div className="flex items-center gap-6 font-semibold text-sm pr-6">
          <button onClick={() => setIsAboutOpen(true)} className="hover:text-yellow-300 transition">About</button>

          {/* 🛒 Botón Carrito */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative hover:text-yellow-300 transition flex items-center gap-1 bg-[#3d855f] px-3 py-1.5 rounded-full shadow"
          >
            🛒 <span className="bg-yellow-400 text-gray-900 rounded-full text-xs px-2 py-0.5 font-black">{totalItemsInCart}</span>
          </button>

          {!userToken ? (
            <>
              <button onClick={() => setIsLoginOpen(true)} className="bg-[#499E71] hover:bg-[#3d855f] px-4 py-2 rounded-full transition shadow">Login</button>
              <button onClick={() => setIsRegisterOpen(true)} className="border-2 border-white hover:bg-white hover:text-[#4C9E49] px-4 py-1.5 rounded-full transition font-bold">Register</button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              {loggedUser?.profile === 'admin' && (
                <button
                  onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black transition-all shadow ${isAdminPanelOpen
                    ? 'bg-yellow-400 text-gray-900 ring-2 ring-white'
                    : 'bg-gray-800 text-yellow-300 hover:bg-gray-700'
                    }`}
                >
                  {isAdminPanelOpen ? '✕ Cerrar Panel' : '🛠️ Herramientas Admin'}
                </button>
              )}

              <span className="text-yellow-300 font-mono text-xs bg-[#3d855f] px-2 py-1 rounded">
                [{loggedUser?.profile?.toUpperCase()}] {loggedUser?.email}
              </span>
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full text-xs transition">Salir</button>
            </div>
          )}
        </div>
      </nav>

      {/* CATÁLOGO PRINCIPAL */}
      <main className="max-w-6xl mx-auto p-6 flex-grow">
        <header className="bg-[#4C9E49] text-white text-center py-6 rounded-2xl shadow-md mb-8">
          <h2 className="text-3xl font-black tracking-wide">Gran Bazar Online ChineseFury</h2>
          <p className="text-yellow-200 text-sm mt-1">¡Artículos de calidad cuestionable al mejor precio!</p>
        </header>

        {loggedUser?.profile === 'admin' && isAdminPanelOpen && (
          <section className="bg-white p-6 rounded-2xl border-2 border-dashed border-[#4C9E49] shadow-md mb-8">
            <header className="bg-gray-800 text-white p-3 rounded-xl flex items-center justify-between mb-4 shadow">
              <h3 className="text-base font-black tracking-wider">🛠️ PANEL DE ADMINISTRACIÓN — Gestión de Artículos</h3>
              <span className="text-xs font-mono bg-red-500 px-2 py-0.5 rounded text-white animate-pulse">MODO EDITOR</span>
            </header>

            <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600">Nombre del Producto:</label>
                <input
                  type="text"
                  placeholder="Ej. Sarten antiadherente rota"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  required
                  className="border p-2 rounded-xl text-sm bg-gray-50 focus:outline-[#4C9E49]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600">Precio de venta (€):</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej. 14.99"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  required
                  className="border p-2 rounded-xl text-sm bg-gray-50 focus:outline-[#4C9E49]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600">Stock en Almacén:</label>
                <input
                  type="number"
                  placeholder="Ej. 50"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(e.target.value)}
                  required
                  className="border p-2 rounded-xl text-sm bg-gray-50 focus:outline-[#4C9E49]"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold text-gray-600">Descripción del Artículo:</label>
                <input
                  type="text"
                  placeholder="Breve reseña sobre la dudosa procedencia del objeto..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  required
                  className="border p-2 rounded-xl text-sm bg-gray-50 focus:outline-[#4C9E49]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600">Imagen de la carpeta public:</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-3 border rounded-xl text-sm text-center transition truncate"
                >
                  📁 {selectedFile ? selectedFile.name : 'Vincular archivo de public...'}
                </button>
              </div>

              {/* Miniatura previa del archivo local */}
              {previewUrl && (
                <div className="md:col-span-3 flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-dashed border-gray-300 w-fit">
                  <img src={previewUrl} alt="Preview local" className="h-14 w-14 object-cover rounded-lg border bg-white" />
                  <div className="text-xs">
                    <p className="font-bold text-gray-700">Imagen vinculada</p>
                    <p className="text-gray-400 font-mono">Apuntando a: /{selectedFile!.name}</p>
                  </div>
                </div>
              )}

              <div className="md:col-span-3 flex justify-end mt-2">
                <button
                  type="submit"
                  className="bg-gray-900 hover:bg-gray-800 text-white font-black px-6 py-2.5 rounded-xl text-sm transition shadow flex items-center gap-2"
                >
                  ➕ Dar de Alta Producto
                </button>
              </div>
            </form>
          </section>
        )}

        {/* LISTADO DE PRODUCTOS */}
        {products.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl shadow-md text-gray-400 font-medium">
            No hay productos cargados. Añade baratijas en la base de datos para probar el buscador.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="border p-4 rounded-lg shadow-md flex flex-col justify-between bg-white">
                <div className="cursor-pointer group" onClick={() => setSelectedProduct(product)}>
                  <div className="w-full h-48 overflow-hidden mb-2 rounded bg-gray-100 flex items-center justify-center">
                    <img
                      src={
                        product.image && !product.image.includes('placeholder')
                          ? product.image
                          : product.name?.toLowerCase().includes('cepillo')
                            ? '/cepillo.jpg'
                            : product.name?.toLowerCase().includes('altavoz')
                              ? '/altavocesdelchino.jpg'
                              : '/ElchinoCHINCHUN.png'
                      }
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    />
                  </div>
                  <h2 className="text-xl font-bold group-hover:text-[#4C9E49] transition-colors">{product.name}</h2>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
                  <p className="text-lg font-semibold text-blue-600">{product.price} €</p>

                  <p className={`text-sm font-medium mt-1 ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {product.stock > 0 ? `Stock disponible: ${product.stock} uds.` : '❌ Agotado'}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(product);
                  }}
                  disabled={product.stock <= 0}
                  className={`w-full mt-4 py-2 px-4 rounded text-white font-bold transition-colors ${product.stock > 0
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-gray-400 cursor-not-allowed'
                    }`}
                >
                  {product.stock > 0 ? 'Añadir al carrito' : 'Agotado'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-gray-800 text-gray-400 text-center py-6 mt-12 border-t-4 border-[#4C9E49]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium">
          <p>© 2026 ChineseFury S.A. Todos los derechos reservados... o no.</p>
          <p className="font-mono text-yellow-400 bg-gray-900 px-2.5 py-1 rounded border border-gray-750">
            Desarrollado con Furia China por Andrés — Proyecto Final IAW
          </p>
        </div>
      </footer>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>

            <header className="bg-[#4C9E49] text-white text-center py-3 rounded-xl shadow mb-4">
              <h3 className="text-lg font-black tracking-wide">{selectedProduct.name} - Product Information</h3>
            </header>

            <div className="flex flex-col md:flex-row gap-4 items-center">
              <img
                src={
                  selectedProduct.image && !selectedProduct.image.includes('placeholder')
                    ? selectedProduct.image
                    : selectedProduct.name?.toLowerCase().includes('cepillo')
                      ? '/cepillo.jpg'
                      : selectedProduct.name?.toLowerCase().includes('altavoz')
                        ? '/altavocesdelchino.jpg'
                        : '/ElchinoCHINCHUN.png'
                }
                alt={selectedProduct.name}
                className="w-full md:w-1/2 h-48 object-cover rounded-xl border shadow-sm"
              />
              <div className="w-full md:w-1/2 flex flex-col gap-2">
                <h4 className="text-2xl font-black text-gray-900">{selectedProduct.name}</h4>
                <p className="text-xl font-bold text-blue-600">{selectedProduct.price} €</p>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-xl border">
                  {selectedProduct.description}
                </p>
                <p className={`text-xs font-bold ${selectedProduct.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {selectedProduct.stock > 0 ? `📦 Stock de fábrica: ${selectedProduct.stock} unidades` : '❌ Agotado temporalmente'}
                </p>

                <button
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  disabled={selectedProduct.stock <= 0}
                  className={`w-full mt-2 py-2 px-4 rounded text-white font-bold transition-colors ${selectedProduct.stock > 0
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-gray-400 cursor-not-allowed'
                    }`}
                >
                  {selectedProduct.stock > 0 ? '🛒 Añadir al carrito' : 'Agotado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAboutOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl relative">
            <h3 className="text-xl font-black text-[#4C9E49] mb-2">Sobre ChineseFury</h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              <strong>Propietario de la página:</strong> Andrés Artero Espín <br />
              <strong>Eslogan:</strong> "Calidad cuestionable, precios imbatibles" <br />
              <strong>Horario:</strong> Abierto 24/7 (incluso año nuevo chino) <br />
              <strong>Ubicación:</strong> Del polígono industrial directo a tu casa.
            </p>
            <button onClick={() => setIsAboutOpen(false)} className="w-full bg-[#4C9E49] hover:bg-[#499E71] text-white font-bold py-2 rounded-xl transition">
              Entendido
            </button>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-black text-[#4C9E49]">🛒 Tu Carrito</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center p-4">
                <img
                  src="/ChinChunSad.png"
                  alt="Chino ChinChun Triste"
                  className="w-32 h-32 object-contain mx-auto mb-3"
                />
                <p className="text-gray-500 font-medium">
                  Tu carrito está vacío. ¡ChinChun está triste! 😢 ¡Añade algunas baratijas!
                </p>
              </div>
            ) : (
              <>
              <div className="text-center p-2 border-b border-gray-100 mb-3">
  <img 
    src="/ChinChunHappy.png" 
    alt="Chino ChinChun Feliz" 
    className="w-24 h-24 object-contain mx-auto mb-1"
  />
  <p className="text-green-600 font-bold text-sm mb-2">
    ¡ChinChun está feliz con tus baratijas! 😄
  </p>

  
  <button 
    onClick={clearCart}
    className="text-xs bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 font-semibold px-3 py-1.5 rounded-lg transition-colors duration-200"
  >
    🗑️ Vaciar carrito
  </button>
</div>
    

                <div className="space-y-3 max-h-60 overflow-y-auto mb-4 pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200 text-sm">
                      <div>
                        <h4 className="font-bold text-gray-800">{item.name}</h4>
                        <p className="text-xs text-gray-500">{item.price}€ x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-[#4C9E49]">{(item.price * item.quantity).toFixed(2)}€</span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-600 font-bold px-2 py-1 rounded-lg text-xs transition"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-gray-600">Total a pagar:</span>
                  <span className="text-xl font-black text-gray-900">{totalPrice.toFixed(2)}€</span>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full bg-[#4C9E49] hover:bg-[#499E71] text-white font-bold py-2.5 rounded-xl transition shadow"
                >
                  Proceder al Pago
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {isLoginOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black text-[#4C9E49] mb-4">Identificarse</h3>
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border p-2 rounded-xl text-sm focus:outline-[#4C9E49]"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border p-2 rounded-xl text-sm focus:outline-[#4C9E49]"
              />
              <button type="submit" className="bg-[#4C9E49] hover:bg-[#499E71] text-white font-bold py-2 rounded-xl transition mt-2">
                Entrar en la tienda
              </button>
              <button type="button" onClick={() => setIsLoginOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 text-center mt-1">
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      {isRegisterOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black text-[#4C9E49] mb-4">Crear cuenta</h3>
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border p-2 rounded-xl text-sm focus:outline-[#4C9E49]"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border p-2 rounded-xl text-sm focus:outline-[#4C9E49]"
              />

              <label className="text-xs font-bold text-gray-500">Tipo de Perfil:</label>
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                className="border p-2 rounded-xl text-sm bg-gray-50 focus:outline-[#4C9E49]"
              >
                <option value="user">User (Cliente normal)</option>
                <option value="admin">Admin (Gestor de la web)</option>
              </select>

              <button type="submit" className="bg-[#4C9E49] hover:bg-[#499E71] text-white font-bold py-2 rounded-xl transition mt-2">
                Registrarse
              </button>
              <button type="button" onClick={() => setIsRegisterOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 text-center mt-1">
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}