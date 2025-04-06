import { 
  ChakraProvider as ChakraUIProvider, 
  extendTheme,
  ThemeConfig
} from '@chakra-ui/react';
import { ReactNode } from 'react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
  colors: {
    brand: {
      50: '#e6f7ff',
      100: '#b3e0ff',
      200: '#80caff',
      300: '#4db3ff',
      400: '#1a9cff',
      500: '#0080ff',
      600: '#0066cc',
      700: '#004d99',
      800: '#003366',
      900: '#001a33',
    },
  },
});

interface ChakraProviderProps {
  children: ReactNode;
}

export const ChakraProvider = ({ children }: ChakraProviderProps) => {
  return (
    <ChakraUIProvider theme={theme}>
      {children}
    </ChakraUIProvider>
  );
}; 