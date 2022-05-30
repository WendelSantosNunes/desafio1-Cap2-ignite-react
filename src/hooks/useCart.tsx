import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
      prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
        localStorage.setItem('@RocketShoes:cart',JSON.stringify(cart))
    }
  }, [cart]);

  const addProduct = async (productId: number) => {
    let newCart = [...cart]

    try {
      let stockAmount = await api.get(`stock/${productId}`).then(response => response.data.amount)
      let currentAmount = newCart.find(product => productId === product.id)?.amount || 0
      
      if(stockAmount > currentAmount){
        if(currentAmount){
          for (let product of newCart) {
            if(product.id === productId){
              product.amount += 1
            }
           }
        }else{
          const product = await api.get(`products/${productId}`).then(response => (response.data));

          newCart.push({...product, amount: 1})
        }
        setCart(newCart)

      }else{
        toast.error('Quantidade solicitada fora de estoque');
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let newCart = [...cart]
      const productExist = newCart.find(item => item.id === productId)

      if(productExist !== undefined){
        newCart = newCart.filter(item => productId !== item.id)
        console.log(newCart)
        setCart(newCart)
      }else{
          throw new Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    let newCart = [...cart]
    try {

      let stockAmount = await api.get(`stock/${productId}`).then(response => response.data)
      // console.log(amount, 'oi')

      if(amount >= 1 && stockAmount.amount >= amount ){
        for (let product of newCart) {
          if(product.id === productId){
            product.amount = amount
            setCart(newCart)
          }
         }
      }else{
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
