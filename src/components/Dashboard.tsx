import { useState, useEffect, useRef } from 'react';
import '../styles/Dashboard.css';
import { Link } from '../types/Link';
import { LinkService } from '../services/LinkService';
import { AuthService, AuthSettings } from '../services/AuthService';
import { DashboardSettingsService, DashboardSettings, defaultSettings } from '../services/DashboardSettingsService';
import { Login } from './Login';

// View mode types
type ViewMode = 'grid' | 'list' | 'detailed';
type SortOption = 'custom' | 'name' | 'created' | 'updated';

export const Dashboard = () => {
  const [links, setLinks] = useState<Link[]>([]);
  const [editingLink, setEditingLink] = useState<Link | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('custom');
  const [draggedLink, setDraggedLink] = useState<Link | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<DashboardSettings>(defaultSettings);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthSettingsOpen, setIsAuthSettingsOpen] = useState(false);
  const [authSettings, setAuthSettings] = useState<AuthSettings>({ 
    isEnabled: false, 
    username: '', 
    password: '' 
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  // Initialize all data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsInitializing(true);
        setServerError(null);
        
        // Initialize auth settings
        await AuthService.initialize();
        
        // Check authentication status
        const isAuthd = await AuthService.isAuthenticated();
        setIsAuthenticated(isAuthd);
        
        // Load auth settings
        const authConfig = await AuthService.getAuthSettings();
        setAuthSettings(authConfig);
        
        // Only load other data if authenticated or auth is disabled
        if (isAuthd || !authConfig.isEnabled) {
          // Load dashboard settings
          const dashboardConfig = await DashboardSettingsService.initialize();
          setSettings(dashboardConfig);
          
          // Apply theme colors
          document.documentElement.style.setProperty('--primary-color', dashboardConfig.primaryColor);
          document.documentElement.style.setProperty('--background-color', dashboardConfig.backgroundColor);
          
          // Load links data
          const storedLinks = await LinkService.getLinks();
          setLinks(storedLinks);
          
          // Load view preferences from localStorage
          const savedViewMode = localStorage.getItem('dashboard_view_mode') as ViewMode | null;
          const savedSortOption = localStorage.getItem('dashboard_sort_option') as SortOption | null;
          
          if (savedViewMode) setViewMode(savedViewMode);
          if (savedSortOption) setSortOption(savedSortOption);
        }
      } catch (error) {
        console.error('Error initializing application:', error);
        setServerError('Failed to connect to server. Using offline mode.');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeApp();
  }, []);

  // Save view/sort preferences
  useEffect(() => {
    try {
      localStorage.setItem('dashboard_view_mode', viewMode);
    } catch (error) {
      console.error('Error saving view mode:', error);
    }
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem('dashboard_sort_option', sortOption);
    } catch (error) {
      console.error('Error saving sort option:', error);
    }
  }, [sortOption]);

  // Handle paste events
  useEffect(() => {
    if (isModalOpen && imageContainerRef.current) {
      document.addEventListener('paste', handlePaste);
    }
    
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isModalOpen]);

  // When editing a link, initialize the pastedImage
  useEffect(() => {
    if (editingLink && editingLink.imageUrl) {
      setPastedImage(editingLink.imageUrl);
    } else {
      setPastedImage(null);
    }
  }, [editingLink]);

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (!blob) continue;

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setPastedImage(dataUrl);
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  };

  const handleImageClick = () => {
    showToast('Paste an image from your clipboard (Ctrl+V)');
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPastedImage(null);
  };

  const handleAddLink = () => {
    setEditingLink(undefined);
    setPastedImage(null);
    setIsModalOpen(true);
  };

  const handleEditLink = (link: Link) => {
    setEditingLink(link);
    setIsModalOpen(true);
  };

  const handleDeleteLink = async (id: string) => {
    try {
      await LinkService.deleteLink(id);
      setLinks(prevLinks => prevLinks.filter(link => link.id !== id));
      showToast('Link deleted successfully');
    } catch (error) {
      console.error('Error deleting link:', error);
      showToast('Error deleting link', true);
    }
  };

  const handleSaveLink = async (linkData: Omit<Link, 'id'> & { id?: string }) => {
    try {
      setIsLoading(true);
      
      // Use the pasted image if available
      const dataToSave = {
        ...linkData,
        imageUrl: pastedImage || undefined
      };
      
      if (linkData.id) {
        // Update existing link
        showToast('Updating link...');
        const updatedLink = await LinkService.updateLink(dataToSave as Link);
        setLinks(prevLinks => 
          prevLinks.map(link => link.id === updatedLink.id ? updatedLink : link)
        );
        showToast('Link updated successfully');
      } else {
        // Add new link
        showToast('Adding link...');
        const newLink = await LinkService.addLink(dataToSave);
        setLinks(prevLinks => [...prevLinks, newLink]);
        showToast('Link added successfully');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving link:', error);
      showToast('Error saving link', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (newSettings: DashboardSettings) => {
    try {
      // Save to server
      await DashboardSettingsService.saveSettings(newSettings);
      
      // Update state
      setSettings(newSettings);
      setIsSettingsOpen(false);
      
      // Apply theme colors
      document.documentElement.style.setProperty('--primary-color', newSettings.primaryColor);
      document.documentElement.style.setProperty('--background-color', newSettings.backgroundColor);
      
      showToast('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Error saving settings', true);
    }
  };

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const success = await AuthService.login(username, password);
      if (success) {
        setIsAuthenticated(true);
        
        // After successful login, initialize dashboard data
        const dashboardConfig = await DashboardSettingsService.initialize();
        setSettings(dashboardConfig);
        
        // Apply theme colors
        document.documentElement.style.setProperty('--primary-color', dashboardConfig.primaryColor);
        document.documentElement.style.setProperty('--background-color', dashboardConfig.backgroundColor);
        
        // Load links data
        const storedLinks = await LinkService.getLinks();
        setLinks(storedLinks);
      }
      return success;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Error during logout', true);
    }
  };

  const handleSaveAuthSettings = async (newSettings: AuthSettings) => {
    try {
      await AuthService.saveAuthSettings(newSettings);
      setAuthSettings(newSettings);
      setIsAuthSettingsOpen(false);
      showToast('Authentication settings saved successfully');
    } catch (error) {
      console.error('Error saving auth settings:', error);
      showToast('Error saving authentication settings', true);
    }
  };

  const handleChangeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleChangeSortOption = async (option: SortOption) => {
    setSortOption(option);
    
    // If changing to custom, save the current order
    if (option === 'custom') {
      try {
        await LinkService.saveLinksOrder(links.map(link => link.id));
      } catch (error) {
        console.error('Error saving links order:', error);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, link: Link) => {
    setDraggedLink(link);
    e.dataTransfer.effectAllowed = 'move';
    
    // Make the drag image transparent
    const dragImg = document.createElement('div');
    dragImg.style.position = 'absolute';
    dragImg.style.top = '-9999px';
    document.body.appendChild(dragImg);
    e.dataTransfer.setDragImage(dragImg, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, overLink: Link) => {
    e.preventDefault();
    
    if (!draggedLink || draggedLink.id === overLink.id) return;
    
    // Reorder the links
    const draggedIndex = links.findIndex(link => link.id === draggedLink.id);
    const overIndex = links.findIndex(link => link.id === overLink.id);
    
    if (draggedIndex === -1 || overIndex === -1) return;
    
    const newLinks = [...links];
    newLinks.splice(draggedIndex, 1);
    newLinks.splice(overIndex, 0, draggedLink);
    
    setLinks(newLinks);
  };

  const handleDragEnd = async () => {
    if (draggedLink && sortOption === 'custom') {
      try {
        // Save the new custom order
        await LinkService.saveLinksOrder(links.map(link => link.id));
      } catch (error) {
        console.error('Error saving links order after drag:', error);
      }
    }
    setDraggedLink(null);
  };

  const showToast = (message: string, isError = false) => {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    }, 100);
  };

  // Sort links based on the current sort option
  const sortLinks = async (links: Link[]): Promise<Link[]> => {
    if (sortOption === 'custom') {
      try {
        // Use the order stored on the server
        const order = await LinkService.getLinksOrder();
        
        return [...links].sort((a, b) => {
          const aIndex = order.indexOf(a.id);
          const bIndex = order.indexOf(b.id);
          
          // If a link is not in the order, put it at the end
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          
          return aIndex - bIndex;
        });
      } catch (error) {
        console.error('Error getting links order:', error);
        return links;
      }
    } else if (sortOption === 'name') {
      return [...links].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'created') {
      return [...links].sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortOption === 'updated') {
      return [...links].sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return links;
  };

  // Memoized sorted links
  const [sortedLinks, setSortedLinks] = useState<Link[]>([]);
  
  // Update sorted links when links or sort option changes
  useEffect(() => {
    const updateSortedLinks = async () => {
      const filteredLinks = links.filter(link => 
        link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      const sorted = await sortLinks(filteredLinks);
      setSortedLinks(sorted);
    };
    
    updateSortedLinks();
  }, [links, sortOption, searchQuery]);

  // Helper to determine if we should show a fallback for the image
  const shouldShowFallback = (link: Link) => {
    return !link.imageUrl || imageLoadErrors[link.id];
  };

  // Render loading state
  if (isInitializing) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Show server error if any
  if (serverError) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h2>Connection Error</h2>
        <p>{serverError}</p>
        <p>The application will continue to work in offline mode.</p>
      </div>
    );
  }

  // If not authenticated and auth is enabled, show login screen
  if (!isAuthenticated && authSettings.isEnabled) {
    return <Login onLogin={handleLogin} />;
  }

  // Render the appropriate content based on viewMode
  const renderLinkContent = () => {
    if (sortedLinks.length === 0) {
      return (
        <div className="empty-state">
          <p>
            {searchQuery 
              ? 'No services found matching your search.' 
              : 'No services added yet. Click "Add New Service" to get started.'}
          </p>
        </div>
      );
    }

    switch (viewMode) {
      case 'grid':
        return (
          <div className="links-grid">
            {sortedLinks.map(link => (
              <div 
                key={link.id} 
                className="link-card"
                draggable={sortOption === 'custom'}
                onDragStart={(e) => handleDragStart(e, link)}
                onDragOver={(e) => handleDragOver(e, link)}
                onDragEnd={handleDragEnd}
              >
                <div className="link-image">
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {!shouldShowFallback(link) ? (
                      <img 
                        src={link.imageUrl} 
                        alt={link.name} 
                        onError={() => {
                          setImageLoadErrors(prev => ({
                            ...prev,
                            [link.id]: true
                          }));
                        }}
                      />
                    ) : (
                      <div className="link-image-fallback">
                        {link.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </a>
                </div>
                <h3>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.name}
                  </a>
                </h3>
                <p className="link-url">{link.url}</p>
                <p className="link-description">{link.description}</p>
                <div className="link-actions">
                  <button 
                    className="edit-button" 
                    onClick={() => handleEditLink(link)}
                  >
                    ✏️
                  </button>
                  <button 
                    className="delete-button" 
                    onClick={() => handleDeleteLink(link.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'list':
        return (
          <div className="links-list">
            {sortedLinks.map(link => (
              <div 
                key={link.id} 
                className="link-list-item"
                draggable={sortOption === 'custom'}
                onDragStart={(e) => handleDragStart(e, link)}
                onDragOver={(e) => handleDragOver(e, link)}
                onDragEnd={handleDragEnd}
              >
                <div className="link-list-image">
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {!shouldShowFallback(link) ? (
                      <img 
                        src={link.imageUrl} 
                        alt={link.name} 
                        onError={() => {
                          setImageLoadErrors(prev => ({
                            ...prev,
                            [link.id]: true
                          }));
                        }}
                      />
                    ) : (
                      <div className="link-image-fallback small">
                        {link.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </a>
                </div>
                <div className="link-list-content">
                  <h3>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      {link.name}
                    </a>
                  </h3>
                  <p className="link-list-url">{link.url}</p>
                  <p className="link-list-description">{link.description}</p>
                  <div className="link-list-meta">
                    <span>Created: {new Date(link.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(link.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="link-list-actions">
                  <button 
                    className="edit-button" 
                    onClick={() => handleEditLink(link)}
                  >
                    ✏️
                  </button>
                  <button 
                    className="delete-button" 
                    onClick={() => handleDeleteLink(link.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'detailed':
        return (
          <div className="links-detailed">
            <table className="links-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>URL</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedLinks.map(link => (
                  <tr 
                    key={link.id}
                    className="links-table-row"
                    draggable={sortOption === 'custom'}
                    onDragStart={(e) => handleDragStart(e, link)}
                    onDragOver={(e) => handleDragOver(e, link)}
                    onDragEnd={handleDragEnd}
                  >
                    <td className="links-table-image">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {!shouldShowFallback(link) ? (
                          <img 
                            src={link.imageUrl} 
                            alt={link.name} 
                            onError={() => {
                              setImageLoadErrors(prev => ({
                                ...prev,
                                [link.id]: true
                              }));
                            }}
                          />
                        ) : (
                          <div className="link-image-fallback small">
                            {link.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </a>
                    </td>
                    <td className="links-table-name">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.name}
                      </a>
                    </td>
                    <td className="links-table-url">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.url}
                      </a>
                    </td>
                    <td className="links-table-description">{link.description}</td>
                    <td className="links-table-date">
                      {new Date(link.createdAt).toLocaleDateString()}
                    </td>
                    <td className="links-table-date">
                      {new Date(link.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="links-table-actions">
                      <button 
                        className="edit-button" 
                        onClick={() => handleEditLink(link)}
                      >
                        ✏️
                      </button>
                      <button 
                        className="delete-button" 
                        onClick={() => handleDeleteLink(link.id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="dashboard" style={{ backgroundColor: settings.backgroundColor }}>
      <div className="dashboard-header">
        <div className="title-settings-wrapper">
          <h1 style={{ color: settings.primaryColor }}>{settings.title}</h1>
          <div className="header-buttons">
            <button 
              className="settings-button" 
              onClick={() => setIsSettingsOpen(true)}
              title="Dashboard Settings"
            >
              ⚙️
            </button>
            <button 
              className="settings-button" 
              onClick={() => setIsAuthSettingsOpen(true)}
              title="Authentication Settings"
            >
              🔒
            </button>
            {authSettings.isEnabled && (
              <button 
                className="settings-button" 
                onClick={handleLogout}
                title="Logout"
              >
                🚪
              </button>
            )}
          </div>
        </div>
        <p>{settings.subtitle}</p>
      </div>

      <div className="dashboard-controls">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="view-controls">
          <div className="sort-options">
            <select 
              value={sortOption} 
              onChange={(e) => handleChangeSortOption(e.target.value as SortOption)}
              className="sort-select"
            >
              <option value="custom">Custom Order</option>
              <option value="name">Name</option>
              <option value="created">Newest First</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>
          <div className="view-buttons">
            <button 
              className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => handleChangeViewMode('grid')}
              title="Grid View"
            >
              🔲
            </button>
            <button 
              className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => handleChangeViewMode('list')}
              title="List View"
            >
              📃
            </button>
            <button 
              className={`view-button ${viewMode === 'detailed' ? 'active' : ''}`}
              onClick={() => handleChangeViewMode('detailed')}
              title="Detailed View"
            >
              📊
            </button>
          </div>
        </div>
        <button 
          className="add-button" 
          onClick={handleAddLink}
          style={{ backgroundColor: settings.primaryColor }}
        >
          Add New Service
        </button>
      </div>

      {renderLinkContent()}

      {/* Link Form Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingLink ? 'Edit Link' : 'Add New Link'}</h2>
              <button 
                className="close-button" 
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
              >
                ×
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newLink = {
                id: editingLink?.id,
                name: formData.get('name') as string,
                url: formData.get('url') as string,
                description: formData.get('description') as string,
                createdAt: editingLink?.createdAt || Date.now(),
                updatedAt: Date.now()
              };
              handleSaveLink(newLink);
            }}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  required 
                  defaultValue={editingLink?.name || ''}
                />
              </div>
              <div className="form-group">
                <label htmlFor="url">URL</label>
                <input 
                  type="text" 
                  id="url" 
                  name="url" 
                  required 
                  defaultValue={editingLink?.url || ''}
                  placeholder="Enter URL (e.g., https://example.com)"
                />
              </div>
              <div className="form-group">
                <label>Image</label>
                <div 
                  ref={imageContainerRef}
                  className="image-paste-container"
                  onClick={handleImageClick}
                >
                  {pastedImage ? (
                    <div className="pasted-image-wrapper">
                      <img src={pastedImage} alt="Pasted preview" />
                      <button 
                        type="button"
                        className="remove-image-button"
                        onClick={handleRemoveImage}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="image-placeholder">
                      <div className="image-icon">🖼️</div>
                      <p>Click here and paste an image (Ctrl+V)</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea 
                  id="description" 
                  name="description" 
                  rows={3} 
                  defaultValue={editingLink?.description || ''}
                ></textarea>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="cancel-button" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="save-button"
                  disabled={isLoading}
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2>Dashboard Settings</h2>
              <button 
                className="close-button" 
                onClick={() => setIsSettingsOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              // Get form values safely
              const title = formData.get('title');
              const subtitle = formData.get('subtitle');
              const primaryColor = formData.get('primaryColor');
              const backgroundColor = formData.get('backgroundColor');
              
              const newSettings: DashboardSettings = {
                title: typeof title === 'string' ? title : defaultSettings.title,
                subtitle: typeof subtitle === 'string' ? subtitle : defaultSettings.subtitle,
                primaryColor: typeof primaryColor === 'string' ? primaryColor : defaultSettings.primaryColor,
                backgroundColor: typeof backgroundColor === 'string' ? backgroundColor : defaultSettings.backgroundColor
              };
              
              console.log('Form submitted with settings:', newSettings);
              handleSaveSettings(newSettings);
            }}>
              <div className="form-group">
                <label htmlFor="title">Dashboard Title</label>
                <input 
                  type="text" 
                  id="title" 
                  name="title" 
                  defaultValue={settings.title}
                  placeholder="Enter dashboard title"
                />
              </div>
              <div className="form-group">
                <label htmlFor="subtitle">Dashboard Subtitle</label>
                <input 
                  type="text" 
                  id="subtitle" 
                  name="subtitle" 
                  defaultValue={settings.subtitle}
                  placeholder="Enter dashboard subtitle"
                />
              </div>
              <div className="form-group">
                <label htmlFor="primaryColor">Primary Color</label>
                <div className="color-input-wrapper">
                  <input 
                    type="color" 
                    id="primaryColor" 
                    name="primaryColor" 
                    defaultValue={settings.primaryColor}
                  />
                  <input 
                    type="text" 
                    id="primaryColorText" 
                    name="primaryColor" 
                    defaultValue={settings.primaryColor}
                    className="color-text-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="backgroundColor">Background Color</label>
                <div className="color-input-wrapper">
                  <input 
                    type="color" 
                    id="backgroundColor" 
                    name="backgroundColor" 
                    defaultValue={settings.backgroundColor}
                  />
                  <input 
                    type="text" 
                    id="backgroundColorText" 
                    name="backgroundColor" 
                    defaultValue={settings.backgroundColor}
                    className="color-text-input"
                  />
                </div>
              </div>
              <div className="form-group settings-preview">
                <label>Preview</label>
                <div 
                  className="preview-box" 
                  style={{ 
                    backgroundColor: settings.backgroundColor,
                    border: `1px solid ${settings.primaryColor}`
                  }}
                >
                  <h3 style={{ color: settings.primaryColor }}>{settings.title}</h3>
                  <p>{settings.subtitle}</p>
                  <div className="preview-button" style={{ backgroundColor: settings.primaryColor }}>
                    Button
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setSettings(defaultSettings);
                    setIsSettingsOpen(false);
                  }}
                >
                  Reset to Default
                </button>
                <button 
                  type="submit" 
                  className="save-button"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authentication Settings Modal */}
      {isAuthSettingsOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2>Authentication Settings</h2>
              <button 
                className="close-button" 
                onClick={() => setIsAuthSettingsOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newAuthSettings: AuthSettings = {
                isEnabled: formData.get('isEnabled') === 'true',
                username: formData.get('username') as string,
                password: formData.get('password') as string
              };
              handleSaveAuthSettings(newAuthSettings);
            }}>
              <div className="form-group">
                <label htmlFor="isEnabled">Authentication Status</label>
                <div className="toggle-wrapper">
                  <select 
                    id="isEnabled" 
                    name="isEnabled" 
                    defaultValue={authSettings.isEnabled.toString()}
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                  <div className="auth-status-indicator">
                    <span 
                      className={`status-dot ${authSettings.isEnabled ? 'enabled' : 'disabled'}`}>
                    </span>
                    <span>{authSettings.isEnabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input 
                  type="text" 
                  id="username" 
                  name="username" 
                  defaultValue={authSettings.username}
                  placeholder="Enter username"
                />
                <small className="form-hint">
                  Required if authentication is enabled
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  defaultValue={authSettings.password}
                  placeholder="Enter password"
                />
                <small className="form-hint">
                  Required if authentication is enabled
                </small>
              </div>
              <div className="form-group auth-info">
                <div className="auth-info-content">
                  <p>
                    <strong>Note:</strong> When authentication is enabled, you'll need to log in with these credentials to access the dashboard. If disabled, anyone can access the dashboard without logging in.
                  </p>
                  <p>
                    For security, make sure to use a strong password if enabling authentication.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setIsAuthSettingsOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="save-button"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  Save Authentication Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}; 