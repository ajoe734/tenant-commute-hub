import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface CostCenter {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const CostCenterManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    fetchCostCenters();
  }, [profile]);

  const fetchCostCenters = async () => {
    if (!profile?.tenant_id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("cost_centers")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching cost centers:", error);
      toast({
        title: "載入失敗",
        description: "無法載入成本中心資料",
        variant: "destructive",
      });
    } else {
      setCostCenters(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    const payload = {
      ...formData,
      tenant_id: profile.tenant_id,
    };

    if (editingId) {
      const { error } = await supabase
        .from("cost_centers")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast({
          title: "更新失敗",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "成本中心已更新" });
        fetchCostCenters();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("cost_centers")
        .insert([payload]);

      if (error) {
        toast({
          title: "新增失敗",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "成本中心已建立" });
        fetchCostCenters();
        resetForm();
      }
    }
  };

  const handleEdit = (costCenter: CostCenter) => {
    setEditingId(costCenter.id);
    setFormData({
      code: costCenter.code,
      name: costCenter.name,
      description: costCenter.description || "",
      is_active: costCenter.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此成本中心嗎？")) return;

    const { error } = await supabase
      .from("cost_centers")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "刪除失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "成本中心已刪除" });
      fetchCostCenters();
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      is_active: true,
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">成本中心管理</h2>
          <p className="text-muted-foreground">管理企業費用分配與追蹤</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="bg-gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              新增成本中心
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "編輯成本中心" : "新增成本中心"}</DialogTitle>
              <DialogDescription>填寫成本中心詳細資訊</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">代碼</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="例如：CC-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">名稱</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：業務部門"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">說明</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="此成本中心的用途說明"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">啟用狀態</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  取消
                </Button>
                <Button type="submit">
                  {editingId ? "更新" : "建立"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            成本中心列表
          </CardTitle>
          <CardDescription>共 {costCenters.length} 個成本中心</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : costCenters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              尚無成本中心，點擊「新增成本中心」開始建立
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>代碼</TableHead>
                  <TableHead>名稱</TableHead>
                  <TableHead>說明</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costCenters.map((cc) => (
                  <TableRow key={cc.id}>
                    <TableCell className="font-mono">{cc.code}</TableCell>
                    <TableCell className="font-medium">{cc.name}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {cc.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cc.is_active ? "default" : "secondary"}>
                        {cc.is_active ? "啟用" : "停用"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cc)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CostCenterManagement;
