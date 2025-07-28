// app/index.tsx
import { useEffect, useState } from 'react';
import Loader from './components/Loader';
import Login from './components/Login';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return isLoading ? <Loader /> : <Login />;
}
