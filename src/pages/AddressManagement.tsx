import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Plus, Pencil, Trash2, Tag, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import MapPicker from "@/components/MapPicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Address {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  tags: string[] | null;
  visible_to_roles: string[] | null;
  created_at: string;
}

const AddressManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [generatingDemo, setGeneratingDemo] = useState(false);
  
  const [formData, setFormData] = useState<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    tags: string[];
    visible_to_roles: ("admin" | "manager" | "user" | "viewer")[];
  }>({
    name: "",
    address: "",
    latitude: 25.0330,
    longitude: 121.5654,
    tags: [],
    visible_to_roles: ["admin", "manager", "user"],
  });
  
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    fetchAddresses();
  }, [profile]);

  const fetchAddresses = async () => {
    if (!profile?.tenant_id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching addresses:", error);
      toast({
        title: "載入失敗",
        description: "無法載入地址資料",
        variant: "destructive",
      });
    } else {
      setAddresses(data || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        name: address.name,
        address: address.address,
        latitude: address.latitude,
        longitude: address.longitude,
        tags: address.tags || [],
        visible_to_roles: (address.visible_to_roles || ["admin", "manager", "user"]) as ("admin" | "manager" | "user" | "viewer")[],
      });
    } else {
      setEditingAddress(null);
      setFormData({
        name: "",
        address: "",
        latitude: 25.0330,
        longitude: 121.5654,
        tags: [],
        visible_to_roles: ["admin", "manager", "user"],
      });
    }
    setDialogOpen(true);
  };

  const handleSaveAddress = async () => {
    if (!profile?.tenant_id || !formData.name || !formData.address) {
      toast({
        title: "驗證失敗",
        description: "請填寫所有必填欄位",
        variant: "destructive",
      });
      return;
    }

    const addressData = {
      tenant_id: profile.tenant_id,
      name: formData.name,
      address: formData.address,
      latitude: formData.latitude,
      longitude: formData.longitude,
      tags: formData.tags.length > 0 ? formData.tags : null,
      visible_to_roles: formData.visible_to_roles,
      created_by: profile.id,
    };

    if (editingAddress) {
      const { error } = await supabase
        .from("addresses")
        .update(addressData)
        .eq("id", editingAddress.id);

      if (error) {
        toast({
          title: "更新失敗",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "地址已更新" });
        setDialogOpen(false);
        fetchAddresses();
      }
    } else {
      const { error } = await supabase
        .from("addresses")
        .insert([addressData]);

      if (error) {
        toast({
          title: "新增失敗",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "地址已新增" });
        setDialogOpen(false);
        fetchAddresses();
      }
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("確定要刪除此地址嗎？")) return;

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "刪除失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "地址已刪除" });
      fetchAddresses();
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setFormData({ 
      ...formData, 
      latitude: lat, 
      longitude: lng,
      address: address 
    });
  };

  const handleGenerateDemoData = async () => {
    setGeneratingDemo(true);
    try {
      const { error } = await supabase.functions.invoke('seed-demo-data');

      if (error) throw error;

      toast({
        title: '成功',
        description: 'Demo 資料已建立',
      });

      fetchAddresses();
    } catch (error: any) {
      console.error('Error generating demo data:', error);
      toast({
        title: '錯誤',
        description: error.message || '建立 Demo 資料失敗',
        variant: 'destructive',
      });
    } finally {
      setGeneratingDemo(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">地址簿管理</h2>
          <p className="text-muted-foreground">管理常用地址，快速建立預約</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-gradient-primary">
          <Plus className="h-4 w-4 mr-2" />
          新增地址
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            地址列表
          </CardTitle>
          <CardDescription>已儲存的常用地址</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                尚無地址記錄
              </p>
              <Button 
                variant="outline" 
                onClick={handleGenerateDemoData}
                disabled={generatingDemo}
              >
                <Database className="mr-2 h-4 w-4" />
                {generatingDemo ? '產生中...' : '產生 Demo 資料'}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名稱</TableHead>
                  <TableHead>地址</TableHead>
                  <TableHead>標籤</TableHead>
                  <TableHead>可見權限</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addresses.map((address) => (
                  <TableRow key={address.id}>
                    <TableCell className="font-medium">{address.name}</TableCell>
                    <TableCell className="text-muted-foreground">{address.address}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {address.tags?.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {address.visible_to_roles?.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(address)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAddress(address.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? "編輯地址" : "新增地址"}
            </DialogTitle>
            <DialogDescription>
              使用地圖選擇位置或手動輸入地址資訊
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">地址名稱 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：公司總部、台北車站"
              />
            </div>

            <div>
              <Label>地圖選點</Label>
              <MapPicker
                onLocationSelect={handleLocationSelect}
                initialLat={formData.latitude}
                initialLng={formData.longitude}
              />
            </div>

            <div>
              <Label htmlFor="address">地址 *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="完整地址"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">緯度</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="longitude">經度</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>標籤</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="新增標籤"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button type="button" onClick={handleAddTag} size="sm">
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="visibility">可見權限</Label>
              <Select
                value={formData.visible_to_roles.join(',')}
                onValueChange={(value) => setFormData({ ...formData, visible_to_roles: value.split(',') as ("admin" | "manager" | "user" | "viewer")[] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">僅管理員</SelectItem>
                  <SelectItem value="admin,manager">管理員與經理</SelectItem>
                  <SelectItem value="admin,manager,user">所有使用者</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveAddress} className="bg-gradient-primary">
              {editingAddress ? "更新" : "新增"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddressManagement;