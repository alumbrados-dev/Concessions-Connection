import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  MapPin, 
  Menu, 
  Calendar, 
  Palette, 
  Clock, 
  Truck,
  Loader2,
  Navigation,
  AlertTriangle
} from "lucide-react";

// GPS Locator Tab Implementation
function GPSLocatorTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({
    latitude: "",
    longitude: "",
    address: "",
    radius: "5.00"
  });

  // Fetch current truck location
  const { data: truckLocation, isLoading, error } = useQuery({
    queryKey: ['/api/admin/location'],
    queryFn: () => apiRequest('/api/admin/location'),
    select: (data) => data || null
  }) as { data: any, isLoading: boolean, error: any };

  // Update truck location mutation
  const updateLocationMutation = useMutation({
    mutationFn: (locationData: any) => {
      const token = localStorage.getItem('auth_token');
      return fetch('/api/admin/location', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(locationData)
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update location');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/location'] });
      toast({
        title: "Location Updated",
        description: "Truck location has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update truck location. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Get current GPS location using browser geolocation
  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationForm(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6)
        }));
        setIsGettingLocation(false);
        toast({
          title: "Location Retrieved",
          description: "Current GPS coordinates have been loaded.",
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: "Error",
          description: "Unable to retrieve your current location. Please enter coordinates manually.",
          variant: "destructive",
        });
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Handle GPS toggle
  const handleGPSToggle = (enabled: boolean) => {
    const locationData = {
      ...truckLocation,
      gpsEnabled: enabled,
      latitude: enabled ? (locationForm.latitude ? parseFloat(locationForm.latitude) : null) : null,
      longitude: enabled ? (locationForm.longitude ? parseFloat(locationForm.longitude) : null) : null,
      address: locationForm.address || null,
      radius: locationForm.radius || "5.00"
    };
    updateLocationMutation.mutate(locationData);
  };

  // Handle location save
  const handleSaveLocation = () => {
    if (!locationForm.latitude || !locationForm.longitude) {
      toast({
        title: "Error",
        description: "Please provide both latitude and longitude coordinates.",
        variant: "destructive",
      });
      return;
    }

    const locationData = {
      gpsEnabled: truckLocation?.gpsEnabled ?? true,
      latitude: parseFloat(locationForm.latitude),
      longitude: parseFloat(locationForm.longitude),
      address: locationForm.address || null,
      radius: locationForm.radius || "5.00"
    };
    updateLocationMutation.mutate(locationData);
  };

  // Initialize form when data loads
  useEffect(() => {
    if (truckLocation) {
      setLocationForm({
        latitude: truckLocation.latitude?.toString() || "",
        longitude: truckLocation.longitude?.toString() || "",
        address: truckLocation.address || "",
        radius: truckLocation.radius?.toString() || "5.00"
      });
    }
  }, [truckLocation]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading location settings...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">GPS Locator</h2>
          <p className="text-muted-foreground">Manage truck location and GPS tracking settings</p>
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="gps-toggle" className="text-sm font-medium">
            GPS Tracking
          </Label>
          <Switch
            id="gps-toggle"
            checked={truckLocation?.gpsEnabled ?? false}
            onCheckedChange={handleGPSToggle}
            disabled={updateLocationMutation.isPending}
            data-testid="switch-gps-enabled"
          />
        </div>
      </div>

      <Separator />

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Current Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">GPS Status</Label>
              <div className="flex items-center space-x-2 mt-1">
                {truckLocation?.gpsEnabled ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium text-green-600">Enabled</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-sm font-medium text-red-600">Disabled</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Service Radius</Label>
              <p className="text-sm font-medium mt-1">{truckLocation?.radius || "5.00"} km</p>
            </div>
          </div>
          
          {truckLocation?.latitude && truckLocation?.longitude && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Coordinates</Label>
              <p className="text-sm font-mono mt-1">
                {truckLocation.latitude.toFixed(6)}, {truckLocation.longitude.toFixed(6)}
              </p>
            </div>
          )}
          
          {truckLocation?.address && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Address</Label>
              <p className="text-sm mt-1">{truckLocation.address}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Navigation className="w-5 h-5" />
            <span>Update Location</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button
              onClick={getCurrentLocation}
              disabled={isGettingLocation || updateLocationMutation.isPending}
              variant="outline"
              className="flex items-center space-x-2"
              data-testid="button-get-current-location"
            >
              {isGettingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              <span>{isGettingLocation ? "Getting Location..." : "Get Current Location"}</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                placeholder="40.712776"
                value={locationForm.latitude}
                onChange={(e) => setLocationForm(prev => ({ ...prev, latitude: e.target.value }))}
                data-testid="input-latitude"
              />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                placeholder="-74.005974"
                value={locationForm.longitude}
                onChange={(e) => setLocationForm(prev => ({ ...prev, longitude: e.target.value }))}
                data-testid="input-longitude"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address (Optional)</Label>
            <Input
              id="address"
              placeholder="123 Main St, City, State 12345"
              value={locationForm.address}
              onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
              data-testid="input-address"
            />
          </div>

          <div>
            <Label htmlFor="radius">Service Radius (km)</Label>
            <Input
              id="radius"
              type="number"
              step="0.1"
              min="0.1"
              max="50"
              placeholder="5.00"
              value={locationForm.radius}
              onChange={(e) => setLocationForm(prev => ({ ...prev, radius: e.target.value }))}
              data-testid="input-radius"
            />
          </div>

          <Button
            onClick={handleSaveLocation}
            disabled={updateLocationMutation.isPending}
            className="w-full"
            data-testid="button-save-location"
          >
            {updateLocationMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving Location...
              </>
            ) : (
              "Save Location"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Map Preview Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Location Preview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg h-64 flex items-center justify-center border border-dashed border-muted-foreground/30">
            <div className="text-center space-y-2">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Interactive map integration will be added here
              </p>
              {truckLocation?.latitude && truckLocation?.longitude && (
                <p className="text-xs text-muted-foreground font-mono">
                  {truckLocation.latitude.toFixed(6)}, {truckLocation.longitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MenuManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
    imageUrl: "",
    available: true
  });

  // Fetch all menu items
  const { data: menuItems = [], isLoading, error } = useQuery({
    queryKey: ['/api/items'],
    queryFn: () => apiRequest('/api/items')
  }) as { data: any[], isLoading: boolean, error: any };

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: (itemData: any) => {
      const token = localStorage.getItem('auth_token');
      return fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(itemData)
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create item');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: "Item Created",
        description: "Menu item has been created successfully.",
      });
      resetForm();
      setIsCreateModalOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create menu item. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => {
      const token = localStorage.getItem('auth_token');
      return fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data)
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update item');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: "Item Updated",
        description: "Menu item has been updated successfully.",
      });
      resetForm();
      setEditingItem(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update menu item. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => {
      const token = localStorage.getItem('auth_token');
      return fetch(`/api/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      }).then(res => {
        if (!res.ok) throw new Error('Failed to delete item');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: "Item Deleted",
        description: "Menu item has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete menu item. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: ({ id, stock }: { id: string, stock: number }) => {
      const token = localStorage.getItem('auth_token');
      return fetch(`/api/items/${id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ stock })
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update stock');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: "Stock Updated",
        description: "Item stock has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update stock. Please try again.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setItemForm({
      name: "",
      description: "",
      price: "",
      category: "",
      stock: "",
      imageUrl: "",
      available: true
    });
  };

  const handleCreateItem = () => {
    if (!itemForm.name || !itemForm.price) {
      toast({
        title: "Error",
        description: "Please provide item name and price.",
        variant: "destructive",
      });
      return;
    }

    const itemData = {
      name: itemForm.name,
      description: itemForm.description || null,
      price: parseFloat(itemForm.price),
      category: itemForm.category || null,
      stock: parseInt(itemForm.stock) || 0,
      imageUrl: itemForm.imageUrl || null,
      available: itemForm.available
    };

    createItemMutation.mutate(itemData);
  };

  const handleUpdateItem = () => {
    if (!editingItem || !itemForm.name || !itemForm.price) {
      toast({
        title: "Error",
        description: "Please provide item name and price.",
        variant: "destructive",
      });
      return;
    }

    const itemData = {
      name: itemForm.name,
      description: itemForm.description || null,
      price: parseFloat(itemForm.price),
      category: itemForm.category || null,
      stock: parseInt(itemForm.stock) || 0,
      imageUrl: itemForm.imageUrl || null,
      available: itemForm.available
    };

    updateItemMutation.mutate({ id: editingItem.id, data: itemData });
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      category: item.category || "",
      stock: item.stock.toString(),
      imageUrl: item.imageUrl || "",
      available: item.available
    });
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteItemMutation.mutate(id);
    }
  };

  const handleStockUpdate = (id: string, newStock: number) => {
    updateStockMutation.mutate({ id, stock: newStock });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading menu items...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="text-destructive font-medium">Failed to load menu items</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your connection and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Menu Management</h2>
          <p className="text-muted-foreground">Manage your food truck menu items and inventory</p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          data-testid="button-create-item"
        >
          <Menu className="w-4 h-4 mr-2" />
          Add Menu Item
        </Button>
      </div>

      <Separator />

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{(menuItems || []).length}</div>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{(menuItems || []).filter((item: any) => item.available).length}</div>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{(menuItems || []).filter((item: any) => item.stock === 0).length}</div>
            <p className="text-xs text-muted-foreground">Out of Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{(menuItems || []).filter((item: any) => item.stock < 5).length}</div>
            <p className="text-xs text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          {(menuItems || []).length === 0 ? (
            <div className="text-center py-8">
              <Menu className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No menu items found. Add your first item to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(menuItems || []).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm font-medium">${item.price}</span>
                          {item.category && (
                            <span className="text-xs bg-secondary px-2 py-1 rounded">{item.category}</span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded ${item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item.available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">Stock: {item.stock}</div>
                        <div className="flex items-center space-x-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStockUpdate(item.id, Math.max(0, item.stock - 1))}
                            disabled={updateStockMutation.isPending}
                            data-testid={`button-decrease-stock-${item.id}`}
                          >
                            -
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStockUpdate(item.id, item.stock + 1)}
                            disabled={updateStockMutation.isPending}
                            data-testid={`button-increase-stock-${item.id}`}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditItem(item)}
                      data-testid={`button-edit-item-${item.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={deleteItemMutation.isPending}
                      data-testid={`button-delete-item-${item.id}`}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingItem) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle>{editingItem ? 'Edit Menu Item' : 'Create Menu Item'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="item-name">Name *</Label>
                <Input
                  id="item-name"
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Item name"
                  data-testid="input-item-name"
                />
              </div>
              
              <div>
                <Label htmlFor="item-description">Description</Label>
                <Input
                  id="item-description"
                  value={itemForm.description}
                  onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Item description"
                  data-testid="input-item-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="item-price">Price *</Label>
                  <Input
                    id="item-price"
                    type="number"
                    step="0.01"
                    value={itemForm.price}
                    onChange={(e) => setItemForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    data-testid="input-item-price"
                  />
                </div>
                <div>
                  <Label htmlFor="item-stock">Stock</Label>
                  <Input
                    id="item-stock"
                    type="number"
                    value={itemForm.stock}
                    onChange={(e) => setItemForm(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="0"
                    data-testid="input-item-stock"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="item-category">Category</Label>
                <Input
                  id="item-category"
                  value={itemForm.category}
                  onChange={(e) => setItemForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Main, Sides, Drinks"
                  data-testid="input-item-category"
                />
              </div>

              <div>
                <Label htmlFor="item-image">Image URL</Label>
                <Input
                  id="item-image"
                  value={itemForm.imageUrl}
                  onChange={(e) => setItemForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  data-testid="input-item-image"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="item-available"
                  checked={itemForm.available}
                  onCheckedChange={(checked) => setItemForm(prev => ({ ...prev, available: checked }))}
                  data-testid="switch-item-available"
                />
                <Label htmlFor="item-available">Available for sale</Label>
              </div>
            </CardContent>
            <div className="flex justify-end space-x-2 p-6 pt-0">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsCreateModalOpen(false);
                  setEditingItem(null);
                }}
                data-testid="button-cancel-item"
              >
                Cancel
              </Button>
              <Button
                onClick={editingItem ? handleUpdateItem : handleCreateItem}
                disabled={createItemMutation.isPending || updateItemMutation.isPending}
                data-testid="button-save-item"
              >
                {(createItemMutation.isPending || updateItemMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingItem ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingItem ? 'Update Item' : 'Create Item'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function EventsAdsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<'events' | 'ads'>('events');
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isCreateAdModalOpen, setIsCreateAdModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [eventForm, setEventForm] = useState({
    name: "",
    description: "",
    date: "",
    location: "",
    url: ""
  });
  const [adForm, setAdForm] = useState({
    title: "",
    content: "",
    imageUrl: "",
    url: "",
    type: ""
  });

  // Fetch events
  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ['/api/admin/events'],
    queryFn: () => apiRequest('/api/admin/events')
  }) as { data: any[], isLoading: boolean, error: any };

  // Fetch ads
  const { data: ads = [], isLoading: adsLoading, error: adsError } = useQuery({
    queryKey: ['/api/admin/ads'],
    queryFn: () => apiRequest('/api/admin/ads')
  }) as { data: any[], isLoading: boolean, error: any };

  // Event mutations
  const createEventMutation = useMutation({
    mutationFn: (eventData: any) => apiRequest('/api/admin/events', {
      method: 'POST',
      body: JSON.stringify(eventData)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Event Created",
        description: "Event has been created successfully.",
      });
      resetEventForm();
      setIsCreateEventModalOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      apiRequest(`/api/admin/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Event Updated",
        description: "Event has been updated successfully.",
      });
      resetEventForm();
      setEditingEvent(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/events/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Event Deleted",
        description: "Event has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Ad mutations
  const createAdMutation = useMutation({
    mutationFn: (adData: any) => apiRequest('/api/admin/ads', {
      method: 'POST',
      body: JSON.stringify(adData)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ads'] });
      toast({
        title: "Ad Created",
        description: "Advertisement has been created successfully.",
      });
      resetAdForm();
      setIsCreateAdModalOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create ad. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateAdMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      apiRequest(`/api/admin/ads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ads'] });
      toast({
        title: "Ad Updated",
        description: "Advertisement has been updated successfully.",
      });
      resetAdForm();
      setEditingAd(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update ad. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteAdMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/ads/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ads'] });
      toast({
        title: "Ad Deleted",
        description: "Advertisement has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete ad. Please try again.",
        variant: "destructive",
      });
    }
  });

  const resetEventForm = () => {
    setEventForm({
      name: "",
      description: "",
      date: "",
      location: "",
      url: ""
    });
  };

  const resetAdForm = () => {
    setAdForm({
      title: "",
      content: "",
      imageUrl: "",
      url: "",
      type: ""
    });
  };

  const handleCreateEvent = () => {
    if (!eventForm.name || !eventForm.date) {
      toast({
        title: "Error",
        description: "Please provide event name and date.",
        variant: "destructive",
      });
      return;
    }

    const eventData = {
      name: eventForm.name,
      description: eventForm.description || null,
      date: eventForm.date,
      location: eventForm.location || null,
      url: eventForm.url || null
    };

    createEventMutation.mutate(eventData);
  };

  const handleUpdateEvent = () => {
    if (!editingEvent || !eventForm.name || !eventForm.date) {
      toast({
        title: "Error",
        description: "Please provide event name and date.",
        variant: "destructive",
      });
      return;
    }

    const eventData = {
      name: eventForm.name,
      description: eventForm.description || null,
      date: eventForm.date,
      location: eventForm.location || null,
      url: eventForm.url || null
    };

    updateEventMutation.mutate({ id: editingEvent.id, data: eventData });
  };

  const handleCreateAd = () => {
    if (!adForm.title || !adForm.content) {
      toast({
        title: "Error",
        description: "Please provide ad title and content.",
        variant: "destructive",
      });
      return;
    }

    const adData = {
      title: adForm.title,
      content: adForm.content,
      imageUrl: adForm.imageUrl || null,
      url: adForm.url || null,
      type: adForm.type || null
    };

    createAdMutation.mutate(adData);
  };

  const handleUpdateAd = () => {
    if (!editingAd || !adForm.title || !adForm.content) {
      toast({
        title: "Error",
        description: "Please provide ad title and content.",
        variant: "destructive",
      });
      return;
    }

    const adData = {
      title: adForm.title,
      content: adForm.content,
      imageUrl: adForm.imageUrl || null,
      url: adForm.url || null,
      type: adForm.type || null
    };

    updateAdMutation.mutate({ id: editingAd.id, data: adData });
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name,
      description: event.description || "",
      date: event.date,
      location: event.location || "",
      url: event.url || ""
    });
  };

  const handleEditAd = (ad: any) => {
    setEditingAd(ad);
    setAdForm({
      title: ad.title,
      content: ad.content,
      imageUrl: ad.imageUrl || "",
      url: ad.url || "",
      type: ad.type || ""
    });
  };

  const handleDeleteEvent = (id: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteEventMutation.mutate(id);
    }
  };

  const handleDeleteAd = (id: string) => {
    if (window.confirm('Are you sure you want to delete this ad?')) {
      deleteAdMutation.mutate(id);
    }
  };

  const isLoading = activeSection === 'events' ? eventsLoading : adsLoading;
  const hasError = activeSection === 'events' ? eventsError : adsError;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading {activeSection}...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="text-destructive font-medium">Failed to load {activeSection}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your connection and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Events & Ads Management</h2>
          <p className="text-muted-foreground">Manage local events and promotional advertisements</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={activeSection === 'events' ? 'default' : 'outline'}
            onClick={() => setActiveSection('events')}
            data-testid="button-switch-events"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Events
          </Button>
          <Button
            variant={activeSection === 'ads' ? 'default' : 'outline'}
            onClick={() => setActiveSection('ads')}
            data-testid="button-switch-ads"
          >
            <Megaphone className="w-4 h-4 mr-2" />
            Ads
          </Button>
        </div>
      </div>

      <Separator />

      {/* Events Section */}
      {activeSection === 'events' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Local Events</h3>
              <p className="text-sm text-muted-foreground">Upcoming local events and community activities</p>
            </div>
            <Button
              onClick={() => setIsCreateEventModalOpen(true)}
              data-testid="button-create-event"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>

          {/* Events Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{(events || []).length}</div>
                <p className="text-xs text-muted-foreground">Total Events</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {(events || []).filter((event: any) => new Date(event.date) >= new Date()).length}
                </div>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {(events || []).filter((event: any) => new Date(event.date) < new Date()).length}
                </div>
                <p className="text-xs text-muted-foreground">Past Events</p>
              </CardContent>
            </Card>
          </div>

          {/* Events List */}
          <Card>
            <CardHeader>
              <CardTitle>Events</CardTitle>
            </CardHeader>
            <CardContent>
              {(events || []).length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No events found. Add your first event to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(events || []).map((event: any) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <h3 className="font-semibold">{event.name}</h3>
                            {event.description && (
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-sm font-medium">
                                {new Date(event.date).toLocaleDateString()}
                              </span>
                              {event.location && (
                                <span className="text-xs bg-secondary px-2 py-1 rounded">{event.location}</span>
                              )}
                              <span className={`text-xs px-2 py-1 rounded ${new Date(event.date) >= new Date() ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                {new Date(event.date) >= new Date() ? 'Upcoming' : 'Past'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditEvent(event)}
                          data-testid={`button-edit-event-${event.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteEvent(event.id)}
                          disabled={deleteEventMutation.isPending}
                          data-testid={`button-delete-event-${event.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ads Section */}
      {activeSection === 'ads' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Promotional Ads</h3>
              <p className="text-sm text-muted-foreground">Promotional advertisements and marketing content</p>
            </div>
            <Button
              onClick={() => setIsCreateAdModalOpen(true)}
              data-testid="button-create-ad"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Advertisement
            </Button>
          </div>

          {/* Ads Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{(ads || []).length}</div>
                <p className="text-xs text-muted-foreground">Total Ads</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {(ads || []).filter((ad: any) => ad.imageUrl).length}
                </div>
                <p className="text-xs text-muted-foreground">With Images</p>
              </CardContent>
            </Card>
          </div>

          {/* Ads List */}
          <Card>
            <CardHeader>
              <CardTitle>Advertisements</CardTitle>
            </CardHeader>
            <CardContent>
              {(ads || []).length === 0 ? (
                <div className="text-center py-8">
                  <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No ads found. Add your first advertisement to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(ads || []).map((ad: any) => (
                    <div key={ad.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <h3 className="font-semibold">{ad.title}</h3>
                            <p className="text-sm text-muted-foreground">{ad.content}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              {ad.type && (
                                <span className="text-xs bg-secondary px-2 py-1 rounded">{ad.type}</span>
                              )}
                              {ad.imageUrl && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Has Image</span>
                              )}
                              {ad.url && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Has Link</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAd(ad)}
                          data-testid={`button-edit-ad-${ad.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteAd(ad.id)}
                          disabled={deleteAdMutation.isPending}
                          data-testid={`button-delete-ad-${ad.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Event Modal */}
      {(isCreateEventModalOpen || editingEvent) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="event-name">Event Name *</Label>
                <Input
                  id="event-name"
                  value={eventForm.name}
                  onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Event name"
                  data-testid="input-event-name"
                />
              </div>
              
              <div>
                <Label htmlFor="event-description">Description</Label>
                <Input
                  id="event-description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Event description"
                  data-testid="input-event-description"
                />
              </div>

              <div>
                <Label htmlFor="event-date">Date *</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                  data-testid="input-event-date"
                />
              </div>

              <div>
                <Label htmlFor="event-location">Location</Label>
                <Input
                  id="event-location"
                  value={eventForm.location}
                  onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Event location"
                  data-testid="input-event-location"
                />
              </div>

              <div>
                <Label htmlFor="event-url">Event URL</Label>
                <Input
                  id="event-url"
                  value={eventForm.url}
                  onChange={(e) => setEventForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com/event"
                  data-testid="input-event-url"
                />
              </div>
            </CardContent>
            <div className="flex justify-end space-x-2 p-6 pt-0">
              <Button
                variant="outline"
                onClick={() => {
                  resetEventForm();
                  setIsCreateEventModalOpen(false);
                  setEditingEvent(null);
                }}
                data-testid="button-cancel-event"
              >
                Cancel
              </Button>
              <Button
                onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
                data-testid="button-save-event"
              >
                {(createEventMutation.isPending || updateEventMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingEvent ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingEvent ? 'Update Event' : 'Create Event'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Create/Edit Ad Modal */}
      {(isCreateAdModalOpen || editingAd) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle>{editingAd ? 'Edit Advertisement' : 'Create Advertisement'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ad-title">Title *</Label>
                <Input
                  id="ad-title"
                  value={adForm.title}
                  onChange={(e) => setAdForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ad title"
                  data-testid="input-ad-title"
                />
              </div>
              
              <div>
                <Label htmlFor="ad-content">Content *</Label>
                <Input
                  id="ad-content"
                  value={adForm.content}
                  onChange={(e) => setAdForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Ad content"
                  data-testid="input-ad-content"
                />
              </div>

              <div>
                <Label htmlFor="ad-type">Type</Label>
                <Input
                  id="ad-type"
                  value={adForm.type}
                  onChange={(e) => setAdForm(prev => ({ ...prev, type: e.target.value }))}
                  placeholder="e.g., Special Offer, Announcement"
                  data-testid="input-ad-type"
                />
              </div>

              <div>
                <Label htmlFor="ad-image">Image URL</Label>
                <Input
                  id="ad-image"
                  value={adForm.imageUrl}
                  onChange={(e) => setAdForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  data-testid="input-ad-image"
                />
              </div>

              <div>
                <Label htmlFor="ad-url">Link URL</Label>
                <Input
                  id="ad-url"
                  value={adForm.url}
                  onChange={(e) => setAdForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com/offer"
                  data-testid="input-ad-url"
                />
              </div>
            </CardContent>
            <div className="flex justify-end space-x-2 p-6 pt-0">
              <Button
                variant="outline"
                onClick={() => {
                  resetAdForm();
                  setIsCreateAdModalOpen(false);
                  setEditingAd(null);
                }}
                data-testid="button-cancel-ad"
              >
                Cancel
              </Button>
              <Button
                onClick={editingAd ? handleUpdateAd : handleCreateAd}
                disabled={createAdMutation.isPending || updateAdMutation.isPending}
                data-testid="button-save-ad"
              >
                {(createAdMutation.isPending || updateAdMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingAd ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingAd ? 'Update Ad' : 'Create Ad'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ThemeEditorTab() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Theme Editor</h2>
      <p className="text-muted-foreground">Color themes and visual customization will be implemented here.</p>
    </div>
  );
}

function HoursLocationTab() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Hours & Location</h2>
      <p className="text-muted-foreground">Operating hours and location settings will be implemented here.</p>
    </div>
  );
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState("gps");

  // Mobile warning for smaller screens
  const MobileWarning = () => (
    <div className="lg:hidden min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <Truck className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Admin Panel</h2>
          <p className="text-muted-foreground mb-4">
            The admin panel is designed for desktop use. Please access this page on a larger screen for the full experience.
          </p>
          <Button asChild className="w-full">
            <Link href="/" data-testid="link-return-home-mobile">Return to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <MobileWarning />
      <div 
        className="hidden lg:block min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800"
        data-testid="admin-desktop-container"
      >
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Truck className="w-8 h-8 text-orange-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Concessions Connection
                  </h1>
                  <p className="text-sm text-muted-foreground">Admin Dashboard</p>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="/" data-testid="link-return-home">Return to Site</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Manila Folder Tabs Interface */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Manila Folder-Style Tab List */}
            <div className="relative mb-6">
              <TabsList className="manila-tabs bg-transparent h-auto p-0 space-x-2">
                <TabsTrigger 
                  value="gps" 
                  className="manila-tab"
                  data-testid="tab-gps"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  GPS Locator
                </TabsTrigger>
                <TabsTrigger 
                  value="menu" 
                  className="manila-tab"
                  data-testid="tab-menu"
                >
                  <Menu className="w-4 h-4 mr-2" />
                  Menu Management
                </TabsTrigger>
                <TabsTrigger 
                  value="events" 
                  className="manila-tab"
                  data-testid="tab-events"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Events & Ads
                </TabsTrigger>
                <TabsTrigger 
                  value="theme" 
                  className="manila-tab"
                  data-testid="tab-theme"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Theme Editor
                </TabsTrigger>
                <TabsTrigger 
                  value="hours" 
                  className="manila-tab"
                  data-testid="tab-hours"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Hours & Location
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content Area */}
            <Card className="manila-content bg-amber-50 dark:bg-gray-800 border-2 border-amber-200 dark:border-gray-700">
              <TabsContent value="gps" className="m-0">
                <GPSLocatorTab />
              </TabsContent>
              <TabsContent value="menu" className="m-0">
                <MenuManagementTab />
              </TabsContent>
              <TabsContent value="events" className="m-0">
                <EventsAdsTab />
              </TabsContent>
              <TabsContent value="theme" className="m-0">
                <ThemeEditorTab />
              </TabsContent>
              <TabsContent value="hours" className="m-0">
                <HoursLocationTab />
              </TabsContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </>
  );
}