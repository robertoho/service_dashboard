import { v4 as uuidv4 } from 'uuid';
import { Link } from '../types/Link';
import { ApiClient } from './ApiClient';

// Endpoints for Link API
const LINKS_ENDPOINT = '/links';
const LINKS_ORDER_ENDPOINT = '/links/order';

// For fallback when server is unavailable
const STORAGE_KEY = 'dashboard_links';
const ORDER_STORAGE_KEY = 'dashboard_links_order';

// Interface for the Links API response
interface LinksResponse {
  links: Link[];
}

// Interface for the Links Order API response
interface OrderResponse {
  order: string[];
}

export const LinkService = {
  /**
   * Get all links from the server
   */
  getLinks: async (): Promise<Link[]> => {
    try {
      // Try to fetch from server
      const response = await ApiClient.get<LinksResponse>(LINKS_ENDPOINT);
      return response.links;
    } catch (error) {
      console.error('Error fetching links from server, using local storage:', error);
      // Fallback to localStorage if server is unavailable
      const links = localStorage.getItem(STORAGE_KEY);
      return links ? JSON.parse(links) : [];
    }
  },

  /**
   * Add a new link to the server
   */
  addLink: async (link: Omit<Link, 'id'>): Promise<Link> => {
    const now = Date.now();
    const newLink: Link = { 
      ...link, 
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };
    
    try {
      // Try to save to server
      const response = await ApiClient.post<Link>(LINKS_ENDPOINT, newLink);
      
      // Also update local storage as fallback
      const links = await LinkService.getLinks();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...links, response]));
      
      // Add the new link to the end of the custom order
      await LinkService.updateLinksOrder(async (order) => {
        order.push(response.id);
        return order;
      });
      
      return response;
    } catch (error) {
      console.error('Error adding link to server, using local storage:', error);
      // Fallback to localStorage if server is unavailable
      const links = localStorage.getItem(STORAGE_KEY);
      const parsedLinks = links ? JSON.parse(links) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...parsedLinks, newLink]));
      
      // Add to local order
      const order = LinkService.getLinksOrderFromLocalStorage();
      order.push(newLink.id);
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
      
      return newLink;
    }
  },

  /**
   * Update an existing link on the server
   */
  updateLink: async (link: Link): Promise<Link> => {
    const updatedLink = {
      ...link,
      updatedAt: Date.now()
    };
    
    try {
      // Try to update on server
      const response = await ApiClient.put<Link>(`${LINKS_ENDPOINT}/${link.id}`, updatedLink);
      
      // Also update local storage as fallback
      const links = await LinkService.getLinks();
      const updatedLinks = links.map(l => l.id === link.id ? response : l);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLinks));
      
      return response;
    } catch (error) {
      console.error('Error updating link on server, using local storage:', error);
      // Fallback to localStorage if server is unavailable
      const links = localStorage.getItem(STORAGE_KEY);
      const parsedLinks = links ? JSON.parse(links) : [];
      const updatedLinks = parsedLinks.map((l: Link) => l.id === link.id ? updatedLink : l);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLinks));
      
      return updatedLink;
    }
  },

  /**
   * Delete a link from the server
   */
  deleteLink: async (id: string): Promise<void> => {
    try {
      // Try to delete from server
      await ApiClient.delete(`${LINKS_ENDPOINT}/${id}`);
      
      // Also update local storage as fallback
      const links = await LinkService.getLinks();
      const filteredLinks = links.filter(link => link.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredLinks));
      
      // Remove from custom order
      await LinkService.updateLinksOrder(async (order) => {
        return order.filter(linkId => linkId !== id);
      });
    } catch (error) {
      console.error('Error deleting link from server, using local storage:', error);
      // Fallback to localStorage if server is unavailable
      const links = localStorage.getItem(STORAGE_KEY);
      const parsedLinks = links ? JSON.parse(links) : [];
      const filteredLinks = parsedLinks.filter((link: Link) => link.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredLinks));
      
      // Remove from local order
      const order = LinkService.getLinksOrderFromLocalStorage();
      const updatedOrder = order.filter(linkId => linkId !== id);
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(updatedOrder));
    }
  },
  
  /**
   * Save the custom order of links to the server
   */
  saveLinksOrder: async (order: string[]): Promise<void> => {
    try {
      // Try to save to server
      await ApiClient.put(LINKS_ORDER_ENDPOINT, { order });
      
      // Also update local storage as fallback
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
    } catch (error) {
      console.error('Error saving links order to server, using local storage:', error);
      // Fallback to localStorage if server is unavailable
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
    }
  },
  
  /**
   * Get the custom order of links from the server
   */
  getLinksOrder: async (): Promise<string[]> => {
    try {
      // Try to fetch from server
      const response = await ApiClient.get<OrderResponse>(LINKS_ORDER_ENDPOINT);
      return response.order;
    } catch (error) {
      console.error('Error fetching links order from server, using local storage:', error);
      // Fallback to localStorage if server is unavailable
      return LinkService.getLinksOrderFromLocalStorage();
    }
  },
  
  /**
   * Helper method to get links order from localStorage
   */
  getLinksOrderFromLocalStorage: (): string[] => {
    const order = localStorage.getItem(ORDER_STORAGE_KEY);
    return order ? JSON.parse(order) : [];
  },
  
  /**
   * Helper method to update links order using a transformer function
   */
  updateLinksOrder: async (transformer: (order: string[]) => Promise<string[]> | string[]): Promise<void> => {
    try {
      // Get current order
      const currentOrder = await LinkService.getLinksOrder();
      
      // Apply transformation
      const newOrder = await transformer(currentOrder);
      
      // Save updated order
      await LinkService.saveLinksOrder(newOrder);
    } catch (error) {
      console.error('Error updating links order:', error);
    }
  }
}; 